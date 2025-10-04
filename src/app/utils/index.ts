// Central export for all file explorer utilities
// Import everything you need from this single file

// Navigation utilities
export {
    NavigationUtils,
    type NavigationOptions,
    type NavigationState
} from './NavigationUtils';
// Re-export the context-based hook so consumers use the shared navigation state
export { useNavigation } from '../contexts/NavigationContext';

// File operation utilities
export {
    FileOperations,
    useFileOperations,
    type FileOperationResult,
    type ClipboardState,
    type FileOperationCallbacks,
    type FileOperationOptions
} from './FileOperations';

// Advanced transfer operations (fast-transferlib integration)
export {
    TransferManager,
    useTransferManager,
    type TransferManagerCallbacks
} from './TransferManager';

// UI utilities and hooks
export {
    useKeyboardShortcuts,
    useFileSelection,
    useFileExplorerUI,
    generateContextMenuItems,
    type KeyboardShortcuts,
    type UIOperationHandlers
} from './UIUtils';

// Cache manager
export {
    cacheManager,
    default as CacheManager,
    type CacheConfig,
    type CacheStats
} from './CacheManager';

// Keyboard shortcuts
export {
    KeyboardShortcutManager,
    useKeyboardShortcuts as useKeyboardShortcutsAdvanced,
    type KeyboardShortcutHandlers
} from './KeyboardShortcuts';

// Search utilities
export {
    debounce,
    binarySearchFiles,
    searchFilesByPrefix,
    fuzzySearchFiles,
    advancedSearchFiles,
    highlightSearchTerm,
    createDebouncedSearch,
    SearchCache
} from './SearchUtils';

// Modern components (removed: unused experimental components)

// Re-export commonly used types
export type { FileSystemItem, DirectoryContents } from '../../shared/ipc-channels';
export type { TransferProgress, TransferOptions, TransferResult, TransferInfo } from '../../shared/transfer-types';

/**
 * Quick start examples:
 * 
 * // For comprehensive file explorer functionality:
 * import { useFileExplorerUI } from './utils';
 * const fileExplorer = useFileExplorerUI(onRefresh);
 * 
 * // For navigation only:
 * import { useNavigation } from './utils';
 * const navigation = useNavigation();
 * 
 * // For file operations only:
 * import { useFileOperations } from './utils';
 * const fileOps = useFileOperations(onRefresh);
 * 
 * // For advanced transfer with progress tracking:
 * import { useTransferManager } from './utils';
 * const { copyFiles, activeTransfers, isRsyncAvailable } = useTransferManager();
```
 * 
 * // For static utilities:
 * import { NavigationUtils, FileOperations } from './utils';
 * await NavigationUtils.navigateToKnownFolder('documents', setPath, setView);
 * await FileOperations.copyFiles(selectedFiles);
 */
