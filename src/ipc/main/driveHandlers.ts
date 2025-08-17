import { ipcMain } from 'electron';
import drivelist from 'drivelist';
import nodeDiskInfo from 'node-disk-info';
import { Drive } from 'shared/file-data';

// Drive cache for performance optimization
let driveCache: Drive[] = [];
let drivesCacheTime = 0;
const DRIVE_CACHE_TTL = 30000; // 30 seconds cache

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
                nodeDiskInfo.getDiskInfo()
            ]);

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Drive enumeration timeout')), 5000);
            });

            const [drives, diskInfo] = await Promise.race([drivePromise, timeoutPromise]) as [any[], any];

            const driveDetails: Drive[] = [];

            // Match disk info with drive info for complete data
            Object.values(diskInfo).forEach((disk: any) => {
                let details: Drive = {
                    driveName: disk.filesystem,
                    drivePath: disk.mounted,
                    available: disk.available,
                    used: disk.used,
                    total: disk.blocks,
                    percentageUsed: disk.capacity,
                };

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

                driveDetails.push(details);
            });

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
}
