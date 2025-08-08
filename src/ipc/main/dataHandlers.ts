import { ipcMain } from 'electron';
import path from 'path';
import drivelist from 'drivelist';
import fs from 'fs';
import os from 'os';
import nodeDiskInfo from 'node-disk-info';

type DriveDetails = {
    driveName: string;
    drivePath: string;
    available: number;
    used: number;
    total: number;
    percentageUsed: string;
    busType?: string;
    description?: string;
    isSystem?: boolean;
    flags?: {
        isCard: boolean;
        isReadOnly: boolean;
        isRemovable: boolean;
        isSCSI: boolean;
        isSystem: boolean;
        isUSB: boolean;
        isVirtual: boolean;
    };
    partitionType?: "mbr" | "gpt" | null | undefined;
    logicalBlockSize?: number;
};

async function getDataPath(dataName: string): Promise<string> {
    return path.join(os.homedir(), dataName);
}

async function getFolderContents(folderPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                reject(err);
            } else {
                resolve(files);
            }
        });
    });
}

// This function retrieves metadata, such as size and modification time
async function getMetadata(dataPath: string): Promise<fs.Stats> {
    return new Promise((resolve, reject) => {
        fs.stat(dataPath, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                resolve(stats);
            }
        });
    });
}

// This function checks if a folder or file exists at the specified path
async function dataExists(dataPath: string): Promise<boolean> {
    return new Promise((resolve) => {
        fs.access(dataPath, fs.constants.F_OK, (err) => {
            resolve(!err);
        });
    });
}

// This function lists the contents of a directory, including metadata for each item
async function listDirectoryContents(dirPath: string) {
    try {
        const dirents = await getFolderContents(dirPath);
        const contents = await Promise.all(dirents.map(async (name) => {
            const fullPath = path.join(dirPath, name);
            const stats = await getMetadata(fullPath);
            return {
                name,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modifiedTime: stats.mtime
            };
        }));
    } catch (error) {
        console.error('Failed to list directory contents:', error);
        return [];
    }
}

export default function initializeDataHandlers() {
    console.log('Initializing data handlers...');

    ipcMain.handle('data-get-directory', async (event, folderPath: string) => {
        console.log(`Received data-get-directory request for: ${folderPath}`);

        if (!await dataExists(folderPath)) {
            throw new Error(`Folder "${folderPath}" does not exist.`);
        }

        console.log(`Fetching contents for folder: ${folderPath}`);

        // Get all files and folders in the specified folder
        const contents = await getFolderContents(folderPath);
        console.log(`Contents of folder ${folderPath}:`, contents);
        if (contents.length === 0) {
            console.log(`No contents found in folder: ${folderPath}`);
            return [];
        }
        return contents;
    });

    ipcMain.handle('data-get', async (event, folderPath: string) => {
        console.log(`Received data-get request for: ${folderPath}`);

        if (!await dataExists(folderPath)) {
            throw new Error(`Folder "${folderPath}" does not exist.`);
        }

        console.log(`Fetching metadata for folder: ${folderPath}`);

        return getMetadata(folderPath);
    });

    // Get drive information
    ipcMain.handle('data-get-drives', async () => {
        console.log('Fetching available drives...');
        const drives = await drivelist.list();
        const diskInfo = await nodeDiskInfo.getDiskInfo();
        // console.log('Available drives:', drives);

        const driveDetails: DriveDetails[] = [];

        // Iterate through each drive and find its disk information
        // Check for matching drive and disk information, and then get data from matched index
        Object.values(diskInfo).forEach((disk) => {
            let details: DriveDetails = {
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
                        isSystem: drive.isSystem,
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