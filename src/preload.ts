// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    testAPI: () => ipcRenderer.invoke('test'),
    window: {
        minimize: () => ipcRenderer.invoke('window-minimize'),
        maximize: () => ipcRenderer.invoke('window-maximize'),
        unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
        close: () => ipcRenderer.invoke('window-close'),
    },
    // Tab management APIs
    tabAdd: (url: string) => ipcRenderer.invoke('tab-add', url),
    tabSwitch: (tabId: string) => ipcRenderer.invoke('tab-switch', tabId),
    tabClose: (tabId: string) => ipcRenderer.invoke('tab-close', tabId),
    tabGetActive: () => ipcRenderer.invoke('tab-get-active'),
    tabGetAll: () => ipcRenderer.invoke('tab-get-all'),
    tabNavigate: (tabId: string, url: string) => ipcRenderer.invoke('tab-navigate', tabId, url),
    tabReload: (tabId: string) => ipcRenderer.invoke('tab-reload', tabId),
    tabGoBack: (tabId: string) => ipcRenderer.invoke('tab-go-back', tabId),
    tabGoForward: (tabId: string) => ipcRenderer.invoke('tab-go-forward', tabId),
});