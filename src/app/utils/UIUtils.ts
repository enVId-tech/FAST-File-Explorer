import React from 'react';
import { FileSystemItem } from '../../shared/ipc-channels';
import { FileOperations, useFileOperations } from './FileOperations';
import { NavigationUtils } from './NavigationUtils';
import { useNavigation } from '../contexts/NavigationContext';

/**
 * Combined UI utilities for file explorer components
 * Provides keyboard shortcuts, context menu handling, and common UI operations
 */

export interface KeyboardShortcuts {
    onCopy?: () => void;
    onCut?: () => void;
    onPaste?: () => void;
    onDelete?: () => void;
    onRename?: () => void;
    onSelectAll?: () => void;
    onRefresh?: () => void;
    onNavigateUp?: () => void;
    onNavigateBack?: () => void;
    onNavigateForward?: () => void;
}

export interface UIOperationHandlers {
    handleItemClick: (item: FileSystemItem, event?: React.MouseEvent) => void;
    handleItemDoubleClick: (item: FileSystemItem) => void;
    handleBackgroundClick: (event: React.MouseEvent) => void;
    handleContextMenu: (event: React.MouseEvent, item?: FileSystemItem) => void;
    handleKeyboardShortcuts: (event: KeyboardEvent) => void;
}

/**
 * Custom hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(
    selectedFiles: FileSystemItem[],
    shortcuts: KeyboardShortcuts,
    enabled: boolean = true
) {
    const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
        // Prevent shortcuts when typing in input fields
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
        }

        if (event.ctrlKey && !event.shiftKey && !event.altKey) {
            switch (event.key.toLowerCase()) {
                case 'c':
                    if (selectedFiles.length > 0) {
                        event.preventDefault();
                        shortcuts.onCopy?.();
                    }
                    break;
                case 'x':
                    if (selectedFiles.length > 0) {
                        event.preventDefault();
                        shortcuts.onCut?.();
                    }
                    break;
                case 'v':
                    event.preventDefault();
                    shortcuts.onPaste?.();
                    break;
                case 'a':
                    event.preventDefault();
                    shortcuts.onSelectAll?.();
                    break;
                case 'r':
                    event.preventDefault();
                    shortcuts.onRefresh?.();
                    break;
            }
        } else if (event.altKey && !event.ctrlKey && !event.shiftKey) {
            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    shortcuts.onNavigateUp?.();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    shortcuts.onNavigateBack?.();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    shortcuts.onNavigateForward?.();
                    break;
            }
        } else if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
            switch (event.key) {
                case 'Delete':
                    if (selectedFiles.length > 0) {
                        event.preventDefault();
                        shortcuts.onDelete?.();
                    }
                    break;
                case 'F2':
                    if (selectedFiles.length === 1) {
                        event.preventDefault();
                        shortcuts.onRename?.();
                    }
                    break;
                case 'F5':
                    event.preventDefault();
                    shortcuts.onRefresh?.();
                    break;
            }
        }
    }, [selectedFiles, shortcuts]);

    React.useEffect(() => {
        if (!enabled) return;
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown, enabled]);

    return { handleKeyDown };
}

/**
 * Custom hook for file selection management
 */
export function useFileSelection(onSelectionChange?: (files: FileSystemItem[]) => void) {
    const [selectedFiles, setSelectedFiles] = React.useState<FileSystemItem[]>([]);

    const isSelected = React.useCallback((item: FileSystemItem) => {
        return selectedFiles.some(selected => selected.path === item.path);
    }, [selectedFiles]);

    const selectFile = React.useCallback((item: FileSystemItem, multiSelect = false) => {
        if (multiSelect) {
            setSelectedFiles(prev => {
                if (isSelected(item)) {
                    return prev.filter(selected => selected.path !== item.path);
                } else {
                    return [...prev, item];
                }
            });
        } else {
            setSelectedFiles([item]);
        }
    }, [isSelected]);

    const selectFiles = React.useCallback((items: FileSystemItem[]) => {
        setSelectedFiles(items);
        onSelectionChange?.(items);
    }, [onSelectionChange]);

    const clearSelection = React.useCallback(() => {
        setSelectedFiles([]);
        onSelectionChange?.([]);
    }, [onSelectionChange]);

    const selectAll = React.useCallback((allItems: FileSystemItem[]) => {
        setSelectedFiles(allItems);
        onSelectionChange?.(allItems);
    }, [onSelectionChange]);

    React.useEffect(() => {
        onSelectionChange?.(selectedFiles);
    }, [selectedFiles, onSelectionChange]);

    return {
        selectedFiles,
        selectFile,
        selectFiles,
        clearSelection,
        selectAll,
        isSelected
    };
}

/**
 * Combined hook for all file explorer UI operations
 */
export function useFileExplorerUI(onRefresh?: () => void, options?: { enableShortcuts?: boolean }) {
    // Hook into file operations and navigation
    const fileOps = useFileOperations(onRefresh);
    const navigation = useNavigation();
    const fileSelection = useFileSelection();
    const enableShortcuts = options?.enableShortcuts ?? true;

    // File operation handlers with selection integration
    const handleCopy = React.useCallback(async () => {
        if (fileSelection.selectedFiles.length > 0) {
            await fileOps.copyFiles(fileSelection.selectedFiles);
        }
    }, [fileOps, fileSelection.selectedFiles]);

    const handleCut = React.useCallback(async () => {
        if (fileSelection.selectedFiles.length > 0) {
            await fileOps.cutFiles(fileSelection.selectedFiles);
        }
    }, [fileOps, fileSelection.selectedFiles]);

    const handlePaste = React.useCallback(async () => {
        if (navigation.currentPath && fileOps.hasClipboardFiles) {
            await fileOps.pasteFiles(navigation.currentPath);
        }
    }, [fileOps, navigation.currentPath]);

    const handleDelete = React.useCallback(async () => {
        if (fileSelection.selectedFiles.length > 0) {
            const confirmed = confirm(`Are you sure you want to delete ${fileSelection.selectedFiles.length} item(s)?`);
            if (confirmed) {
                await fileOps.deleteFiles(fileSelection.selectedFiles);
                fileSelection.clearSelection();
            }
        }
    }, [fileOps, fileSelection]);

    const handleRename = React.useCallback(async () => {
        if (fileSelection.selectedFiles.length === 1) {
            const file = fileSelection.selectedFiles[0];
            const newName = prompt('Enter new name:', file.name);
            if (newName && newName !== file.name) {
                await fileOps.renameFile(file, newName);
            }
        }
    }, [fileOps, fileSelection.selectedFiles]);

    const handleNewFolder = React.useCallback(async () => {
        if (navigation.currentPath) {
            const folderName = prompt('Enter folder name:', 'New Folder');
            if (folderName) {
                await fileOps.createFolder(navigation.currentPath, folderName);
            }
        }
    }, [fileOps, navigation.currentPath]);

    // Item interaction handlers
    const handleItemClick = React.useCallback((item: FileSystemItem, event?: React.MouseEvent) => {
        const multiSelect = event?.ctrlKey || event?.metaKey;
        const rangeSelect = event?.shiftKey;

        if (rangeSelect && fileSelection.selectedFiles.length > 0) {
            // TODO: Implement range selection
            fileSelection.selectFile(item, false);
        } else {
            fileSelection.selectFile(item, multiSelect);
        }
    }, [fileSelection]);

    const handleItemDoubleClick = React.useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            navigation.navigateToPath(item.path, { validatePath: true });
        } else {
            fileOps.openFile(item);
        }
    }, [navigation, fileOps]);

    const handleBackgroundClick = React.useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            fileSelection.clearSelection();
        }
    }, [fileSelection]);

    // Keyboard shortcuts
    const keyboardShortcuts: KeyboardShortcuts = {
        onCopy: handleCopy,
        onCut: handleCut,
        onPaste: handlePaste,
        onDelete: handleDelete,
        onRename: handleRename,
        onSelectAll: () => {}, // Will be set by the component using this hook
        onRefresh: onRefresh,
        onNavigateUp: navigation.navigateUp,
        onNavigateBack: navigation.navigateBack,
        onNavigateForward: navigation.navigateForward
    };

    useKeyboardShortcuts(fileSelection.selectedFiles, keyboardShortcuts, enableShortcuts);

    return {
        // State
        ...fileSelection,
        ...navigation,
        ...fileOps,

        // Handlers
        handleItemClick,
        handleItemDoubleClick,
        handleBackgroundClick,
        handleCopy,
        handleCut,
        handlePaste,
        handleDelete,
        handleRename,
        handleNewFolder,

        // Utilities
        keyboardShortcuts
    };
}

/**
 * Common context menu items generator
 */
export function generateContextMenuItems(
    selectedFiles: FileSystemItem[],
    clipboardState: { operation: 'copy' | 'cut' | null; files: string[] },
    handlers: {
        onCopy: () => void;
        onCut: () => void;
        onPaste: () => void;
        onDelete: () => void;
        onRename: () => void;
        onNewFolder: () => void;
        onProperties: () => void;
        onShowInExplorer: () => void;
    }
) {
    const items = [];

    if (selectedFiles.length > 0) {
        items.push(
            { label: 'Copy', action: handlers.onCopy, shortcut: 'Ctrl+C' },
            { label: 'Cut', action: handlers.onCut, shortcut: 'Ctrl+X' }
        );

        if (selectedFiles.length === 1) {
            items.push(
                { label: 'Rename', action: handlers.onRename, shortcut: 'F2' }
            );
        }

        items.push(
            { label: 'Delete', action: handlers.onDelete, shortcut: 'Del' },
            { type: 'separator' },
            { label: 'Properties', action: handlers.onProperties },
            { label: 'Show in Explorer', action: handlers.onShowInExplorer }
        );
    } else {
        // Background context menu
        if (clipboardState.files.length > 0) {
            items.push(
                { label: 'Paste', action: handlers.onPaste, shortcut: 'Ctrl+V' },
                { type: 'separator' }
            );
        }

        items.push(
            { label: 'New Folder', action: handlers.onNewFolder }
        );
    }

    return items;
}
