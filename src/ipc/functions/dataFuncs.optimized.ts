import fs from 'fs/promises';
import fsStat from 'fs';
import path from 'path';
import { DirectoryContents, FileSystemItem, FolderMetadata } from 'shared/ipc-channels';

// Performance-optimized cache for file system operations
const fsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds
const MAX_CACHE_SIZE = 100;

export function getCachedResult<T>(key: string): T | null {
    const cached = fsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

export function setCachedResult<T>(key: string, data: T): void {
    if (fsCache.size >= MAX_CACHE_SIZE) {
        const firstKey = fsCache.keys().next().value;
        if (firstKey) fsCache.delete(firstKey);
    }
    fsCache.set(key, { data, timestamp: Date.now() });
}

// Enhanced metadata function with error handling
async function getMetadata(filePath: string): Promise<fsStat.Stats | null> {
    try {
        return await fs.stat(filePath);
    } catch {
        return null; // Silent failure for performance
    }
}

// Check if file/directory exists
async function dataExists(dataPath: string): Promise<boolean> {
    try {
        await fs.access(dataPath, fsStat.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

// Fast directory listing with optimized sorting and filtering
export async function listDirectoryContents(dirPath: string, options: {
    includeHidden?: boolean;
    sortBy?: 'name' | 'size' | 'modified';
    sortDirection?: 'asc' | 'desc';
    maxItems?: number;
} = {}): Promise<DirectoryContents> {
    const { includeHidden = false, sortBy = 'name', sortDirection = 'asc', maxItems = 1000 } = options;

    try {
        if (!await dataExists(dirPath)) {
            return { items: [], totalItems: 0, path: dirPath, error: 'Directory not found' };
        }

        const fileNames = await fs.readdir(dirPath);
        const parent = path.dirname(dirPath);
        const isRoot = parent === dirPath;
        
        // Process files in batches for better performance
        const BATCH_SIZE = 50;
        const items: FileSystemItem[] = [];
        
        for (let i = 0; i < fileNames.length && items.length < maxItems; i += BATCH_SIZE) {
            const batch = fileNames.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (fileName) => {
                if (!includeHidden && fileName.startsWith('.')) return null;
                
                const itemPath = path.join(dirPath, fileName);
                const stats = await getMetadata(itemPath);
                
                if (!stats) return null;

                return {
                    name: fileName,
                    path: itemPath,
                    type: stats.isDirectory() ? 'directory' as const : 'file' as const,
                    size: stats.isDirectory() ? 0 : stats.size,
                    modified: stats.mtime,
                    created: stats.birthtime || stats.ctime,
                    extension: stats.isDirectory() ? undefined : path.extname(fileName).slice(1).toLowerCase(),
                    isHidden: fileName.startsWith('.'),
                    isSystem: false,
                    permissions: {
                        read: true,
                        write: true,
                        execute: stats.isDirectory()
                    }
                } as FileSystemItem;
            });

            const batchResults = await Promise.all(batchPromises);
            items.push(...batchResults.filter(Boolean) as FileSystemItem[]);
        }

        // Sort items with Windows-style natural sorting
        items.sort((a, b) => {
            // Directories first
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    });
                    break;
                case 'size':
                    comparison = a.type === 'directory' && b.type === 'directory' 
                        ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
                        : a.size - b.size;
                    break;
                case 'modified':
                    comparison = a.modified.getTime() - b.modified.getTime();
                    break;
            }
            return sortDirection === 'desc' ? -comparison : comparison;
        });

        return {
            items,
            totalItems: fileNames.length,
            path: dirPath,
            parent: isRoot ? undefined : parent
        };

    } catch (error) {
        console.error(`Error listing directory ${dirPath}:`, error);
        return {
            items: [],
            totalItems: 0,
            path: dirPath,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

// Optimized folder metadata analysis with depth limiting
export async function getFolderMetadata(folderPath: string): Promise<FolderMetadata> {
    const defaultMetadata: FolderMetadata = {
        totalSize: 0,
        totalFiles: 0,
        totalFolders: 0,
        fileTypes: {},
        lastModified: new Date(0),
        created: new Date(0)
    };

    try {
        const stats = await getMetadata(folderPath);
        if (!stats?.isDirectory()) return defaultMetadata;

        defaultMetadata.created = stats.birthtime || stats.ctime;
        defaultMetadata.lastModified = stats.mtime;

        // Fast analysis with limited depth to prevent performance issues
        const analyzeDirectory = async (dirPath: string, depth = 0): Promise<{
            size: number;
            files: number;
            folders: number;
            types: Record<string, number>;
            lastModified: Date;
        }> => {
            let totalSize = 0, totalFiles = 0, totalFolders = 0;
            const fileTypes: Record<string, number> = {};
            let lastModified = new Date(0);

            if (depth > 2) return { size: totalSize, files: totalFiles, folders: totalFolders, types: fileTypes, lastModified };

            try {
                const items = await fs.readdir(dirPath);
                
                for (const item of items) {
                    try {
                        const itemPath = path.join(dirPath, item);
                        const itemStats = await getMetadata(itemPath);
                        if (!itemStats) continue;

                        if (itemStats.mtime > lastModified) {
                            lastModified = itemStats.mtime;
                        }

                        if (itemStats.isDirectory()) {
                            totalFolders++;
                            if (depth < 2) {
                                const subResult = await analyzeDirectory(itemPath, depth + 1);
                                totalSize += subResult.size;
                                totalFiles += subResult.files;
                                totalFolders += subResult.folders;
                                
                                // Merge file types efficiently
                                Object.entries(subResult.types).forEach(([ext, count]) => {
                                    fileTypes[ext] = (fileTypes[ext] || 0) + count;
                                });

                                if (subResult.lastModified > lastModified) {
                                    lastModified = subResult.lastModified;
                                }
                            }
                        } else {
                            totalFiles++;
                            totalSize += itemStats.size;
                            const ext = path.extname(item).toLowerCase() || 'no extension';
                            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
                        }
                    } catch {
                        continue; // Skip inaccessible items
                    }
                }
            } catch {
                // Skip inaccessible directories
            }

            return { size: totalSize, files: totalFiles, folders: totalFolders, types: fileTypes, lastModified };
        };

        const result = await analyzeDirectory(folderPath);

        return {
            totalSize: result.size,
            totalFiles: result.files,
            totalFolders: result.folders,
            fileTypes: result.types,
            lastModified: result.lastModified > defaultMetadata.lastModified ? result.lastModified : defaultMetadata.lastModified,
            created: defaultMetadata.created
        };

    } catch (error) {
        console.error(`Error analyzing folder ${folderPath}:`, error);
        return defaultMetadata;
    }
}
