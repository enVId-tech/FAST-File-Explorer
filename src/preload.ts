// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    window: {
        minimize: () => ipcRenderer.invoke('window-minimize'),
        maximize: () => ipcRenderer.invoke('window-maximize'),
        unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
        close: () => ipcRenderer.invoke('window-close'),
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
    folders: {
        create: (name: string) => ipcRenderer.invoke('folder-create', name),
        delete: (id: string) => ipcRenderer.invoke('folder-delete', id),
        rename: (id: string, newName: string) => ipcRenderer.invoke('folder-rename', id, newName),
        getAll: (folderPath: string) => ipcRenderer.invoke('folder-get-all', folderPath),
        get: (folderPath: string) => ipcRenderer.invoke('folder-get', folderPath),
    },
    files: {
        create: (name: string) => ipcRenderer.invoke('file-create', name),
        delete: (id: string) => ipcRenderer.invoke('file-delete', id),
        rename: (id: string, newName: string) => ipcRenderer.invoke('file-rename', id, newName),
        getAll: (filePath: string) => ipcRenderer.invoke('file-get-all', filePath),
        get: (filePath: string) => ipcRenderer.invoke('file-get', filePath),
    }
});