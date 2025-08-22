import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

/**
 * Central navigation utilities for file explorer operations
 * Provides consistent navigation methods across all components
 */

export interface NavigationOptions {
    addToHistory?: boolean;
    validatePath?: boolean;
    showLoadingIndicator?: boolean;
}

export interface NavigationState {
    currentPath: string;
    history: string[];
    historyIndex: number;
    canGoBack: boolean;
    canGoForward: boolean;
}

export class NavigationUtils {
    /**
     * Navigate to a specific path
     */
    static async navigateToPath(
        path: string, 
        setCurrentPath: (path: string) => void,
        setCurrentView: (view: 'thispc' | 'recents' | 'folder') => void,
        options: NavigationOptions = {}
    ): Promise<boolean> {
        try {
            if (options.validatePath && !await this.validatePath(path)) {
                console.error(`Invalid path: ${path}`);
                return false;
            }

            setCurrentPath(path);
            setCurrentView('folder');
            return true;
        } catch (error) {
            console.error('Navigation failed:', error);
            return false;
        }
    }

    /**
     * Navigate to parent directory
     */
    static async navigateUp(
        currentPath: string,
        setCurrentPath: (path: string) => void,
        setCurrentView: (view: 'thispc' | 'recents' | 'folder') => void
    ): Promise<boolean> {
        if (!currentPath) return false;

        try {
            const parentPath = await window.electronAPI.fs.getParentDirectory(currentPath);
            if (parentPath) {
                return await this.navigateToPath(parentPath, setCurrentPath, setCurrentView);
            }
            return false;
        } catch (error) {
            console.error('Failed to navigate up:', error);
            return false;
        }
    }

    /**
     * Navigate to known folder (Documents, Downloads, etc.)
     */
    static async navigateToKnownFolder(
        folderType: string,
        setCurrentPath: (path: string) => void,
        setCurrentView: (view: 'thispc' | 'recents' | 'folder') => void
    ): Promise<boolean> {
        try {
            const path = await window.electronAPI.settings.getKnownFolder(folderType);
            if (path) {
                return await this.navigateToPath(path, setCurrentPath, setCurrentView);
            }
            return false;
        } catch (error) {
            console.error(`Failed to navigate to ${folderType}:`, error);
            return false;
        }
    }

    /**
     * Navigate to This PC view
     */
    static navigateToThisPC(
        setCurrentView: (view: 'thispc' | 'recents' | 'folder') => void,
        setCurrentPath: (path: string) => void
    ): void {
        setCurrentView('thispc');
        setCurrentPath('');
    }

    /**
     * Navigate to Recents view
     */
    static navigateToRecents(
        setCurrentView: (view: 'thispc' | 'recents' | 'folder') => void,
        setCurrentPath: (path: string) => void
    ): void {
        setCurrentView('recents');
        setCurrentPath('');
    }

    /**
     * Validate if a path exists and is accessible
     */
    static async validatePath(path: string): Promise<boolean> {
        try {
            return await window.electronAPI.fs.directoryExists(path);
        } catch (error) {
            console.error('Path validation failed:', error);
            return false;
        }
    }

    /**
     * Generate breadcrumbs from a path
     */
    static generateBreadcrumbs(currentPath: string): { name: string; path: string }[] {
        if (!currentPath) return [];

        const parts = currentPath.split(/[\\\\/]/).filter(Boolean);
        const breadcrumbs = [];

        let currentPathBuild = '';
        if (window.electronAPI.system.platform === 'win32' && parts[0]?.includes(':')) {
            // Windows drive
            currentPathBuild = parts[0] + '\\';
            breadcrumbs.push({ name: parts[0], path: currentPathBuild });
            parts.shift();
        }

        parts.forEach((part) => {
            currentPathBuild = currentPathBuild.endsWith('/') || currentPathBuild.endsWith('\\')
                ? currentPathBuild + part
                : currentPathBuild + (window.electronAPI.system.platform === 'win32' ? '\\' : '/') + part;
            breadcrumbs.push({ name: part, path: currentPathBuild });
        });

        return breadcrumbs;
    }
}

/**
 * React hook for navigation state management
 */
export function useNavigation() {
    const [currentPath, setCurrentPath] = React.useState<string>('');
    const [currentView, setCurrentView] = React.useState<'thispc' | 'recents' | 'folder'>('thispc');
    const [navigationHistory, setNavigationHistory] = React.useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
    const { settings } = useSettings();
    const maxHistory = settings?.maxNavigationHistory ?? 50;

    // Trim history if the max size is reduced
    React.useEffect(() => {
        if (navigationHistory.length > maxHistory) {
            const overflow = navigationHistory.length - maxHistory;
            const trimmed = navigationHistory.slice(overflow);
            const newIndex = Math.max(-1, historyIndex - overflow);
            setNavigationHistory(trimmed);
            setHistoryIndex(newIndex);
        }
    }, [maxHistory]);

    const navigateToPath = React.useCallback(async (path: string, options?: NavigationOptions) => {
        const success = await NavigationUtils.navigateToPath(path, setCurrentPath, setCurrentView, options);
        
        if (success && options?.addToHistory !== false) {
        const base = navigationHistory.slice(0, historyIndex + 1);
        const appended = [...base, path];
        // Cap history according to settings
        const capped = appended.length > maxHistory ? appended.slice(appended.length - maxHistory) : appended;
        // Adjust index when trimming from the front
        const trimmed = appended.length > maxHistory ? maxHistory - 1 : capped.length - 1;
        setNavigationHistory(capped);
        setHistoryIndex(trimmed);
        }
        
        return success;
    }, [navigationHistory, historyIndex, maxHistory]);

    const navigateBack = React.useCallback(() => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setCurrentPath(navigationHistory[newIndex]);
            setCurrentView('folder');
        }
    }, [navigationHistory, historyIndex]);

    const navigateForward = React.useCallback(() => {
        if (historyIndex < navigationHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setCurrentPath(navigationHistory[newIndex]);
            setCurrentView('folder');
        }
    }, [navigationHistory, historyIndex]);

    const navigateUp = React.useCallback(async () => {
        if (!currentPath) return false;
        try {
            const parentPath = await window.electronAPI.fs.getParentDirectory(currentPath);
            if (parentPath) {
                return await navigateToPath(parentPath, { addToHistory: true });
            }
            return false;
        } catch (e) {
            console.error('Failed to navigate up:', e);
            return false;
        }
    }, [currentPath, navigateToPath]);

    const navigateToKnownFolder = React.useCallback(async (folderType: string) => {
        const path = await window.electronAPI.settings.getKnownFolder(folderType);
        if (path) {
            return await navigateToPath(path, { addToHistory: true });
        }
        return false;
    }, [navigateToPath]);

    const navigateToThisPC = React.useCallback(() => {
        NavigationUtils.navigateToThisPC(setCurrentView, setCurrentPath);
        // This is a view change, not a filesystem path; do not push to path history
    }, []);

    const navigateToRecents = React.useCallback(() => {
        NavigationUtils.navigateToRecents(setCurrentView, setCurrentPath);
        // Also a view change; not part of path history
    }, []);

    const clearHistory = React.useCallback(() => {
        setNavigationHistory([]);
        setHistoryIndex(-1);
    }, []);

    const navigationState: NavigationState = {
        currentPath,
        history: navigationHistory,
        historyIndex,
        canGoBack: historyIndex > 0,
        canGoForward: historyIndex < navigationHistory.length - 1
    };

    return {
        // State
        currentPath,
        currentView,
        navigationState,
        // Actions
        navigateToPath,
        navigateBack,
        navigateForward,
        navigateUp,
        navigateToKnownFolder,
    navigateToThisPC,
    navigateToRecents,
    clearHistory,
        // Manual state setters (for advanced use cases)
        setCurrentPath,
        setCurrentView
    };
}
