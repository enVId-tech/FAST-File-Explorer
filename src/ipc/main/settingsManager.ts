import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { AppSettings, KnownFolderSettings } from 'shared/settings';

class SettingsManager {
    private settingsPath: string;
    private defaultSettings: AppSettings;

    constructor() {
        // Store settings in app data directory
        const appDataPath = app.getPath('userData');
        this.settingsPath = path.join(appDataPath, 'settings.json');
        
        // Default known folder paths
        this.defaultSettings = {
            knownFolders: {
                home: os.homedir(),
                desktop: path.join(os.homedir(), 'Desktop'),
                documents: path.join(os.homedir(), 'Documents'),
                downloads: path.join(os.homedir(), 'Downloads'),
                pictures: path.join(os.homedir(), 'Pictures'),
                music: path.join(os.homedir(), 'Music'),
                videos: path.join(os.homedir(), 'Videos'),
            },
            theme: 'win11-light',
            viewMode: 'list',
            zoomLevel: 100,
            version: '1.0.0',
            // File system settings
            fileSizeUnit: 'decimal',
            showHiddenFiles: false,
            showFileExtensions: true,
            defaultSortBy: 'name',
            defaultSortOrder: 'asc',
            // UI/UX settings
            enableAnimations: true,
            showThumbnails: true,
            thumbnailSize: 'medium',
            compactMode: false,
            doubleClickToOpen: true,
            // Performance settings
            enableFilePreview: true,
            maxPreviewFileSize: 10,
            enableQuickSearch: true,
        };
    }

    /**
     * Load settings from file, create with defaults if doesn't exist
     */
    async loadSettings(): Promise<AppSettings> {
        try {
            const settingsData = await fs.readFile(this.settingsPath, 'utf8');
            const settings = JSON.parse(settingsData) as AppSettings;
            
            // Merge with defaults to ensure all properties exist
            return {
                ...this.defaultSettings,
                ...settings,
                knownFolders: {
                    ...this.defaultSettings.knownFolders,
                    ...settings.knownFolders
                }
            };
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // Settings file doesn't exist, create it with defaults
                await this.saveSettings(this.defaultSettings);
                return this.defaultSettings;
            }
            console.error('Error loading settings:', error);
            return this.defaultSettings;
        }
    }

    /**
     * Save settings to file
     */
    async saveSettings(settings: AppSettings): Promise<void> {
        try {
            // Ensure the app data directory exists
            await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
            
            // Save settings with pretty formatting
            await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * Get a specific known folder path
     */
    async getKnownFolder(folderType: string): Promise<string> {
        const settings = await this.loadSettings();
        const folderPath = settings.knownFolders[folderType];
        
        if (!folderPath) {
            throw new Error(`Unknown folder type: ${folderType}`);
        }
        
        return folderPath;
    }

    /**
     * Update a known folder path
     */
    async updateKnownFolder(folderType: string, newPath: string): Promise<void> {
        const settings = await this.loadSettings();
        settings.knownFolders[folderType] = newPath;
        await this.saveSettings(settings);
    }

    /**
     * Update multiple known folder paths
     */
    async updateKnownFolders(folders: Partial<KnownFolderSettings>): Promise<void> {
        const settings = await this.loadSettings();
        
        // Filter out undefined values to satisfy TypeScript
        Object.entries(folders).forEach(([key, value]) => {
            if (value !== undefined) {
                settings.knownFolders[key] = value;
            }
        });
        
        await this.saveSettings(settings);
    }

    /**
     * Reset known folders to defaults
     */
    async resetKnownFolders(): Promise<void> {
        const settings = await this.loadSettings();
        settings.knownFolders = { ...this.defaultSettings.knownFolders };
        await this.saveSettings(settings);
    }

    /**
     * Get all settings
     */
    async getAllSettings(): Promise<AppSettings> {
        return await this.loadSettings();
    }

    /**
     * Update general app setting
     */
    async updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
        const settings = await this.loadSettings();
        settings[key] = value;
        await this.saveSettings(settings);
    }

    /**
     * Validate that a folder path exists and is accessible
     */
    async validateFolderPath(folderPath: string): Promise<boolean> {
        try {
            const stats = await fs.stat(folderPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Get settings file path for debugging
     */
    getSettingsPath(): string {
        return this.settingsPath;
    }
}

// Export singleton instance
export const settingsManager = new SettingsManager();
