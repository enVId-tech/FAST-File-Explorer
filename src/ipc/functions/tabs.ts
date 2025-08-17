import { WebContentsView, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

class TabManager {
    id: string;
    view: WebContentsView;
    mainWindow: BrowserWindow;
    url: string;
    title: string;
    isActive: boolean = false;

    constructor(
        id: string,
        mainWindow: BrowserWindow,
        view: WebContentsView,
        url: string,
        title: string
    ) {
        this.id = id;
        this.mainWindow = mainWindow;
        this.view = view;
        this.url = url;
        this.title = title;
        this.isActive = false;
    }

    public static addTab(tabs: TabManager[], mainWindow: BrowserWindow, url: string): TabManager {
        const view = new WebContentsView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
            },
        });
        const tabId = `tab-${tabs.length + 1}`;

        const newTab = new TabManager(tabId, mainWindow, view, url, 'New Tab');
        tabs.push(newTab);
        mainWindow.contentView.addChildView(newTab.view);
        const bounds = mainWindow.getBounds();
        newTab.view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
        newTab.view.webContents.loadURL(url);

        return newTab;
    }

    public static switchToTab(tabs: TabManager[], tabId: string, mainWindow: BrowserWindow): TabManager | null {
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) return null;

        // Update active state for all tabs
        tabs.forEach(t => {
            t.isActive = t.id === tabId;
            t.view.setVisible(t.id === tabId);
        });

        // Show the selected tab
        const bounds = mainWindow.getBounds();
        tab.view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });

        return tab;
    }

    public static closeTab(tabs: TabManager[], tabId: string, mainWindow: BrowserWindow): TabManager[] {
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return tabs;

        const tab = tabs[tabIndex];

        // Remove the view from the window
        mainWindow.contentView.removeChildView(tab.view);

        // Close the webContents to free memory
        if (!tab.view.webContents.isDestroyed()) {
            tab.view.webContents.close();
        }

        // Remove from tabs array
        const newTabs = tabs.filter(t => t.id !== tabId);

        // If there are remaining tabs, show the last one or the previous one
        if (newTabs.length > 0) {
            const nextTabIndex = Math.min(tabIndex, newTabs.length - 1);
            TabManager.switchToTab(newTabs, newTabs[nextTabIndex].id, mainWindow);
        }

        return newTabs;
    }

    public static getActiveTab(tabs: TabManager[]): TabManager | null {
        return tabs.find(tab => tab.isActive) || null;
    }

    public static getAllTabs(tabs: TabManager[]): { id: string, title: string, url: string }[] {
        return tabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            url: tab.url
        }));
    }

    public updateTitle(newTitle: string): void {
        this.title = newTitle;
    }

    public updateUrl(newUrl: string): void {
        this.url = newUrl;
    }

    public reload(): void {
        if (!this.view.webContents.isDestroyed()) {
            this.view.webContents.reload();
        }
    }

    public goBack(): boolean {
        if (!this.view.webContents.isDestroyed() && this.view.webContents.canGoBack()) {
            this.view.webContents.goBack();
            return true;
        }
        return false;
    }

    public async goForward(): Promise<boolean> {
        if (!this.view.webContents.isDestroyed() && this.view.webContents.canGoForward()) {
            await this.view.webContents.goForward();
            return true;
        }
        return false;
    }

    public navigateTo(url: string): void {
        if (!this.view.webContents.isDestroyed()) {
            this.view.webContents.loadURL(url);
            this.updateUrl(url);
        }
    }

    public isDestroyed(): boolean {
        return this.view.webContents.isDestroyed();
    }
}

export { TabManager };