import { ipcMain, shell, clipboard, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import fsStat from 'fs';
import drivelist from 'drivelist';
import os from 'os';
import nodeDiskInfo from 'node-disk-info';
import { Drive } from 'shared/file-data';
import { settingsManager } from '../functions/settingsManager';
import { getCachedResult, listDirectoryContents, setCachedResult, dataExists, getFolderContents, getMetadata, getFolderMetadata } from '../functions/dataFuncs';
import { DirectoryContents } from 'shared/ipc-channels';

export default function initializeDataHandlers() {
    console.log('Initializing enhanced data handlers...');

    // Get drive information - optimized with timeout and caching
    let driveCache: Drive[] = [];
    let drivesCacheTime = 0;
    const DRIVE_CACHE_TTL = 30000; // 30 seconds cache

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

    // Get detailed folder metadata
    ipcMain.handle('fs-get-folder-metadata', async (event, folderPath: string) => {
        const cacheKey = `folder-meta:${folderPath}`;
        
        // Check cache first (longer TTL for metadata as it's expensive to compute)
        const cached = getCachedResult(cacheKey);
        if (cached) {
            return cached;
        }
        
        console.log(`Analyzing folder metadata for: ${folderPath}`);
        const metadata = await getFolderMetadata(folderPath);
        
        // Cache the result with longer TTL
        setCachedResult(cacheKey, metadata);
        
        return metadata;
    });

    // Navigate to specific known folders - now uses settings manager
    ipcMain.handle('fs-get-known-folder', async (event, folderType: string) => {
        try {
            return await settingsManager.getKnownFolder(folderType);
        } catch (error) {
            console.error(`Failed to get known folder ${folderType}:`, error);

            // Fallback to hardcoded paths if settings fail
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

    // Get drive information - optimized with timeout and caching
    ipcMain.handle('data-get-drives', async () => {
        // Check if the drives are already cached
        if (driveCache.length > 0 && Date.now() - drivesCacheTime < DRIVE_CACHE_TTL) {
            return driveCache;
        }

        try {
            // Use Promise.race with timeout to prevent indefinite blocking
            const drivePromise = Promise.all([
                drivelist.list(),
                nodeDiskInfo.getDiskInfo()
            ]);

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Drive enumeration timeout')), 5000);
            });

            const [drives, diskInfo] = await Promise.race([drivePromise, timeoutPromise]) as [any[], any];

            console.log("Fetching drives");

            const driveDetails: Drive[] = [];

            // Iterate through each drive and find its disk information
            // Check for matching drive and disk information, and then get data from matched index
            Object.values(diskInfo).forEach((disk: any) => {
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

            // Cache the results
            driveCache = driveDetails;
            drivesCacheTime = Date.now();

            return { driveDetails };

        } catch (error) {
            console.error('Failed to fetch drives:', error);
            // Return cached drives or empty array on error
            return { driveDetails: driveCache.length > 0 ? driveCache : [] };
        }
    });

    // System file opening using OS default applications - optimized for speed
    ipcMain.handle('system-open-file', async (event, filePath: string) => {
        try {
            // Direct file opening with minimal overhead
            // shell.openPath is non-blocking and returns immediately
            const result = await shell.openPath(filePath);
            
            // Return success status immediately (empty string = success)
            return result === '';
        } catch (error) {
            // Minimal error handling for speed
            return false;
        }
    });

    // Ultra-fast fire-and-forget file opening (no return value)
    ipcMain.on('system-open-file-fast', (event, filePath: string) => {
        // Use IPC 'on' instead of 'handle' for zero latency
        // This doesn't wait for a response and has minimal overhead
        shell.openPath(filePath).catch(() => {
            // Silent error handling for maximum speed
        });
    });

    // File operation handlers with OS integration
    
    // Copy files
    ipcMain.handle('file-copy', async (event, sources: string[], destination: string) => {
        try {
            for (const source of sources) {
                const sourceName = path.basename(source);
                const destPath = path.join(destination, sourceName);
                await fs.copyFile(source, destPath);
            }
            return true;
        } catch (error) {
            console.error('Failed to copy files:', error);
            return false;
        }
    });

    // Cut (move) files
    ipcMain.handle('file-cut', async (event, sources: string[], destination: string) => {
        try {
            for (const source of sources) {
                const sourceName = path.basename(source);
                const destPath = path.join(destination, sourceName);
                await fs.rename(source, destPath);
            }
            return true;
        } catch (error) {
            console.error('Failed to cut files:', error);
            return false;
        }
    });

    // Delete files
    ipcMain.handle('file-delete', async (event, paths: string[]) => {
        try {
            const results = [];
            for (const filePath of paths) {
                try {
                    // Check if file exists before trying to delete
                    const stats = await fs.stat(filePath);
                    if (stats.isDirectory()) {
                        await fs.rm(filePath, { recursive: true, force: true });
                    } else {
                        await fs.unlink(filePath);
                    }
                    results.push({ path: filePath, success: true });
                } catch (error: any) {
                    if (error.code === 'ENOENT') {
                        // File already doesn't exist, consider it a success
                        console.warn(`File already deleted: ${filePath}`);
                        results.push({ path: filePath, success: true });
                    } else {
                        console.error(`Failed to delete ${filePath}:`, error);
                        results.push({ path: filePath, success: false, error: error.message });
                    }
                }
            }
            return { success: true, results };
        } catch (error: any) {
            console.error('Failed to delete files:', error);
            return { success: false, error: error?.message || 'Unknown error' };
        }
    });

    // Rename file
    ipcMain.handle('file-rename', async (event, oldPath: string, newName: string) => {
        try {
            const directory = path.dirname(oldPath);
            const newPath = path.join(directory, newName);
            await fs.rename(oldPath, newPath);
            return true;
        } catch (error) {
            console.error('Failed to rename file:', error);
            return false;
        }
    });

    // Create new folder
    ipcMain.handle('file-create-folder', async (event, parentPath: string, name: string) => {
        try {
            const folderPath = path.join(parentPath, name);
            await fs.mkdir(folderPath);
            return folderPath;
        } catch (error) {
            console.error('Failed to create folder:', error);
            throw error;
        }
    });

    // Show file properties (OS-specific)
    ipcMain.handle('file-show-properties', async (event, filePath: string) => {
        try {
            if (process.platform === 'win32') {
                // Windows: Show properties dialog
                const { spawn } = require('child_process');
                spawn('rundll32.exe', ['shell32.dll,OpenAs_RunDLL', filePath], { detached: true });
            } else if (process.platform === 'darwin') {
                // macOS: Get Info
                const { spawn } = require('child_process');
                spawn('open', ['-R', filePath], { detached: true });
            } else {
                // Linux: Show in file manager
                await shell.showItemInFolder(filePath);
            }
        } catch (error) {
            console.error('Failed to show properties:', error);
        }
    });

    // Show in system file explorer
    ipcMain.handle('file-show-in-explorer', async (event, filePath: string) => {
        try {
            await shell.showItemInFolder(filePath);
        } catch (error) {
            console.error('Failed to show in explorer:', error);
        }
    });

    // Clipboard operations
    let clipboardFiles: string[] = [];
    let clipboardOperation: 'copy' | 'cut' = 'copy';

    // Copy files to clipboard
    ipcMain.handle('clipboard-copy', async (event, paths: string[]) => {
        try {
            clipboardFiles = [...paths];
            clipboardOperation = 'copy';
            
            // For cross-platform compatibility, we'll store file paths
            // Some platforms support native file clipboard integration
            if (process.platform === 'win32') {
                // Windows native clipboard support would go here
                clipboard.writeText(paths.join('\n'));
            } else {
                clipboard.writeText(paths.join('\n'));
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    });

    // Cut files to clipboard
    ipcMain.handle('clipboard-cut', async (event, paths: string[]) => {
        try {
            clipboardFiles = [...paths];
            clipboardOperation = 'cut';
            clipboard.writeText(paths.join('\n'));
        } catch (error) {
            console.error('Failed to cut to clipboard:', error);
        }
    });

    // Paste files from clipboard
    ipcMain.handle('clipboard-paste', async (event, destinationPath: string) => {
        try {
            if (clipboardFiles.length === 0) return false;
            
            for (const source of clipboardFiles) {
                const sourceName = path.basename(source);
                const destPath = path.join(destinationPath, sourceName);
                
                if (clipboardOperation === 'copy') {
                    // Check if source is directory or file
                    const stats = await fs.stat(source);
                    if (stats.isDirectory()) {
                        // Copy directory recursively
                        await fs.cp(source, destPath, { recursive: true });
                    } else {
                        await fs.copyFile(source, destPath);
                    }
                } else if (clipboardOperation === 'cut') {
                    // Handle cross-device move operation
                    try {
                        // Try rename first (works for same device)
                        await fs.rename(source, destPath);
                    } catch (error: any) {
                        // If rename fails with EXDEV (cross-device), use copy + delete
                        if (error.code === 'EXDEV') {
                            const stats = await fs.stat(source);
                            if (stats.isDirectory()) {
                                // Copy directory recursively
                                await fs.cp(source, destPath, { recursive: true });
                                // Remove source directory recursively
                                await fs.rm(source, { recursive: true, force: true });
                            } else {
                                // Copy file then delete source
                                await fs.copyFile(source, destPath);
                                await fs.unlink(source);
                            }
                        } else {
                            // Re-throw other errors
                            throw error;
                        }
                    }
                }
            }
            
            // Clear clipboard if cut operation
            if (clipboardOperation === 'cut') {
                clipboardFiles = [];
            }
            
            return true;
        } catch (error) {
            console.error('Failed to paste files:', error);
            return false;
        }
    });

    // Check if clipboard has files
    ipcMain.handle('clipboard-has-files', async () => {
        return clipboardFiles.length > 0;
    });

    // Get clipboard state (operation and files)
    ipcMain.handle('clipboard-get-state', async () => {
        return {
            operation: clipboardFiles.length > 0 ? clipboardOperation : null,
            files: [...clipboardFiles]
        };
    });

    // Clear clipboard
    ipcMain.handle('clipboard-clear', async () => {
        clipboardFiles = [];
        clipboard.clear();
    });

    console.log('Folder handlers registered successfully');
}