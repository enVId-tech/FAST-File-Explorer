import { BrowserWindow, ipcMain } from 'electron';
import './windowHandlers';
import { initializeTabHandlers } from './tabHandlers';
import initializeDataHandlers from './dataHandlers';
import { initializeSettingsHandlers } from './settingsHandlers';

// Initialize all IPC handlers
export const initializeIpcHandlers = (mainWindow: BrowserWindow) => {
    console.log('Initializing all IPC handlers...');
    initializeTabHandlers(mainWindow);
    initializeDataHandlers();
    initializeSettingsHandlers();
    console.log('All IPC handlers initialized successfully');
};
