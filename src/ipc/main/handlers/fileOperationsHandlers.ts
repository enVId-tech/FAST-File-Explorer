import { ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs/promises';

// Dynamic import for fast-transferlib
let UnifiedTransferManagerClass: any;
let transferLibAvailable = false;

async function loadTransferLib() {
    if (!transferLibAvailable) {
        try {
            const lib = await import('fast-transferlib');
            UnifiedTransferManagerClass = lib.UnifiedTransferManager;
            transferLibAvailable = true;
        } catch (error) {
            console.warn('Fast-transferlib not available for file operations');
        }
    }
    return transferLibAvailable;
}

/**
 * File operations IPC handlers for copy, move, delete, rename, create
 */
export function registerFileOperationsHandlers(): void {
    console.log('Registering file operations handlers...');

    // Copy files
    ipcMain.handle('file-copy', async (event, sources: string[], destination: string) => {
        try {
            // Try to use fast-transferlib for better performance
            if (await loadTransferLib()) {
                try {
                    const manager = new UnifiedTransferManagerClass();
                    await manager.initialize();

                    const results = [];
                    for (const source of sources) {
                        const result = await manager.transfer(source, destination, {
                            recursive: true,
                            archive: true,
                            forceNative: process.platform === 'win32'
                        });
                        results.push(result);
                    }

                    const allSuccessful = results.every(r => r.success);
                    if (!allSuccessful) {
                        throw new Error('Some files failed to copy');
                    }
                    return { success: true };
                } catch (transferError) {
                    console.warn('Transfer lib failed, using fallback:', transferError);
                }
            }

            // Fallback to standard copy
            for (const source of sources) {
                const destPath = path.join(destination, path.basename(source));
                const stat = await fs.stat(source);
                
                if (stat.isDirectory()) {
                    await copyDirectoryRecursive(source, destPath);
                } else {
                    await fs.copyFile(source, destPath);
                }
            }
            return { success: true };
        } catch (error) {
            console.error('Copy operation failed:', error);
            throw error;
        }
    });

    // Cut files (copy then delete)
    ipcMain.handle('file-cut', async (event, sources: string[], destination: string) => {
        try {
            // Try to use fast-transferlib for move operations
            if (await loadTransferLib()) {
                try {
                    const manager = new UnifiedTransferManagerClass();
                    await manager.initialize();

                    const results = [];
                    for (const source of sources) {
                        // Copy first
                        const result = await manager.transfer(source, destination, {
                            recursive: true,
                            archive: true,
                            forceNative: process.platform === 'win32'
                        });
                        
                        if (result.success) {
                            // Delete source after successful copy
                            const stat = await fs.stat(source);
                            if (stat.isDirectory()) {
                                await fs.rm(source, { recursive: true });
                            } else {
                                await fs.unlink(source);
                            }
                        }
                        results.push(result);
                    }

                    const allSuccessful = results.every(r => r.success);
                    if (!allSuccessful) {
                        throw new Error('Some files failed to move');
                    }
                    return { success: true };
                } catch (transferError) {
                    console.warn('Transfer lib failed, using fallback:', transferError);
                }
            }

            // Fallback to standard move
            for (const source of sources) {
                const destPath = path.join(destination, path.basename(source));
                const stat = await fs.stat(source);
                
                if (stat.isDirectory()) {
                    await copyDirectoryRecursive(source, destPath);
                    await fs.rm(source, { recursive: true });
                } else {
                    await fs.copyFile(source, destPath);
                    await fs.unlink(source);
                }
            }
            return { success: true };
        } catch (error) {
            console.error('Cut operation failed:', error);
            throw error;
        }
    });

    // Delete files with improved error handling
    ipcMain.handle('file-delete', async (event, paths: string[]) => {
        const results = [];
        for (const filePath of paths) {
            try {
                const stat = await fs.stat(filePath);
                if (stat.isDirectory()) {
                    await fs.rmdir(filePath, { recursive: true });
                } else {
                    await fs.unlink(filePath);
                }
                results.push({ path: filePath, success: true });
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist - consider it successfully deleted
                    results.push({ path: filePath, success: true, wasAlreadyDeleted: true });
                } else {
                    console.error(`Failed to delete ${filePath}:`, error);
                    results.push({ path: filePath, success: false, error: error.message });
                }
            }
        }
        return { results };
    });

    // Rename file
    ipcMain.handle('file-rename', async (event, oldPath: string, newName: string) => {
        try {
            const newPath = path.join(path.dirname(oldPath), newName);
            await fs.rename(oldPath, newPath);
            return { success: true, newPath };
        } catch (error) {
            console.error('Rename operation failed:', error);
            throw error;
        }
    });

    // Create folder
    ipcMain.handle('file-create-folder', async (event, parentPath: string, name: string) => {
        try {
            const folderPath = path.join(parentPath, name);
            await fs.mkdir(folderPath, { recursive: true });
            return { success: true, path: folderPath };
        } catch (error) {
            console.error('Create folder operation failed:', error);
            throw error;
        }
    });

    // Show file properties (open system properties dialog)
    ipcMain.handle('file-show-properties', async (event, filePath: string) => {
        try {
            // Platform-specific property dialogs
            if (process.platform === 'win32') {
                const { spawn } = require('child_process');
                spawn('cmd', ['/c', 'start', 'ms-settings:defaultapps'], { detached: true });
            } else {
                await shell.showItemInFolder(filePath);
            }
            return { success: true };
        } catch (error) {
            console.error('Show properties failed:', error);
            throw error;
        }
    });

    // Show file in system explorer
    ipcMain.handle('file-show-in-explorer', async (event, filePath: string) => {
        try {
            await shell.showItemInFolder(filePath);
            return { success: true };
        } catch (error) {
            console.error('Show in explorer failed:', error);
            throw error;
        }
    });
}

/**
 * Recursively copy directory
 */
async function copyDirectoryRecursive(source: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectoryRecursive(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}
