import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FaCopy,
    FaCut,
    FaPaste,
    FaTrash,
    FaEdit,
    FaShare,
    FaCompress,
    FaInfoCircle,
    FaEye,
    FaFolder,
    FaFolderPlus,
    FaExternalLinkAlt,
    FaDownload,
    FaClipboard,
    FaUndo,
    FaRedo,
    FaSearch,
    FaTimes
} from 'react-icons/fa';
import { FileSystemItem } from '../../../shared/ipc-channels';
import './EnhancedContextMenu.scss';

interface ContextMenuItem {
    id: string;
    label: string;
    icon?: React.ReactElement;
    action: () => void | Promise<void>;
    disabled?: boolean;
    separator?: boolean;
    shortcut?: string;
    submenu?: ContextMenuItem[];
}

interface EnhancedContextMenuProps {
    isVisible: boolean;
    position: { x: number; y: number };
    selectedItems: FileSystemItem[];
    currentPath: string;
    onClose: () => void;
    onRefresh?: () => void;
    onNavigate?: (path: string) => void;
}

export const EnhancedContextMenu: React.FC<EnhancedContextMenuProps> = ({
    isVisible,
    position,
    selectedItems,
    currentPath,
    onClose,
    onRefresh,
    onNavigate
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 });
    const [clipboardHasFiles, setClipboardHasFiles] = useState(false);
    const [clipboardState, setClipboardState] = useState<{
        operation: 'copy' | 'cut' | null;
        files: string[];
    }>({ operation: null, files: [] });

    // Check clipboard state and track cut/copied files
    useEffect(() => {
        if (isVisible) {
            // Check if clipboard has files
            window.electronAPI.clipboard.hasFiles().then(setClipboardHasFiles).catch(() => setClipboardHasFiles(false));
            
            // Get current clipboard state to track cut/copied files
            window.electronAPI.clipboard.getState()
                .then((state: { operation: 'copy' | 'cut' | null; files: string[] }) => {
                    setClipboardState(state);
                })
                .catch(() => {
                    setClipboardState({ operation: null, files: [] });
                });
        }
    }, [isVisible]);

    // Position menu to stay within viewport
    const getAdjustedPosition = useCallback(() => {
        // Get mouse position and adjust the menu to be next to the mouse
        let { x, y } = position;
        x -= 290;
        y -= 200;

        // Adjust position if menu goes out of bounds
        if (x < 0) x = 0;
        if (y < 0) y = 0;

        if (x + 290 > window.innerWidth) x = window.innerWidth - 290;
        if (y + 200 > window.innerHeight) y = window.innerHeight - 200;

        return { x, y };

    }, [position]);

    // Close handlers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('contextmenu', handleContextMenu);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [isVisible, onClose]);

    // Action handlers using system default behaviors
    const handleCopy = useCallback(async () => {
        try {
            const paths = selectedItems.map(item => item.path);
            await window.electronAPI.clipboard.copyFiles(paths);
            
            // Update local clipboard state for immediate UI feedback
            setClipboardState({ operation: 'copy', files: paths });
            setClipboardHasFiles(true);
            
            // Broadcast clipboard change to refresh file list visuals
            window.dispatchEvent(new CustomEvent('clipboard-changed', { 
                detail: { operation: 'copy', files: paths } 
            }));
            
            onClose();
        } catch (error) {
            console.error('Failed to copy files:', error);
        }
    }, [selectedItems, onClose]);

    const handleCut = useCallback(async () => {
        try {
            const paths = selectedItems.map(item => item.path);
            await window.electronAPI.clipboard.cutFiles(paths);
            
            // Update local clipboard state for immediate UI feedback
            setClipboardState({ operation: 'cut', files: paths });
            setClipboardHasFiles(true);
            
            // Broadcast clipboard change to refresh file list visuals
            window.dispatchEvent(new CustomEvent('clipboard-changed', { 
                detail: { operation: 'cut', files: paths } 
            }));
            
            onClose();
        } catch (error) {
            console.error('Failed to cut files:', error);
        }
    }, [selectedItems, onClose]);

    const handlePaste = useCallback(async () => {
        try {
            const success = await window.electronAPI.clipboard.pasteFiles(currentPath);
            if (success) {
                // If it was a cut operation, clear the clipboard state
                if (clipboardState.operation === 'cut') {
                    setClipboardState({ operation: null, files: [] });
                    setClipboardHasFiles(false);
                    
                    // Broadcast clipboard cleared to refresh file list visuals
                    window.dispatchEvent(new CustomEvent('clipboard-changed', { 
                        detail: { operation: null, files: [] } 
                    }));
                }
                
                onRefresh?.();
            }
            onClose();
        } catch (error) {
            console.error('Failed to paste files:', error);
        }
    }, [currentPath, clipboardState.operation, onRefresh, onClose]);

    const handleDelete = useCallback(async () => {
        try {
            const paths = selectedItems.map(item => item.path);
            const itemNames = selectedItems.map(item => item.name);
            
            let confirmMessage: string;
            if (paths.length === 1) {
                confirmMessage = `Are you sure you want to permanently delete "${itemNames[0]}"?\n\nThis action cannot be undone.`;
            } else {
                confirmMessage = `Are you sure you want to permanently delete these ${paths.length} items?\n\n${itemNames.slice(0, 3).join('\n')}${paths.length > 3 ? `\n... and ${paths.length - 3} more` : ''}\n\nThis action cannot be undone.`;
            }
            
            const confirmed = window.confirm(confirmMessage);
            if (confirmed) {
                await window.electronAPI.files.delete(paths);
                
                // Clear clipboard if deleted files were in clipboard
                if (clipboardState.files.some(file => paths.includes(file))) {
                    await window.electronAPI.clipboard.clear();
                    setClipboardState({ operation: null, files: [] });
                    
                    // Broadcast clipboard cleared
                    window.dispatchEvent(new CustomEvent('clipboard-changed', { 
                        detail: { operation: null, files: [] } 
                    }));
                }
                
                onRefresh?.();
            }
            onClose();
        } catch (error) {
            console.error('Failed to delete files:', error);
            alert('Failed to delete files. Please try again.');
        }
    }, [selectedItems, clipboardState.files, onRefresh, onClose]);

    const handleRename = useCallback(async () => {
        if (selectedItems.length !== 1) return;

        try {
            const item = selectedItems[0];
            const isDirectory = item.type === 'directory';
            
            // For files, pre-select the name without extension for easier renaming
            let defaultName = item.name;
            if (!isDirectory && item.name.includes('.')) {
                const lastDotIndex = item.name.lastIndexOf('.');
                defaultName = item.name.substring(0, lastDotIndex);
            }
            
            const newName = window.prompt(
                `Rename ${isDirectory ? 'folder' : 'file'}:`, 
                defaultName
            );
            
            if (newName && newName.trim() !== '') {
                const trimmedName = newName.trim();
                
                // For files, add back the extension if not provided
                let finalName = trimmedName;
                if (!isDirectory && !trimmedName.includes('.') && item.name.includes('.')) {
                    const extension = item.name.substring(item.name.lastIndexOf('.'));
                    finalName = trimmedName + extension;
                }
                
                if (finalName !== item.name) {
                    await window.electronAPI.files.rename(item.path, finalName);
                    
                    // Update clipboard state if renamed file was in clipboard
                    if (clipboardState.files.includes(item.path)) {
                        const newPath = item.path.replace(item.name, finalName);
                        const updatedFiles = clipboardState.files.map(file => 
                            file === item.path ? newPath : file
                        );
                        setClipboardState({ ...clipboardState, files: updatedFiles });
                        
                        // Broadcast clipboard update
                        window.dispatchEvent(new CustomEvent('clipboard-changed', { 
                            detail: { operation: clipboardState.operation, files: updatedFiles } 
                        }));
                    }
                    
                    onRefresh?.();
                }
            }
            onClose();
        } catch (error) {
            console.error('Failed to rename file:', error);
            alert('Failed to rename item. Please check if the name is valid.');
        }
    }, [selectedItems, clipboardState, onRefresh, onClose]);

    const handleNewFolder = useCallback(async () => {
        try {
            const name = window.prompt('Enter folder name:', 'New Folder');
            if (name) {
                await window.electronAPI.files.createFolder(currentPath, name);
                onRefresh?.();
            }
            onClose();
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
    }, [currentPath, onRefresh, onClose]);

    const handleOpen = useCallback(async () => {
        try {
            for (const item of selectedItems) {
                if (item.type === 'directory') {
                    onNavigate?.(item.path);
                } else {
                    await window.electronAPI.system.openFileFast(item.path);
                }
            }
            onClose();
        } catch (error) {
            console.error('Failed to open files:', error);
        }
    }, [selectedItems, onNavigate, onClose]);

    const handleOpenWith = useCallback(async () => {
        // This would require additional system integration
        try {
            for (const item of selectedItems) {
                if (item.type === 'file') {
                    await window.electronAPI.system.openFile(item.path);
                }
            }
            onClose();
        } catch (error) {
            console.error('Failed to open with:', error);
        }
    }, [selectedItems, onClose]);

    const handleProperties = useCallback(async () => {
        try {
            for (const item of selectedItems) {
                await window.electronAPI.files.showProperties(item.path);
            }
            onClose();
        } catch (error) {
            console.error('Failed to show properties:', error);
        }
    }, [selectedItems, onClose]);

    const handleShowInExplorer = useCallback(async () => {
        try {
            const item = selectedItems[0];
            await window.electronAPI.files.showInExplorer(item.path);
            onClose();
        } catch (error) {
            console.error('Failed to show in explorer:', error);
        }
    }, [selectedItems, onClose]);

    // Generate menu items based on selection
    const getMenuItems = useCallback((): ContextMenuItem[] => {
        const hasSelection = selectedItems.length > 0;
        const singleSelection = selectedItems.length === 1;
        const multipleSelection = selectedItems.length > 1;
        const hasFiles = selectedItems.some(item => item.type === 'file');
        const hasDirectories = selectedItems.some(item => item.type === 'directory');
        const allFiles = selectedItems.every(item => item.type === 'file');
        const allDirectories = selectedItems.every(item => item.type === 'directory');

        const items: ContextMenuItem[] = [];

        if (hasSelection) {
            // Open/Open with
            items.push({
                id: 'open',
                label: singleSelection ? 'Open' : 'Open selected',
                icon: <FaEye />,
                action: handleOpen,
                shortcut: 'Enter'
            });

            if (hasFiles) {
                items.push({
                    id: 'open-with',
                    label: 'Open with...',
                    icon: <FaExternalLinkAlt />,
                    action: handleOpenWith
                });
            }

            items.push({ id: 'sep1', label: '', separator: true, action: () => { } });

            // Edit operations
            items.push({
                id: 'copy',
                label: `Copy ${multipleSelection ? `${selectedItems.length} items` : `"${selectedItems[0].name}"`}`,
                icon: <FaCopy />,
                action: handleCopy,
                shortcut: 'Ctrl+C'
            });

            items.push({
                id: 'cut',
                label: `Cut ${multipleSelection ? `${selectedItems.length} items` : `"${selectedItems[0].name}"`}`,
                icon: <FaCut />,
                action: handleCut,
                shortcut: 'Ctrl+X'
            });

            items.push({ id: 'sep2', label: '', separator: true, action: () => { } });

            // File management
            if (singleSelection) {
                items.push({
                    id: 'rename',
                    label: 'Rename',
                    icon: <FaEdit />,
                    action: handleRename,
                    shortcut: 'F2'
                });
            }

            items.push({
                id: 'delete',
                label: `Delete ${multipleSelection ? `${selectedItems.length} items` : `"${selectedItems[0].name}"`}`,
                icon: <FaTrash />,
                action: handleDelete,
                shortcut: 'Delete'
            });

            items.push({ id: 'sep3', label: '', separator: true, action: () => { } });

            // System integration
            if (singleSelection) {
                items.push({
                    id: 'show-in-explorer',
                    label: 'Show in File Explorer',
                    icon: <FaFolder />,
                    action: handleShowInExplorer
                });
            }

            items.push({
                id: 'properties',
                label: 'Properties',
                icon: <FaInfoCircle />,
                action: handleProperties,
                shortcut: 'Alt+Enter'
            });
        } else {
            // No selection - background context menu
            items.push({
                id: 'new-folder',
                label: 'New Folder',
                icon: <FaFolderPlus />,
                action: handleNewFolder,
                shortcut: 'Ctrl+Shift+N'
            });

            items.push({ id: 'sep1', label: '', separator: true, action: () => { } });

            items.push({
                id: 'paste',
                label: 'Paste',
                icon: <FaPaste />,
                action: handlePaste,
                disabled: !clipboardHasFiles,
                shortcut: 'Ctrl+V'
            });

            items.push({ id: 'sep2', label: '', separator: true, action: () => { } });

            items.push({
                id: 'refresh',
                label: 'Refresh',
                icon: <FaUndo />,
                action: () => {
                    onRefresh?.();
                    onClose();
                },
                shortcut: 'F5'
            });
        }

        return items;
    }, [
        selectedItems,
        clipboardHasFiles,
        handleOpen,
        handleOpenWith,
        handleCopy,
        handleCut,
        handlePaste,
        handleRename,
        handleDelete,
        handleNewFolder,
        handleProperties,
        handleShowInExplorer,
        onRefresh,
        onClose
    ]);

    if (!isVisible) return null;

    const adjustedPosition = getAdjustedPosition();
    const menuItems = getMenuItems();

    return (
        <div
            ref={menuRef}
            className="enhanced-context-menu"
            style={{
                position: 'fixed',
                left: adjustedPosition.x,
                top: adjustedPosition.y,
                zIndex: 10000
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Selection Count Header */}
            {selectedItems.length > 0 && (
                <div className="context-menu-header">
                    <div className="selection-count">
                        {selectedItems.length === 1 
                            ? `1 item selected: ${selectedItems[0].name}` 
                            : `${selectedItems.length} items selected`}
                    </div>
                    {clipboardState.operation && clipboardState.files.some(file => 
                        selectedItems.some(item => item.path === file)
                    ) && (
                        <div className={`clipboard-indicator ${clipboardState.operation}`}>
                            {clipboardState.operation === 'cut' ? '✂️ Cut' : '📋 Copied'}
                        </div>
                    )}
                </div>
            )}
            
            {menuItems.map((item, index) => {
                if (item.separator) {
                    return <div key={item.id} className="context-menu-separator" />;
                }

                return (
                    <div
                        key={item.id}
                        className={`context-menu-item ${item.disabled ? 'disabled' : ''}`}
                        onClick={() => {
                            if (!item.disabled) {
                                item.action();
                            }
                        }}
                    >
                        <div className="context-menu-icon">
                            {item.icon}
                        </div>
                        <div className="context-menu-label">
                            {item.label}
                        </div>
                        {item.shortcut && (
                            <div className="context-menu-shortcut">
                                {item.shortcut}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
