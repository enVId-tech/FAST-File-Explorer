import { ipcMain, BrowserWindow } from 'electron';

// Store maximize event listeners for cleanup
const maximizeListeners = new Map<number, {
    maximizeListener: () => void;
    unmaximizeListener: () => void;
}>();

// Track which windows have been set up for cleanup
const cleanupSetupWindows = new Set<number>();

// Clean up listeners when window is closed
const setupWindowCleanup = (window: BrowserWindow) => {
    const windowId = window.id;
    
    // Only set up cleanup once per window
    if (cleanupSetupWindows.has(windowId)) {
        return;
    }
    cleanupSetupWindows.add(windowId);
    
    // Increase max listeners to prevent warnings
    window.setMaxListeners(20);
    
    // Clean up when window is closed
    window.once('closed', () => {
        if (maximizeListeners.has(windowId)) {
            maximizeListeners.delete(windowId);
        }
        cleanupSetupWindows.delete(windowId);
    });
};

// Export the cleanup function for use in main process
export { setupWindowCleanup };

// Window control IPC handlers
ipcMain.handle('window-minimize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.minimize();
    }
});

ipcMain.handle('window-maximize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.maximize();
    }
});

ipcMain.handle('window-unmaximize', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.unmaximize();
    }
});

ipcMain.handle('window-close', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.close();
    }
});

// Add maximize state change listener
ipcMain.handle('window-add-maximize-listener', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;

    const windowId = window.id;
    
    // Set up cleanup for this window if not already done
    setupWindowCleanup(window);

    // Remove existing listener if any
    if (maximizeListeners.has(windowId)) {
        const existingListeners = maximizeListeners.get(windowId)!;
        window.removeListener('maximize', existingListeners.maximizeListener);
        window.removeListener('unmaximize', existingListeners.unmaximizeListener);
        maximizeListeners.delete(windowId);
    }

    // Create new listener
    const maximizeListener = () => {
        window.webContents.send('window-maximized', true);
    };

    const unmaximizeListener = () => {
        window.webContents.send('window-maximized', false);
    };

    // Add listeners
    window.on('maximize', maximizeListener);
    window.on('unmaximize', unmaximizeListener);

    // Store both listeners for cleanup
    maximizeListeners.set(windowId, { maximizeListener, unmaximizeListener });

    // Send initial state
    window.webContents.send('window-maximized', window.isMaximized());

    return true;
});

// Remove maximize state change listener
ipcMain.handle('window-remove-maximize-listener', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;

    const windowId = window.id;

    if (maximizeListeners.has(windowId)) {
        const listeners = maximizeListeners.get(windowId)!;
        window.removeListener('maximize', listeners.maximizeListener);
        window.removeListener('unmaximize', listeners.unmaximizeListener);
        maximizeListeners.delete(windowId);
        return true;
    }

    return false;
});

ipcMain.handle('window-get-bounds', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        return focusedWindow.getBounds();
    }
    return { x: 0, y: 0, width: 1200, height: 800 };
});

ipcMain.handle('window-set-bounds', (event, bounds: { x?: number, y?: number, width?: number, height?: number }) => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        // Set bounds immediately without animation
        focusedWindow.setBounds(bounds, false); // Second parameter disables animation on some platforms

        // Force immediate layout update
        focusedWindow.setSize(bounds.width || focusedWindow.getBounds().width,
            bounds.height || focusedWindow.getBounds().height,
            false); // false = no animation

        if (bounds.x !== undefined && bounds.y !== undefined) {
            focusedWindow.setPosition(bounds.x, bounds.y, false); // false = no animation
        }
    }
});
