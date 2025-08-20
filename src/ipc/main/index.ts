// Export all IPC handler modules for clean imports
export { registerFileSystemHandlers } from './fileSystemHandlers';
export { registerFileOperationsHandlers } from './fileOperationsHandlers';
export { registerClipboardHandlers } from './clipboardHandlers';
export { registerSystemHandlers, platform } from './systemHandlers';
export { registerDriveHandlers } from './driveHandlers';
export { registerNavigationHandlers } from './navigationHandlers';

// Re-export optimized functions
export { getCachedResult, setCachedResult, listDirectoryContents, getFolderMetadata } from '../functions/dataFuncs.optimized';

// Main initialization function
export { default as initializeDataHandlers } from './dataHandlers.new';
