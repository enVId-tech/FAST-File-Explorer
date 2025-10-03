import { BrowserWindow } from 'electron';
import './handlers/windowHandlers';
import { initializeTabHandlers } from './handlers/tabHandlers';
import { initializeDataHandlers } from './index'; // Use new modular system
import { initializeSettingsHandlers } from './handlers/settingsHandlers';
import { registerTransferHandlers } from './handlers/transferHandlers';

// Initialize all IPC handlers with optimized modular architecture
export const initializeIpcHandlers = (mainWindow: BrowserWindow) => {
    console.log('Initializing optimized IPC handlers...');
    initializeTabHandlers(mainWindow);
    initializeDataHandlers(); // Now uses modular system
    initializeSettingsHandlers();
    registerTransferHandlers(); // Register fast-transferlib handlers
    console.log('All IPC handlers initialized successfully with enhanced performance');
};
