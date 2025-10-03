import { ipcMain, clipboard, nativeImage, BrowserWindow } from 'electron';
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
            console.log('Fast-transferlib loaded for clipboard operations');
        } catch (error) {
            console.warn('Fast-transferlib not available, using fallback methods');
        }
    }
    return transferLibAvailable;
}

// Global clipboard state
let clipboardState = {
    operation: null as 'copy' | 'cut' | null,
    files: [] as string[]
};

/**
 * Clipboard IPC handlers for file copy/cut/paste operations
 */
export function registerClipboardHandlers(): void {
    console.log('Registering clipboard handlers...');

    // Copy files to clipboard
    ipcMain.handle('clipboard-copy', async (event, paths: string[]) => {
        try {
            clipboardState = { operation: 'copy', files: paths };
            
            // Set system clipboard with file paths
            const pathsText = paths.join('\n');
            clipboard.writeText(pathsText);
            
            // Try to set files if supported
            if (process.platform === 'win32' && paths.length === 1) {
                const image = nativeImage.createFromPath(paths[0]);
                if (!image.isEmpty()) {
                    clipboard.writeImage(image);
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            throw error;
        }
    });

    // Cut files to clipboard  
    ipcMain.handle('clipboard-cut', async (event, paths: string[]) => {
        clipboardState = { operation: 'cut', files: paths };
        return { success: true };
    });

    // Paste files from clipboard
    ipcMain.handle('clipboard-paste', async (event, destinationPath: string) => {
        try {
            if (!clipboardState.files.length) {
                throw new Error('No files in clipboard');
            }

            // Try to use fast-transferlib for better performance and reliability
            const useTransferLib = await loadTransferLib();
            
            if (useTransferLib && transferLibAvailable) {
                try {
                    const manager = new UnifiedTransferManagerClass();
                    await manager.initialize();

                    const window = BrowserWindow.fromWebContents(event.sender);
                    if (window) {
                        manager.on('progress', (progress: any) => {
                            window.webContents.send('transfer-progress', 'clipboard-paste', progress);
                        });
                    }

                    const results = [];
                    for (const sourcePath of clipboardState.files) {
                        try {
                            const result = await manager.transfer(sourcePath, destinationPath, {
                                recursive: true,
                                archive: true,
                                progress: true,
                                // Use native tools on Windows to handle locked files better
                                forceNative: process.platform === 'win32',
                                preferredMethod: process.platform === 'win32' ? 'robocopy' : undefined
                            });

                            if (result.success && clipboardState.operation === 'cut') {
                                // Delete source after successful copy for cut operation
                                try {
                                    const stat = await fs.stat(sourcePath);
                                    if (stat.isDirectory()) {
                                        await fs.rm(sourcePath, { recursive: true });
                                    } else {
                                        await fs.unlink(sourcePath);
                                    }
                                } catch (deleteError) {
                                    console.error(`Failed to delete source ${sourcePath}:`, deleteError);
                                }
                            }

                            results.push({ path: sourcePath, success: result.success });
                        } catch (error: any) {
                            console.error(`Failed to paste ${sourcePath}:`, error);
                            results.push({ path: sourcePath, success: false, error: error.message });
                        }
                    }

                    // Clear clipboard state after cut operation
                    if (clipboardState.operation === 'cut') {
                        clipboardState = { operation: null, files: [] };
                    }

                    const allSuccessful = results.every(r => r.success);
                    return { success: allSuccessful, results };
                } catch (transferError) {
                    console.warn('Transfer lib failed, falling back to standard copy:', transferError);
                    // Fall through to standard method
                }
            }

            // Fallback to standard fs operations
            const results = [];
            for (const sourcePath of clipboardState.files) {
                try {
                    const fileName = path.basename(sourcePath);
                    const destPath = path.join(destinationPath, fileName);
                    
                    // Check if source is a directory
                    const stat = await fs.stat(sourcePath);
                    
                    if (stat.isDirectory()) {
                        // Copy directory recursively
                        await copyDirectory(sourcePath, destPath);
                    } else {
                        // Copy file with retry logic for busy files
                        await copyFileWithRetry(sourcePath, destPath, 3, 1000);
                    }
                    
                    // Delete source if cut operation
                    if (clipboardState.operation === 'cut') {
                        if (stat.isDirectory()) {
                            await fs.rm(sourcePath, { recursive: true });
                        } else {
                            await fs.unlink(sourcePath);
                        }
                    }
                    
                    results.push({ path: sourcePath, success: true });
                } catch (error: any) {
                    console.error(`Failed to paste ${sourcePath}:`, error);
                    results.push({ path: sourcePath, success: false, error: error.message });
                    
                    // Show more helpful error message for busy files
                    if (error.code === 'EBUSY') {
                        console.error(`File is busy/locked: ${sourcePath}`);
                        console.error('Try closing any programs using this file, or use the advanced transfer option');
                    }
                }
            }

            // Clear clipboard state after cut operation
            if (clipboardState.operation === 'cut') {
                clipboardState = { operation: null, files: [] };
            }

            const allSuccessful = results.every(r => r.success);
            return { success: allSuccessful, results };
        } catch (error) {
            console.error('Clipboard paste failed:', error);
            throw error;
        }
    });

    // Check if clipboard has files
    ipcMain.handle('clipboard-has-files', async () => {
        return clipboardState.files.length > 0;
    });

    // Get clipboard state
    ipcMain.handle('clipboard-get-state', async () => {
        return { ...clipboardState };
    });

    // Clear clipboard
    ipcMain.handle('clipboard-clear', async () => {
        clipboardState = { operation: null, files: [] };
        clipboard.clear();
        return { success: true };
    });
}

/**
 * Copy file with retry logic for handling busy/locked files
 */
async function copyFileWithRetry(source: string, dest: string, retries: number = 3, delay: number = 1000): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await fs.copyFile(source, dest);
            return;
        } catch (error: any) {
            if (error.code === 'EBUSY' && attempt < retries) {
                console.log(`File busy, retrying in ${delay}ms (attempt ${attempt}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

/**
 * Recursively copy directory
 */
async function copyDirectory(source: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(source, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await copyFileWithRetry(srcPath, destPath);
        }
    }
}
