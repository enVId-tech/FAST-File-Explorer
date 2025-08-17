import { ipcMain } from 'electron';
import path from 'path';
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

    console.log('Folder handlers registered successfully');
}