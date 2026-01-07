import { ipcMain } from 'electron';
import drivelist from 'drivelist';
import { Drive } from 'shared/file-data';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { isRunningAsAdmin, ensureAdminPrivileges } from '../../../utils/elevation';

const execAsync = promisify(exec);

/**
 * Get disk information using PowerShell (Windows 11 compatible)
 * Replaces node-disk-info which uses deprecated wmic
 */
async function getDiskInfoPowerShell(): Promise<any[]> {
    if (process.platform !== 'win32') {
        return [];
    }

    try {
        const { stdout } = await execAsync(
            `powershell -command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, VolumeName, Size, FreeSpace, FileSystem | ConvertTo-Json"`,
            { timeout: 5000 }
        );

        const disks = JSON.parse(stdout);
        const diskArray = Array.isArray(disks) ? disks : [disks];

        return diskArray.map((disk: any) => ({
            filesystem: disk.FileSystem || 'Unknown',
            mounted: disk.DeviceID || '',
            blocks: disk.Size || 0,
            used: (disk.Size || 0) - (disk.FreeSpace || 0),
            available: disk.FreeSpace || 0,
            capacity: disk.Size > 0 ? Math.round(((disk.Size - disk.FreeSpace) / disk.Size) * 100) + '%' : '0%',
            volumeName: disk.VolumeName || null
        }));
    } catch (error) {
        console.error('Failed to get disk info via PowerShell:', error);
        return [];
    }
}

// Drive cache for performance optimization
let driveCache: Drive[] = [];
let drivesCacheTime = 0;
const DRIVE_CACHE_TTL = 30000; // 30 seconds cache

/**
 * Get the volume label for a Windows drive
 * @param drivePath - The drive path (e.g., "C:")
 * @returns The volume label or null if not found/error
 */
async function getVolumeLabel(drivePath: string): Promise<string | null> {
    try {
        // Ensure drive path is in correct format (e.g., "C:")
        const driveLetter = drivePath.replace(/[:\\\/]/g, '').toUpperCase();
        
        if (process.platform === 'win32') {
            // Use PowerShell command to get volume label (Windows 11 compatible)
            const { stdout } = await execAsync(
                `powershell -command "Get-CimInstance Win32_LogicalDisk | Where-Object {$_.DeviceID -eq '${driveLetter}:'} | Select-Object -ExpandProperty VolumeName"`,
                { timeout: 3000 }
            );
            
            // Parse the output
            const label = stdout.trim();
            if (label) {
                return label;
            }
            return null;
        } else {
            // For Linux/Mac, try to read from mount point
            // This is a fallback and may not work on all systems
            try {
                const mountPath = drivePath.endsWith(':') ? `${drivePath}\\` : drivePath;
                // On Linux, volume labels are typically stored in /dev/disk/by-label/
                // This is a simplified approach
                return null;
            } catch {
                return null;
            }
        }
    } catch (error) {
        console.error(`Failed to get volume label for ${drivePath}:`, error);
    }
    return null;
}

/**
 * Set the volume label for a Windows drive
 * @param drivePath - The drive path (e.g., "C:")
 * @param newLabel - The new volume label
 * @returns Success status
 */
async function setVolumeLabel(drivePath: string, newLabel: string): Promise<boolean> {
    try {
        // Ensure drive path is in correct format (e.g., "C:")
        const driveLetter = drivePath.replace(/[:\\\/]/g, '').toUpperCase();
        
        if (process.platform === 'win32') {
            // Sanitize the label (remove invalid characters)
            const sanitizedLabel = newLabel.replace(/[<>:"/\\|?*]/g, '').substring(0, 32);
            
            // Use Windows label command to set volume label
            await execAsync(
                `label ${driveLetter}: "${sanitizedLabel}"`,
                { timeout: 5000 }
            );
            
            // Clear drive cache to force refresh
            driveCache = [];
            drivesCacheTime = 0;
            
            return true;
        }
    } catch (error) {
        console.error(`Failed to set volume label for ${drivePath}:`, error);
    }
    return false;
}

/**
 * Drive information IPC handlers with caching and timeout handling
 */
export function registerDriveHandlers(): void {
    console.log('Registering drive handlers...');

    // Get drive information with caching and timeout
    ipcMain.handle('data-get-drives', async () => {
        // Return cached data if still valid
        if (driveCache.length > 0 && Date.now() - drivesCacheTime < DRIVE_CACHE_TTL) {
            return driveCache;
        }

        try {
            // Use timeout to prevent hanging
            const drivePromise = Promise.all([
                drivelist.list(),
                getDiskInfoPowerShell()
            ]);

            let timeoutId: NodeJS.Timeout | undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('Drive enumeration timeout')), 5000);
            });

            let result;
            try {
                result = await Promise.race([drivePromise, timeoutPromise]);
                if (timeoutId) clearTimeout(timeoutId);
            } catch (error) {
                if (timeoutId) clearTimeout(timeoutId);
                throw error;
            }
            
            const [drives, diskInfo] = result as [any[], any];

            const driveDetails: Drive[] = [];

            // Match disk info with drive info for complete data
            const drivePromises = Object.values(diskInfo).map(async (disk: any) => {
                let details: Drive = {
                    driveName: disk.filesystem,
                    drivePath: disk.mounted,
                    available: disk.available,
                    used: disk.used,
                    total: disk.blocks,
                    percentageUsed: disk.capacity,
                };

                // Use volume label from disk info (already fetched in one call)
                if (disk.volumeName) {
                    details.volumeLabel = disk.volumeName;
                    // Use volume label as the display name if available
                    details.driveName = disk.volumeName;
                }

                // Find matching drive for additional metadata
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

                return details;
            });

            const resolvedDrives = await Promise.all(drivePromises);
            driveDetails.push(...resolvedDrives);

            // Filter out invalid drives and sort by drive path
            const validDrives = driveDetails
                .filter(drive => drive.drivePath && drive.total > 0)
                .sort((a, b) => a.drivePath.localeCompare(b.drivePath));

            // Update cache
            driveCache = validDrives;
            drivesCacheTime = Date.now();

            console.log(`Found ${validDrives.length} valid drives`);
            return validDrives;

        } catch (error) {
            console.error('Error fetching drives:', error);
            // Return cached data if available, even if expired
            if (driveCache.length > 0) {
                console.log('Returning stale cache due to error');
                return driveCache;
            }
            return [];
        }
    });

    // Force refresh drives (clears cache)
    ipcMain.handle('data-refresh-drives', async () => {
        driveCache = [];
        drivesCacheTime = 0;
        return ipcMain.emit('data-get-drives');
    });

    // Check if running as administrator
    ipcMain.handle('system-is-admin', async () => {
        return await isRunningAsAdmin();
    });

    // Request admin elevation for drive operations
    ipcMain.handle('system-request-elevation', async (_event, reason: string) => {
        return await ensureAdminPrivileges(reason);
    });

    // Rename drive (set volume label)
    ipcMain.handle('data-rename-drive', async (_event, drivePath: string, newLabel: string) => {
        try {
            console.log(`Attempting to rename drive ${drivePath} to "${newLabel}"`);
            
            // Check if we have admin privileges
            const isAdmin = await isRunningAsAdmin();
            if (!isAdmin) {
                console.log('Not running as admin, elevation needed');
                return { success: false, needsElevation: true };
            }
            
            const success = await setVolumeLabel(drivePath, newLabel);
            
            if (success) {
                console.log(`Successfully renamed drive ${drivePath}`);
                // Clear cache to force refresh
                driveCache = [];
                drivesCacheTime = 0;
            }
            
            return { success, needsElevation: false };
        } catch (error) {
            console.error(`Error renaming drive ${drivePath}:`, error);
            return { success: false, needsElevation: false, error: (error as Error).message };
        }
    });
}
