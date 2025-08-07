import { BrowserWindow, ipcMain } from 'electron';
import './windowHandlers';
import { initializeTabHandlers } from './tabHandlers';
import initializeDataHandlers from './dataHandlers';

// Initialize all IPC handlers
export const initializeIpcHandlers = (mainWindow: BrowserWindow) => {
    console.log('Initializing all IPC handlers...');
    initializeTabHandlers(mainWindow);
    initializeDataHandlers();
    console.log('All IPC handlers initialized successfully');
};
