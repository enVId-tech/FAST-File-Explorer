import { BrowserWindow, ipcMain } from 'electron';
import './windowHandlers';
import { initializeTabHandlers } from './tabHandlers';
import initializeFileHandlers from './fileHandlers';
import initializeFolderHandlers from '../folderHandler';

// Initialize all IPC handlers
export const initializeIpcHandlers = (mainWindow: BrowserWindow) => {
    console.log('Initializing all IPC handlers...');
    initializeTabHandlers(mainWindow);
    initializeFileHandlers();
    initializeFolderHandlers();
    console.log('All IPC handlers initialized successfully');
};
