import fs from 'fs/promises';
import fsStat from 'fs';
import path from 'path';
import { DirectoryContents, FileSystemItem, FolderMetadata } from 'shared/ipc-channels';

// Performance-optimized directory listing with batching
export async function getFolderContents(folderPath: string): Promise<string[]> {
    try {
        return await fs.readdir(folderPath);
    } catch (error: any) {
        // Only log unexpected errors, not common permission/access issues
        if (error.code !== 'ENOENT' && error.code !== 'EACCES' && error.code !== 'EPERM') {
            console.error(`Error reading directory ${folderPath}:`, error);
        }
        throw error;
    }
}

// Cache for file system operations (simple LRU-like cache)
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
        if (firstKey) {
            fsCache.delete(firstKey);
        }
    }
    fsCache.set(key, { data, timestamp: Date.now() });
}

// Enhanced metadata function with error handling
export async function getMetadata(filePath: string): Promise<fsStat.Stats | null> {
    try {
        return await fs.stat(filePath);
    } catch (error: any) {
        // Complete silence - no logging for any file access errors
        return null;
    }
}

// Check if file/directory exists
export async function dataExists(dataPath: string): Promise<boolean> {
    try {
        await fs.access(dataPath, fsStat.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

// Check if a file is a Windows shortcut (.lnk file)
export function isWindowsShortcut(fileName: string): boolean {
    return process.platform === 'win32' && fileName.toLowerCase().endsWith('.lnk');
}

// Check if a file is likely a broken symlink or shortcut
export async function isBrokenLink(filePath: string): Promise<boolean> {
    try {
        // Try to access the file - if it fails, it might be a broken link
        await fs.access(filePath, fsStat.constants.F_OK);
        return false;
    } catch (error: any) {
        // If it's a permission error, it's not broken, just inaccessible
        return error.code === 'ENOENT';
    }
}

// Fast directory listing with batch processing for performance
export async function listDirectoryContents(dirPath: string, options: {
    includeHidden?: boolean;
    sortBy?: 'name' | 'size' | 'modified';
    sortDirection?: 'asc' | 'desc';
    maxItems?: number;
} = {}): Promise<DirectoryContents> {
    const {
        includeHidden = false,
        sortBy = 'name',
        sortDirection = 'asc',
        maxItems = 1000
    } = options;

    try {
        // Check if directory exists and is accessible
        const dirExists = await dataExists(dirPath);
        if (!dirExists) {
            return {
                items: [],
                totalItems: 0,
                path: dirPath,
                error: 'Directory does not exist or is not accessible'
            };
        }

        // Get parent directory path
        const parent = path.dirname(dirPath);
        const isRoot = dirPath === parent;

        // Read directory contents
        const fileNames = await getFolderContents(dirPath);
        
        // Process files in batches for better performance
        const batchSize = 50;
        const items: FileSystemItem[] = [];
        
        for (let i = 0; i < fileNames.length && items.length < maxItems; i += batchSize) {
            const batch = fileNames.slice(i, i + batchSize);
            const batchPromises = batch.map(async (fileName): Promise<FileSystemItem | null> => {
                try {
                    const fullPath = path.join(dirPath, fileName);
                    
                    // Special handling for Windows shortcuts and broken symlinks
                    if (isWindowsShortcut(fileName)) {
                        // For .lnk files, we can still show them even if the target is broken
                        try {
                            const stats = await fs.stat(fullPath);
                            return {
                                name: fileName,
                                path: fullPath,
                                type: 'file' as const,
                                size: stats.size,
                                modified: stats.mtime,
                                created: stats.birthtime || stats.ctime,
                                extension: '.lnk',
                                isHidden: fileName.startsWith('.'),
                                isSystem: false,
                                permissions: {
                                    read: true,
                                    write: true,
                                    execute: false
                                }
                            };
                        } catch {
                            // If we can't even stat the .lnk file itself, skip it
                            return null;
                        }
                    }
                    
                    // Check if it might be a broken symlink before trying to stat
                    if (await isBrokenLink(fullPath)) {
                        return null;
                    }
                    
                    const stats = await getMetadata(fullPath);
                    
                    if (!stats) return null;

                    // Check if hidden file (starts with . on Unix/Linux or has hidden attribute on Windows)
                    const isHidden = fileName.startsWith('.') || 
                        (process.platform === 'win32' && (stats as any).isHidden?.());
                    
                    if (!includeHidden && isHidden) return null;

                    const extension = stats.isFile() ? path.extname(fileName).toLowerCase() : undefined;
                    
                    return {
                        name: fileName,
                        path: fullPath,
                        type: stats.isDirectory() ? 'directory' : 'file',
                        size: stats.size,
                        modified: stats.mtime,
                        created: stats.birthtime || stats.ctime,
                        extension,
                        isHidden,
                        isSystem: false, // Could be enhanced with platform-specific checks
                        permissions: {
                            read: true,  // Simplified - could use fs.access for actual permissions
                            write: true,
                            execute: stats.isFile() && (stats.mode & 0o111) !== 0
                        }
                    };
                } catch (error) {
                    // Skip files that cause errors (broken shortcuts, permissions, etc.)
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            items.push(...batchResults.filter((item): item is FileSystemItem => item !== null));
        }

        // Windows-style sorting (matches Windows File Explorer default behavior)
        items.sort((a, b) => {
            // Always sort directories before files (Windows default)
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    // Windows uses natural sorting (alphanumeric) that handles numbers correctly
                    comparison = a.name.localeCompare(b.name, undefined, { 
                        numeric: true, 
                        sensitivity: 'base' // Case-insensitive
                    });
                    break;
                case 'size':
                    // For directories, fall back to name sorting since size isn't meaningful
                    if (a.type === 'directory' && b.type === 'directory') {
                        comparison = a.name.localeCompare(b.name, undefined, { 
                            numeric: true, 
                            sensitivity: 'base' 
                        });
                    } else {
                        comparison = a.size - b.size;
                    }
                    break;
                case 'modified':
                    // Sort by modification date
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

// Analyze folder contents for detailed metadata
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
        if (!stats || !stats.isDirectory()) {
            return defaultMetadata;
        }

        defaultMetadata.created = stats.birthtime || stats.ctime;
        defaultMetadata.lastModified = stats.mtime;

        // Recursively analyze folder contents
        const analyzeRecursive = async (dirPath: string, depth = 0): Promise<{ size: number; files: number; folders: number; types: Record<string, number>; lastModified: Date }> => {
            let totalSize = 0;
            let totalFiles = 0;
            let totalFolders = 0;
            const fileTypes: Record<string, number> = {};
            let lastModified = new Date(0);

            // Limit recursion depth to prevent performance issues
            if (depth > 3) {
                return { size: totalSize, files: totalFiles, folders: totalFolders, types: fileTypes, lastModified };
            }

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
                            // Recursively analyze subdirectories
                            const subResult = await analyzeRecursive(itemPath, depth + 1);
                            totalSize += subResult.size;
                            totalFiles += subResult.files;
                            totalFolders += subResult.folders;
                            
                            // Merge file types
                            for (const [ext, count] of Object.entries(subResult.types)) {
                                fileTypes[ext] = (fileTypes[ext] || 0) + count;
                            }
                            
                            if (subResult.lastModified > lastModified) {
                                lastModified = subResult.lastModified;
                            }
                        } else {
                            totalFiles++;
                            totalSize += itemStats.size;
                            
                            // Track file extensions
                            const ext = path.extname(item).toLowerCase();
                            const extension = ext || 'no extension';
                            fileTypes[extension] = (fileTypes[extension] || 0) + 1;
                        }
                    } catch (error) {
                        // Skip items that cause errors (permissions, broken links, etc.)
                        continue;
                    }
                }
            } catch (error) {
                // Skip directories that cause errors
            }

            return { size: totalSize, files: totalFiles, folders: totalFolders, types: fileTypes, lastModified };
        };

        const result = await analyzeRecursive(folderPath);
        
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