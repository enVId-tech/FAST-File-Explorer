// Export all IPC handler modules for clean imports
export { registerFileSystemHandlers } from './handlers/fileSystemHandlers';
export { registerFileOperationsHandlers } from './handlers/fileOperationsHandlers';
export { registerClipboardHandlers } from './handlers/clipboardHandlers';
export { registerSystemHandlers, platform } from './handlers/systemHandlers';
export { registerDriveHandlers } from './handlers/driveHandlers';
export { registerNavigationHandlers } from './handlers/navigationHandlers';

// Re-export optimized functions
export { getCachedResult, setCachedResult, listDirectoryContents, getFolderMetadata } from '../functions/dataFuncs.optimized';

// Main initialization function
export { default as initializeDataHandlers } from './handlers/dataHandlers.new';
