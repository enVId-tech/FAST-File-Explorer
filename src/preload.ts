// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Generic IPC invoke method for flexibility
    invoke: <T = any>(channel: string, ...args: any[]): Promise<T> => 
        ipcRenderer.invoke(channel, ...args),
        
    testAPI: () => ipcRenderer.invoke('test-api'),
    
    window: {
        minimize: () => ipcRenderer.invoke('window-minimize'),
        maximize: () => ipcRenderer.invoke('window-maximize'),
        unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
        close: () => ipcRenderer.invoke('window-close'),
        getBounds: () => ipcRenderer.invoke('window-get-bounds'),
        setBounds: (bounds: {x?: number, y?: number, width?: number, height?: number}) => 
            ipcRenderer.invoke('window-set-bounds', bounds),
        addMaximizeListener: () => ipcRenderer.invoke('window-add-maximize-listener'),
        removeMaximizeListener: () => ipcRenderer.invoke('window-remove-maximize-listener'),
        onMaximizeChange: (callback: (event: any, maximized: boolean) => void) => {
            ipcRenderer.on('window-maximized', callback);
        },
    },
    tab: {
        add: (url: string) => ipcRenderer.invoke('tab-add', url),
        switch: (tabId: string) => ipcRenderer.invoke('tab-switch', tabId),
        close: (tabId: string) => ipcRenderer.invoke('tab-close', tabId),
        getActive: () => ipcRenderer.invoke('tab-get-active'),
        getAll: () => ipcRenderer.invoke('tab-get-all'),
        navigate: (tabId: string, url: string) => ipcRenderer.invoke('tab-navigate', tabId, url),
        reload: (tabId: string) => ipcRenderer.invoke('tab-reload', tabId),
        goBack: (tabId: string) => ipcRenderer.invoke('tab-go-back', tabId),
        goForward: (tabId: string) => ipcRenderer.invoke('tab-go-forward', tabId),
    },
    data: {
        create: (name: string) => ipcRenderer.invoke('data-create', name),
        delete: (id: string) => ipcRenderer.invoke('data-delete', id),
        rename: (id: string, newName: string) => ipcRenderer.invoke('data-rename', id, newName),
        getDirectory: (folderPath: string) => ipcRenderer.invoke('data-get-directory', folderPath),
        getMetadata: (dataPath: string) => ipcRenderer.invoke('data-get-metadata', dataPath),
        getDrives: () => ipcRenderer.invoke('data-get-drives'),
        getRecentFiles: () => ipcRenderer.invoke('data-get-recent-files'),
    },
    // Enhanced file system methods
    fs: {
        getDirectoryContents: (dirPath: string, options?: any) => 
            ipcRenderer.invoke('fs-get-directory-contents', dirPath, options),
        directoryExists: (dirPath: string) => 
            ipcRenderer.invoke('fs-directory-exists', dirPath),
        getParentDirectory: (dirPath: string) => 
            ipcRenderer.invoke('fs-get-parent-directory', dirPath),
        getKnownFolder: (folderType: string) => 
            ipcRenderer.invoke('fs-get-known-folder', folderType),
        getFolderMetadata: (folderPath: string) => 
            ipcRenderer.invoke('fs-get-folder-metadata', folderPath),
    },
    // Settings management
    settings: {
        getAll: () => ipcRenderer.invoke('settings-get-all'),
        getKnownFolders: () => ipcRenderer.invoke('settings-get-known-folders'),
        getKnownFolder: (folderType: string) => ipcRenderer.invoke('settings-get-known-folder', folderType),
        updateKnownFolder: (folderType: string, newPath: string) => 
            ipcRenderer.invoke('settings-update-known-folder', folderType, newPath),
        updateKnownFolders: (folders: any) => 
            ipcRenderer.invoke('settings-update-known-folders', folders),
        resetKnownFolders: () => ipcRenderer.invoke('settings-reset-known-folders'),
        validateFolder: (folderPath: string) => 
            ipcRenderer.invoke('settings-validate-folder', folderPath),
        update: (key: string, value: any) => 
            ipcRenderer.invoke('settings-update', key, value),
        getPath: () => ipcRenderer.invoke('settings-get-path'),
    },
    
    // System information
    system: {
        platform: process.platform,
        pathSeparator: process.platform === 'win32' ? '\\' : '/',
        openFile: (filePath: string) => ipcRenderer.invoke('system-open-file', filePath),
        openFileFast: (filePath: string) => ipcRenderer.send('system-open-file-fast', filePath)
    }
});