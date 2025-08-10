import { ipcMain } from 'electron';
import path from 'path';
import drivelist from 'drivelist';
import fs from 'fs/promises';
import fsStat from 'fs';
import os from 'os';
import nodeDiskInfo from 'node-disk-info';
import { Drive } from 'shared/file-data';

// Enhanced file system interfaces
interface FileSystemItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modified: Date;
    created: Date;
    extension?: string;
    isHidden: boolean;
    isSystem: boolean;
    permissions: {
        read: boolean;
        write: boolean;
        execute: boolean;
    };
}

interface DirectoryContents {
    items: FileSystemItem[];
    totalItems: number;
    path: string;
    parent?: string;
    error?: string;
}

async function getDataPath(dataName: string): Promise<string> {
    return path.join(os.homedir(), dataName);
}

// Performance-optimized directory listing with batching
async function getFolderContents(folderPath: string): Promise<string[]> {
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

function getCachedResult<T>(key: string): T | null {
    const cached = fsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedResult<T>(key: string, data: T): void {
    if (fsCache.size >= MAX_CACHE_SIZE) {
        const firstKey = fsCache.keys().next().value;
        if (firstKey) {
            fsCache.delete(firstKey);
        }
    }
    fsCache.set(key, { data, timestamp: Date.now() });
}

// Enhanced metadata function with error handling
async function getMetadata(filePath: string): Promise<fsStat.Stats | null> {
    try {
        return await fs.stat(filePath);
    } catch (error: any) {
        // Complete silence - no logging for any file access errors
        return null;
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

// Check if a file is a Windows shortcut (.lnk file)
function isWindowsShortcut(fileName: string): boolean {
    return process.platform === 'win32' && fileName.toLowerCase().endsWith('.lnk');
}

// Check if a file is likely a broken symlink or shortcut
async function isBrokenLink(filePath: string): Promise<boolean> {
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
async function listDirectoryContents(dirPath: string, options: {
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

        // Sort items
        items.sort((a, b) => {
            // Directories first
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, undefined, { numeric: true });
                    break;
                case 'size':
                    comparison = a.size - b.size;
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

// This function lists the contents of a directory with legacy support
async function listDirectoryContents_Legacy(dirPath: string) {
    try {
        const dirents = await getFolderContents(dirPath);
        const contents = await Promise.all(dirents.map(async (name) => {
            const fullPath = path.join(dirPath, name);
            const stats = await getMetadata(fullPath);
            if (!stats) return null;
            return {
                name,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modifiedTime: stats.mtime
            };
        }));
        return contents.filter(item => item !== null);
    } catch (error) {
        console.error('Failed to list directory contents:', error);
        return [];
    }
}

export default function initializeDataHandlers() {
    // console.log('Initializing enhanced data handlers...');

    // Enhanced directory listing IPC handler with caching
    ipcMain.handle('fs-get-directory-contents', async (event, dirPath: string, options?: {
        includeHidden?: boolean;
        sortBy?: 'name' | 'size' | 'modified';
        sortDirection?: 'asc' | 'desc';
        maxItems?: number;
    }) => {
        const cacheKey = `dir:${dirPath}:${JSON.stringify(options || {})}`;
        
        // Check cache first
        const cached = getCachedResult<DirectoryContents>(cacheKey);
        if (cached) {
            return cached;
        }

        // Only log for debugging - remove or make conditional in production
        // console.log(`Getting directory contents for: ${dirPath}`);
        
        const result = await listDirectoryContents(dirPath, options);
        
        // Cache successful results
        if (!result.error) {
            setCachedResult(cacheKey, result);
        }
        
        return result;
    });

    // Quick directory check (for navigation breadcrumbs, etc.)
    ipcMain.handle('fs-directory-exists', async (event, dirPath: string) => {
        return await dataExists(dirPath);
    });

    // Get parent directory
    ipcMain.handle('fs-get-parent-directory', async (event, dirPath: string) => {
        const parent = path.dirname(dirPath);
        return parent === dirPath ? null : parent; // Return null if already at root
    });

    // Navigate to specific known folders
    ipcMain.handle('fs-get-known-folder', async (event, folderType: string) => {
        switch (folderType) {
            case 'home':
                return os.homedir();
            case 'desktop':
                return path.join(os.homedir(), 'Desktop');
            case 'documents':
                return path.join(os.homedir(), 'Documents');
            case 'downloads':
                return path.join(os.homedir(), 'Downloads');
            case 'pictures':
                return path.join(os.homedir(), 'Pictures');
            case 'music':
                return path.join(os.homedir(), 'Music');
            case 'videos':
                return path.join(os.homedir(), 'Videos');
            default:
                throw new Error(`Unknown folder type: ${folderType}`);
        }
    });

    // Legacy handlers for backward compatibility
    ipcMain.handle('data-get-directory', async (event, folderPath: string) => {
        // console.log(`Received data-get-directory request for: ${folderPath}`);

        if (!await dataExists(folderPath)) {
            throw new Error(`Folder "${folderPath}" does not exist.`);
        }

        // console.log(`Fetching contents for folder: ${folderPath}`);

        // Get all files and folders in the specified folder
        const contents = await getFolderContents(folderPath);
        // console.log(`Contents of folder ${folderPath}:`, contents);
        if (contents.length === 0) {
            // console.log(`No contents found in folder: ${folderPath}`);
            return [];
        }
        return contents;
    });

    ipcMain.handle('data-get', async (event, folderPath: string) => {
        // console.log(`Received data-get request for: ${folderPath}`);

        if (!await dataExists(folderPath)) {
            throw new Error(`Folder "${folderPath}" does not exist.`);
        }

        // console.log(`Fetching metadata for folder: ${folderPath}`);

        return getMetadata(folderPath);
    });

    // Get drive information
    ipcMain.handle('data-get-drives', async () => {
        // console.log('Fetching available drives...');
        const drives = await drivelist.list();
        const diskInfo = await nodeDiskInfo.getDiskInfo();
        // console.log('Available drives:', drives);

        const driveDetails: Drive[] = [];

        // Iterate through each drive and find its disk information
        // Check for matching drive and disk information, and then get data from matched index
        Object.values(diskInfo).forEach((disk) => {
            let details: Drive = {
                driveName: disk.filesystem,
                drivePath: disk.mounted,
                available: disk.available,
                used: disk.used,
                total: disk.blocks,
                percentageUsed: disk.capacity,
            }

            // Match drive information with disk information
            // Push matched details to driveDetails array
            drives.forEach((drive) => {
                if (drive.mountpoints[0]?.path.includes(disk.mounted)) {
                    details = {
                        ...details,
                        busType: drive.busType === "INVALID" ? "NVMe" : drive.busType,
                        description: drive.description,
                        flags: {
                            isCard: drive.isCard ?? false,
                            isReadOnly: drive.isReadOnly ?? false,
                            isRemovable: drive.isRemovable ?? false,
                            isSCSI: drive.isSCSI ?? false,
                            isSystem: drive.isSystem ?? false,
                            isUSB: drive.isUSB ?? false,
                            isVirtual: drive.isVirtual ?? false
                        },
                        partitionType: drive.partitionTableType,
                        logicalBlockSize: drive.logicalBlockSize
                    };
                }
            });

            driveDetails.push(details);
        });
        return { driveDetails };
    });

    console.log('Folder handlers registered successfully');
}