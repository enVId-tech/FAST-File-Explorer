import { ipcMain, shell } from 'electron';

/**
 * System operation IPC handlers for opening files and system integration
 */
export function registerSystemHandlers(): void {
    console.log('Registering system handlers...');

    // Fast file opening (fire-and-forget) - used by frontend
    ipcMain.handle('system-open-file-fast', async (event, filePath: string) => {
        try {
            // Fire-and-forget approach for maximum speed
            shell.openPath(filePath).catch(error => {
                console.error('Failed to open file:', filePath, error);
            });
            
            // Return immediately without waiting
            return { success: true };
        } catch (error) {
            console.error('Open file operation failed:', error);
            throw error;
        }
    });

    // Standard file opening (with error handling)
    ipcMain.handle('system-open-file', async (event, filePath: string) => {
        try {
            const result = await shell.openPath(filePath);
            if (result) {
                throw new Error(`Failed to open file: ${result}`);
            }
            return { success: true };
        } catch (error) {
            console.error('Open file operation failed:', error);
            throw error;
        }
    });

    // Get platform information
    ipcMain.handle('system-get-platform', async () => {
        return {
            platform: process.platform,
            arch: process.arch,
            version: process.version
        };
    });
}

// Export platform for immediate access
export const platform = process.platform;
