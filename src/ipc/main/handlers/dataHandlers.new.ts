import { registerFileSystemHandlers } from './fileSystemHandlers';
import { registerFileOperationsHandlers } from './fileOperationsHandlers';
import { registerClipboardHandlers } from './clipboardHandlers';
import { registerSystemHandlers } from './systemHandlers';
import { registerDriveHandlers } from './driveHandlers';
import { registerNavigationHandlers } from './navigationHandlers';

/**
 * Initialize all data handlers for the IPC communication
 * Modular approach for better maintainability and performance
 */
export default function initializeDataHandlers(): void {
    console.log('Initializing enhanced modular data handlers...');

    // Register all handler modules
    registerFileSystemHandlers();
    registerFileOperationsHandlers();
    registerClipboardHandlers();
    registerSystemHandlers();
    registerDriveHandlers();
    registerNavigationHandlers();

    console.log('All data handlers initialized successfully');
}
