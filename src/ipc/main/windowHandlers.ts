import { ipcMain, BrowserWindow } from 'electron';

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
