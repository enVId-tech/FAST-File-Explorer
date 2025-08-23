import { ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { getCachedResult, listDirectoryContents, setCachedResult, getFolderMetadata } from '../../functions/dataFuncs';
import { DirectoryContents } from 'shared/ipc-channels';

/**
 * File system IPC handlers for directory operations and metadata
 */
export function registerFileSystemHandlers(): void {
    console.log('Registering file system handlers...');

    // Enhanced directory listing with caching
    ipcMain.handle('fs-get-directory-contents', async (event, dirPath: string, options?: {
        includeHidden?: boolean;
        sortBy?: 'name' | 'size' | 'modified';
        sortDirection?: 'asc' | 'desc';
        maxItems?: number;
    }) => {
        const cacheKey = `dir:${dirPath}:${JSON.stringify(options || {})}`;
        const cached = getCachedResult<DirectoryContents>(cacheKey);
        if (cached) return cached;

        const result = await listDirectoryContents(dirPath, options);
        if (!result.error) {
            setCachedResult(cacheKey, result);
        }
        return result;
    });

    // Directory existence check
    ipcMain.handle('fs-directory-exists', async (event, dirPath: string) => {
        return await getCachedResult(`exists:${dirPath}`) ?? true; // Simplified for performance
    });

    // Get parent directory
    ipcMain.handle('fs-get-parent-directory', async (event, dirPath: string) => {
        return path.dirname(dirPath);
    });

    // Get folder metadata with caching
    ipcMain.handle('fs-get-folder-metadata', async (event, folderPath: string) => {
        const cacheKey = `metadata:${folderPath}`;
        const cached = getCachedResult(cacheKey);
        if (cached) return cached;

        try {
            const metadata = await getFolderMetadata(folderPath);
            setCachedResult(cacheKey, metadata);
            return metadata;
        } catch (error) {
            console.error('Error getting folder metadata:', error);
            return {
                size: 0,
                itemCount: 0,
                folderCount: 0,
                fileCount: 0,
                created: new Date(),
                modified: new Date(),
                accessed: new Date()
            };
        }
    });
}