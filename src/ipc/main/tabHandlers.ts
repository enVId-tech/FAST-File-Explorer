import { ipcMain, BrowserWindow } from 'electron';
import { TabManager } from '../functions/tabs';

let tabs: TabManager[] = [];
let mainWindow: BrowserWindow | null = null;

export const initializeTabHandlers = (window: BrowserWindow) => {
    mainWindow = window;

    // TODO: Re-enable when internal:home is implemented
    // Create initial home tab
    // TabManager.addTab(tabs, mainWindow, 'internal:home');
};

// Tab management IPC handlers
ipcMain.handle('tab-add', async (event, url: string) => {
    if (!mainWindow) return null;

    const newTab = TabManager.addTab(tabs, mainWindow, url);
    return {
        id: newTab.id,
        title: newTab.title,
        url: newTab.url
    };
});

ipcMain.handle('tab-switch', async (event, tabId: string) => {
    if (!mainWindow) return null;

    const tab = TabManager.switchToTab(tabs, tabId, mainWindow);
    return tab ? {
        id: tab.id,
        title: tab.title,
        url: tab.url
    } : null;
});

ipcMain.handle('tab-close', async (event, tabId: string) => {
    if (!mainWindow) return [];

    const updatedTabs = TabManager.closeTab(tabs, tabId, mainWindow);
    tabs.length = 0;
    tabs.push(...updatedTabs);

    return updatedTabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url
    }));
});

ipcMain.handle('tab-get-active', async () => {
    const activeTab = TabManager.getActiveTab(tabs);
    return activeTab ? {
        id: activeTab.id,
        title: activeTab.title,
        url: activeTab.url
    } : null;
});

ipcMain.handle('tab-get-all', async () => {
    return TabManager.getAllTabs(tabs);
});

ipcMain.handle('tab-navigate', async (event, tabId: string, url: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.navigateTo(url);
        return true;
    }
    return false;
});

ipcMain.handle('tab-reload', async (event, tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.reload();
        return true;
    }
    return false;
});

ipcMain.handle('tab-go-back', async (event, tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    return tab ? tab.goBack() : false;
});

ipcMain.handle('tab-go-forward', async (event, tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    return tab ? tab.goForward() : false;
});

export { tabs };
