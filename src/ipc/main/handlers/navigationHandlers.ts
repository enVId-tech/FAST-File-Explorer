import { ipcMain } from 'electron';
import path from 'path';
import { settingsManager } from '../../functions/settingsManager';
import { dataExists } from '../../functions/dataFuncs';

/**
 * Navigation IPC handlers for centralized navigation operations
 */
export function registerNavigationHandlers(): void {
    console.log('Registering navigation handlers...');

    // Navigate to a specific path with validation
    ipcMain.handle('navigation-to-path', async (event, targetPath: string) => {
        try {
            // Validate path exists and is accessible
            const exists = await dataExists(targetPath);
            if (!exists) {
                return {
                    success: false,
                    error: `Path does not exist or is not accessible: ${targetPath}`
                };
            }

            return {
                success: true,
                path: targetPath
            };
        } catch (error) {
            console.error('Navigation to path failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Navigation failed'
            };
        }
    });

    // Navigate to a known folder (Documents, Downloads, etc.)
    ipcMain.handle('navigation-to-known-folder', async (event, folderType: string) => {
        try {
            const folderPath = await settingsManager.getKnownFolder(folderType);
            
            // Validate the known folder path exists
            const exists = await dataExists(folderPath);
            if (!exists) {
                return {
                    success: false,
                    error: `Known folder '${folderType}' does not exist: ${folderPath}`
                };
            }

            return {
                success: true,
                path: folderPath
            };
        } catch (error) {
            console.error(`Navigation to known folder '${folderType}' failed:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Navigation to known folder failed'
            };
        }
    });

    // Navigate up to parent directory
    ipcMain.handle('navigation-up', async (event, currentPath: string) => {
        try {
            if (!currentPath) {
                return {
                    success: false,
                    error: 'No current path provided'
                };
            }

            const parentPath = path.dirname(currentPath);
            
            // Check if we're already at the root
            if (parentPath === currentPath) {
                return {
                    success: false,
                    error: 'Already at root directory'
                };
            }

            // Validate parent directory exists
            const exists = await dataExists(parentPath);
            if (!exists) {
                return {
                    success: false,
                    error: `Parent directory does not exist: ${parentPath}`
                };
            }

            return {
                success: true,
                path: parentPath
            };
        } catch (error) {
            console.error('Navigation up failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Navigation up failed'
            };
        }
    });

    // Validate if a path exists and is accessible
    ipcMain.handle('navigation-validate-path', async (event, targetPath: string) => {
        try {
            return await dataExists(targetPath);
        } catch (error) {
            console.error('Path validation failed:', error);
            return false;
        }
    });

    // Generate breadcrumbs for a path
    ipcMain.handle('navigation-generate-breadcrumbs', async (event, currentPath: string) => {
        try {
            if (!currentPath) return [];

            const parts = currentPath.split(/[\\\\/]/).filter(Boolean);
            const breadcrumbs = [];

            let currentPathBuild = '';
            
            // Handle Windows drive letters
            if (process.platform === 'win32' && parts[0]?.includes(':')) {
                currentPathBuild = parts[0] + '\\';
                breadcrumbs.push({ name: parts[0], path: currentPathBuild });
                parts.shift();
            }

            // Build breadcrumbs for each path segment
            parts.forEach((part) => {
                currentPathBuild = currentPathBuild.endsWith('/') || currentPathBuild.endsWith('\\')
                    ? currentPathBuild + part
                    : currentPathBuild + (process.platform === 'win32' ? '\\' : '/') + part;
                breadcrumbs.push({ name: part, path: currentPathBuild });
            });

            return breadcrumbs;
        } catch (error) {
            console.error('Breadcrumb generation failed:', error);
            return [];
        }
    });
}
