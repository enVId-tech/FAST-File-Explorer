import { useState, useEffect, useCallback } from 'react';

// Types for settings
interface KnownFolderSettings {
  home: string;
  desktop: string;
  documents: string;
  downloads: string;
  pictures: string;
  music: string;
  videos: string;
  [key: string]: string;
}

interface AppSettings {
  knownFolders: KnownFolderSettings;
  theme: string;
  viewMode: string;
  zoomLevel: number;
  version: string;
}

/**
 * React hook for managing application settings
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all settings
  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedSettings = await window.electronAPI?.settings?.getAll();
      setSettings(loadedSettings);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
      console.error('Settings load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Get known folder path
  const getKnownFolder = useCallback(async (folderType: string): Promise<string | null> => {
    try {
      return await window.electronAPI?.settings?.getKnownFolder(folderType);
    } catch (err: any) {
      console.error(`Failed to get known folder ${folderType}:`, err);
      return null;
    }
  }, []);

  // Update known folder
  const updateKnownFolder = useCallback(async (folderType: string, newPath: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI?.settings?.updateKnownFolder(folderType, newPath);
      if (result?.success) {
        // Reload settings to get the updated values
        await loadSettings();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to update folder');
      console.error(`Failed to update known folder ${folderType}:`, err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadSettings]);

  // Update multiple known folders
  const updateKnownFolders = useCallback(async (folders: Partial<KnownFolderSettings>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI?.settings?.updateKnownFolders(folders);
      if (result?.success) {
        await loadSettings();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to update folders');
      console.error('Failed to update known folders:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadSettings]);

  // Reset known folders to defaults
  const resetKnownFolders = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI?.settings?.resetKnownFolders();
      if (result?.success) {
        await loadSettings();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to reset folders');
      console.error('Failed to reset known folders:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadSettings]);

  // Validate folder path
  const validateFolder = useCallback(async (folderPath: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      return await window.electronAPI?.settings?.validateFolder(folderPath) || { valid: false, error: 'Validation failed' };
    } catch (err: any) {
      return { valid: false, error: err.message || 'Validation failed' };
    }
  }, []);

  // Update general setting
  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<boolean> => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI?.settings?.update(key, value);
      if (result?.success) {
        await loadSettings();
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to update setting');
      console.error(`Failed to update setting ${key}:`, err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    error,
    loadSettings,
    getKnownFolder,
    updateKnownFolder,
    updateKnownFolders,
    resetKnownFolders,
    validateFolder,
    updateSetting,
  };
};

// Export types for use in other components
export type { AppSettings, KnownFolderSettings };
