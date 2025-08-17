import { ipcMain, clipboard, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs/promises';

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

            const results = [];
            for (const sourcePath of clipboardState.files) {
                try {
                    const fileName = path.basename(sourcePath);
                    const destPath = path.join(destinationPath, fileName);
                    
                    if (clipboardState.operation === 'copy') {
                        await fs.copyFile(sourcePath, destPath);
                    } else if (clipboardState.operation === 'cut') {
                        // For cross-device operations, copy then delete
                        try {
                            await fs.rename(sourcePath, destPath);
                        } catch (error: any) {
                            if (error.code === 'EXDEV') {
                                // Cross-device link not permitted, use copy + delete
                                await fs.copyFile(sourcePath, destPath);
                                await fs.unlink(sourcePath);
                            } else {
                                throw error;
                            }
                        }
                    }
                    
                    results.push({ path: sourcePath, success: true });
                } catch (error: any) {
                    console.error(`Failed to paste ${sourcePath}:`, error);
                    results.push({ path: sourcePath, success: false, error: error.message });
                }
            }

            // Clear clipboard state after cut operation
            if (clipboardState.operation === 'cut') {
                clipboardState = { operation: null, files: [] };
            }

            return { success: true, results };
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
