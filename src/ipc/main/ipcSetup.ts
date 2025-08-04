import { BrowserWindow, ipcMain } from 'electron';
import './windowHandlers';
import { initializeTabHandlers } from './tabHandlers';

// Essential IPC handlers that stay in main.ts
export const setupEssentialHandlers = () => {
    // Test handler for development
    ipcMain.handle('test', async () => {
        console.log('Received from renderer:');
        // Simulate some processing and return a response
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Test IPC called');
        return 'Test response from main process';
    });
};

// Initialize all IPC handlers
export const initializeIpcHandlers = (mainWindow: BrowserWindow) => {
    setupEssentialHandlers();
    initializeTabHandlers(mainWindow);
};
