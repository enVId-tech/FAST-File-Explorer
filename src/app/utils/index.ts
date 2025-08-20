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
    type FileOperationCallbacks
} from './FileOperations';

// UI utilities and hooks
export {
    useKeyboardShortcuts,
    useFileSelection,
    useFileExplorerUI,
    generateContextMenuItems,
    type KeyboardShortcuts,
    type UIOperationHandlers
} from './UIUtils';

// Modern components (removed: unused experimental components)

// Re-export commonly used types
export type { FileSystemItem, DirectoryContents } from '../../shared/ipc-channels';

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
 * // For static utilities:
 * import { NavigationUtils, FileOperations } from './utils';
 * await NavigationUtils.navigateToKnownFolder('documents', setPath, setView);
 * await FileOperations.copyFiles(selectedFiles);
 */
