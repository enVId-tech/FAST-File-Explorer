import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define settings interface matching the backend
export interface KnownFolderSettings {
    home: string;
    desktop: string;
    documents: string;
    downloads: string;
    pictures: string;
    music: string;
    videos: string;
    [key: string]: string;
}

export interface AppSettings {
    knownFolders: KnownFolderSettings;
    theme: string;
    viewMode: string;
    zoomLevel: number;
    version: string;
    // File system settings
    fileSizeUnit: 'decimal' | 'binary';
    showHiddenFiles: boolean;
    showFileExtensions: boolean;
    defaultSortBy: 'name' | 'size' | 'modified' | 'type';
    defaultSortOrder: 'asc' | 'desc';
    // UI/UX settings
    enableAnimations: boolean;
    showThumbnails: boolean;
    thumbnailSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    doubleClickToOpen: boolean;
    // Performance settings
    enableFilePreview: boolean;
    maxPreviewFileSize: number;
    enableQuickSearch: boolean;
}

// Default settings (fallback values)
const defaultSettings: AppSettings = {
    knownFolders: {
        home: '',
        desktop: '',
        documents: '',
        downloads: '',
        pictures: '',
        music: '',
        videos: '',
    },
    theme: 'win11-light',
    viewMode: 'list',
    zoomLevel: 100,
    version: '1.0.0',
    fileSizeUnit: 'decimal',
    showHiddenFiles: false,
    showFileExtensions: true,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    enableAnimations: true,
    showThumbnails: true,
    thumbnailSize: 'medium',
    compactMode: false,
    doubleClickToOpen: true,
    enableFilePreview: true,
    maxPreviewFileSize: 10,
    enableQuickSearch: true,
};

// Settings context interface
interface SettingsContextType {
    settings: AppSettings;
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
    loadSettings: () => Promise<void>;
    resetSettings: () => Promise<void>;
    isLoading: boolean;
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Settings provider component
interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async (): Promise<void> => {
        try {
            setIsLoading(true);
            const loadedSettings = await window.electronAPI?.settings.getAll();
            if (loadedSettings) {
                // Merge with defaults to ensure all properties exist
                setSettings({ ...defaultSettings, ...loadedSettings });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Use defaults if loading fails
            setSettings(defaultSettings);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = async <K extends keyof AppSettings>(
        key: K, 
        value: AppSettings[K]
    ): Promise<void> => {
        try {
            // Update local state immediately for instant UI response
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);

            // Save to backend
            await window.electronAPI?.settings.update(key, value);
            
            // Trigger any component-specific updates based on the setting
            handleSettingChange(key, value);
        } catch (error) {
            console.error(`Failed to update setting ${key}:`, error);
            // Revert local state on error
            setSettings(settings);
            throw error;
        }
    };

    const resetSettings = async (): Promise<void> => {
        try {
            setIsLoading(true);
            // There's no resetSettings method in the API, so we'll reset by updating all settings to defaults
            for (const [key, value] of Object.entries(defaultSettings)) {
                if (key !== 'knownFolders') { // Skip known folders as they have their own reset method
                    await window.electronAPI?.settings.update(key as keyof AppSettings, value);
                }
            }
            await window.electronAPI?.settings.resetKnownFolders();
            setSettings(defaultSettings);
        } catch (error) {
            console.error('Failed to reset settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle specific setting changes that require immediate UI updates
    const handleSettingChange = (key: keyof AppSettings, value: any) => {
        switch (key) {
            case 'compactMode':
                // Update CSS custom property for compact mode
                document.documentElement.style.setProperty(
                    '--compact-mode', 
                    value ? '1' : '0'
                );
                break;
            
            case 'enableAnimations':
                // Trigger animations enable/disable
                document.documentElement.classList.toggle('no-animations', !value);
                break;
            
            case 'showThumbnails':
                // Trigger thumbnail visibility change
                document.documentElement.classList.toggle('no-thumbnails', !value);
                break;
            
            case 'fileSizeUnit':
                // Trigger file size display updates - components will re-render due to context change
                console.log(`File size unit changed to: ${value}`);
                break;
            
            case 'showHiddenFiles':
                // Trigger hidden files visibility change
                console.log(`Hidden files visibility changed to: ${value}`);
                break;
            
            default:
                // For other settings, the context change will trigger re-renders
                break;
        }
    };

    const contextValue: SettingsContextType = {
        settings,
        updateSetting,
        loadSettings,
        resetSettings,
        isLoading,
    };

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
};

// Hook to use settings context
export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// Export default settings for fallback use
export { defaultSettings };
