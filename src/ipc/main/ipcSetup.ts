import { BrowserWindow } from 'electron';
import './windowHandlers';
import { initializeTabHandlers } from './tabHandlers';
import { initializeDataHandlers } from './index'; // Use new modular system
import { initializeSettingsHandlers } from './settingsHandlers';

// Initialize all IPC handlers with optimized modular architecture
export const initializeIpcHandlers = (mainWindow: BrowserWindow) => {
    console.log('Initializing optimized IPC handlers...');
    initializeTabHandlers(mainWindow);
    initializeDataHandlers(); // Now uses modular system
    initializeSettingsHandlers();
    console.log('All IPC handlers initialized successfully with enhanced performance');
};
