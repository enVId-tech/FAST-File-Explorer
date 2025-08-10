import { ipcMain, BrowserWindow } from 'electron';

// Store maximize event listeners for cleanup
const maximizeListeners = new Map<number, (maximized: boolean) => void>();

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
    
    // Remove existing listener if any
    if (maximizeListeners.has(windowId)) {
        const existingListener = maximizeListeners.get(windowId)!;
        window.removeListener('maximize', existingListener as any);
        window.removeListener('unmaximize', existingListener as any);
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
    
    // Store for cleanup (store the maximize listener as reference)
    maximizeListeners.set(windowId, maximizeListener);
    
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
        const listener = maximizeListeners.get(windowId)!;
        window.removeListener('maximize', listener as any);
        window.removeListener('unmaximize', listener as any);
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

ipcMain.handle('window-set-bounds', (event, bounds: {x?: number, y?: number, width?: number, height?: number}) => {
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
