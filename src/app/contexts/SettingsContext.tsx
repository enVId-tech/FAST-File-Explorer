import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';

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
        // Apply initial CSS flags from defaults immediately
        document.documentElement.classList.toggle('no-animations', !defaultSettings.enableAnimations);
        document.documentElement.classList.toggle('no-thumbnails', !defaultSettings.showThumbnails);
        document.documentElement.style.setProperty('--compact-mode', defaultSettings.compactMode ? '1' : '0');
    }, []);

    const loadSettings = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);
            const loadedSettings = await window.electronAPI?.settings.getAll();
            if (loadedSettings) {
                // Merge with defaults to ensure all properties exist
                const merged = { ...defaultSettings, ...loadedSettings } as AppSettings;
                setSettings(merged);
                // Apply CSS flags for loaded settings
                document.documentElement.classList.toggle('no-animations', !merged.enableAnimations);
                document.documentElement.classList.toggle('no-thumbnails', !merged.showThumbnails);
                document.documentElement.style.setProperty('--compact-mode', merged.compactMode ? '1' : '0');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            setSettings(defaultSettings);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateSetting = useCallback(async <K extends keyof AppSettings>(
        key: K, 
        value: AppSettings[K]
    ): Promise<void> => {
        // Keep a snapshot for revert on failure
        const prev = settings;
        try {
            // Update local state immediately for instant UI response
            const newSettings = { ...settings, [key]: value } as AppSettings;
            setSettings(newSettings);

            // Save to backend
            await window.electronAPI?.settings.update(key, value);
            
            // Trigger any component-specific updates based on the setting
            handleSettingChange(key, value);
        } catch (error) {
            console.error(`Failed to update setting ${String(key)}:`, error);
            // Revert local state on error
            setSettings(prev);
            throw error as any;
        }
    }, [settings]);

    const resetSettings = useCallback(async (): Promise<void> => {
        try {
            setIsLoading(true);
            // Reset by updating all settings to defaults
            const entries = Object.entries(defaultSettings) as [keyof AppSettings, any][];
            for (const [key, value] of entries) {
                if (key !== 'knownFolders') {
                    await window.electronAPI?.settings.update(key, value);
                }
            }
            await window.electronAPI?.settings.resetKnownFolders();
            setSettings(defaultSettings);
            // Apply CSS flags
            document.documentElement.classList.toggle('no-animations', !defaultSettings.enableAnimations);
            document.documentElement.classList.toggle('no-thumbnails', !defaultSettings.showThumbnails);
            document.documentElement.style.setProperty('--compact-mode', defaultSettings.compactMode ? '1' : '0');
        } catch (error) {
            console.error('Failed to reset settings:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle specific setting changes that require immediate UI updates
    const handleSettingChange = useCallback((key: keyof AppSettings, value: any) => {
        switch (key) {
            case 'compactMode':
                document.documentElement.style.setProperty('--compact-mode', value ? '1' : '0');
                break;
            case 'enableAnimations':
                document.documentElement.classList.toggle('no-animations', !value);
                break;
            case 'showThumbnails':
                document.documentElement.classList.toggle('no-thumbnails', !value);
                break;
            default:
                break;
        }
    }, []);

    const contextValue: SettingsContextType = useMemo(() => ({
        settings,
        updateSetting,
        loadSettings,
        resetSettings,
        isLoading,
    }), [settings, updateSetting, loadSettings, resetSettings, isLoading]);

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
