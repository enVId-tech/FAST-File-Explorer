import { ipcMain } from 'electron';
import { KnownFolderSettings, AppSettings } from 'shared/settings';
import { settingsManager } from '../../functions/settingsManager';

/**
 * Initialize all settings-related IPC handlers
 */
export function initializeSettingsHandlers(): void {
    console.log('Registering settings handlers...');
}

// Get all settings
ipcMain.handle('settings-get-all', async () => {
    try {
        return await settingsManager.getAllSettings();
    } catch (error) {
        console.error('Failed to get all settings:', error);
        throw error;
    }
});

// Get known folders
ipcMain.handle('settings-get-known-folders', async () => {
    try {
        const settings = await settingsManager.getAllSettings();
        return settings.knownFolders;
    } catch (error) {
        console.error('Failed to get known folders:', error);
        throw error;
    }
});

// Get specific known folder
ipcMain.handle('settings-get-known-folder', async (event, folderType: string) => {
    try {
        return await settingsManager.getKnownFolder(folderType);
    } catch (error) {
        console.error(`Failed to get known folder ${folderType}:`, error);
        throw error;
    }
});

// Update specific known folder
ipcMain.handle('settings-update-known-folder', async (event, folderType: string, newPath: string) => {
    try {
        // Validate the path exists and is a directory
        const isValid = await settingsManager.validateFolderPath(newPath);
        if (!isValid) {
            throw new Error(`Invalid folder path: ${newPath}. Path must exist and be a directory.`);
        }

        await settingsManager.updateKnownFolder(folderType, newPath);
        return { success: true };
    } catch (error) {
        console.error(`Failed to update known folder ${folderType}:`, error);
        throw error;
    }
});

// Update multiple known folders
ipcMain.handle('settings-update-known-folders', async (event, folders: Partial<KnownFolderSettings>) => {
    try {
        // Validate all provided paths
        for (const [folderType, folderPath] of Object.entries(folders)) {
            if (folderPath) {
                const isValid = await settingsManager.validateFolderPath(folderPath);
                if (!isValid) {
                    throw new Error(`Invalid folder path for ${folderType}: ${folderPath}. Path must exist and be a directory.`);
                }
            }
        }

        await settingsManager.updateKnownFolders(folders);
        return { success: true };
    } catch (error) {
        console.error('Failed to update known folders:', error);
        throw error;
    }
});

// Reset known folders to defaults
ipcMain.handle('settings-reset-known-folders', async () => {
    try {
        await settingsManager.resetKnownFolders();
        return { success: true };
    } catch (error) {
        console.error('Failed to reset known folders:', error);
        throw error;
    }
});

// Validate folder path
ipcMain.handle('settings-validate-folder', async (event, folderPath: string) => {
    try {
        const isValid = await settingsManager.validateFolderPath(folderPath);
        return { valid: isValid };
    } catch (error: any) {
        console.error(`Failed to validate folder ${folderPath}:`, error);
        return { valid: false, error: error?.message || 'Validation failed' };
    }
});

// Update general setting
ipcMain.handle('settings-update', async (event, key: keyof AppSettings, value: any) => {
    try {
        await settingsManager.updateSetting(key, value);
        return { success: true };
    } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        throw error;
    }
});

// Get settings file path (for debugging)
ipcMain.handle('settings-get-path', async () => {
    return settingsManager.getSettingsPath();
});

console.log('Settings handlers registered successfully');