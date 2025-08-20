import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FaCopy,
    FaCut,
    FaPaste,
    FaTrash,
    FaEdit,
    FaInfoCircle,
    FaEye,
    FaFolder,
    FaFolderPlus,
    FaExternalLinkAlt,
    FaUndo
} from 'react-icons/fa';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { useFileExplorerUI, useNavigation } from '../../utils';
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

    // Initialize file explorer utilities with refresh callback
    const fileExplorer = useFileExplorerUI(onRefresh);
    const navigationUtils = useNavigation();
    const { clipboardState } = fileExplorer;
    const clipboardHasFiles = clipboardState.files.length > 0;

    // Position menu to stay within viewport with intelligent positioning
    const getAdjustedPosition = useCallback(() => {
        // Get mouse position and initial offset
        let { x, y } = position;
        const initialOffsetX = -290;
        const initialOffsetY = -200;

        // Apply initial offset
        x += initialOffsetX;
        y += initialOffsetY;

        // Get viewport dimensions with some padding for safety
        const viewport = {
            width: window.innerWidth - 20, // 20px padding
            height: window.innerHeight - 20 // 20px padding
        };

        // Estimate menu dimensions based on content
        const baseMenuWidth = 300;
        const baseMenuHeight = 250;

        // Calculate dynamic height based on menu items
        const selectedItemsCount = selectedItems.length;
        const contextMenuItems = selectedItemsCount > 0 ? 12 : 8; // More items when files are selected
        const estimatedHeight = Math.min(contextMenuItems * 35 + 60, 400); // Cap at 400px

        const menuDimensions = {
            width: baseMenuWidth,
            height: estimatedHeight
        };

        // Smart positioning algorithm
        let finalX = x;
        let finalY = y;

        // Horizontal positioning logic
        if (x + menuDimensions.width > viewport.width) {
            // Menu would overflow right edge
            // Try positioning to the left of cursor
            const leftPosition = position.x - menuDimensions.width - Math.abs(initialOffsetX);
            if (leftPosition >= 10) {
                finalX = leftPosition;
            } else {
                // If neither side works well, stick to right edge with padding
                finalX = viewport.width - menuDimensions.width;
            }
        }

        // Keep some minimum margin from left edge
        if (finalX < 10) {
            finalX = 10;
        }

        // Vertical positioning logic
        if (y + menuDimensions.height > viewport.height) {
            // Menu would overflow bottom edge
            // Try positioning above cursor
            const topPosition = position.y - menuDimensions.height - Math.abs(initialOffsetY);
            if (topPosition >= 10) {
                finalY = topPosition;
            } else {
                // If neither top nor bottom works well, stick to bottom edge with padding
                finalY = viewport.height - menuDimensions.height;
            }
        }

        // Keep some minimum margin from top edge
        if (finalY < 10) {
            finalY = 10;
        }

        // Final safety checks to ensure menu stays within bounds
        if (finalX + menuDimensions.width > viewport.width) {
            finalX = Math.max(10, viewport.width - menuDimensions.width);
        }

        if (finalY + menuDimensions.height > viewport.height) {
            finalY = Math.max(10, viewport.height - menuDimensions.height);
        }

        return { x: finalX, y: finalY };
    }, [position, selectedItems.length]);

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
        await fileExplorer.handleCopy();
        onClose();
    }, [fileExplorer, onClose]);

    const handleCut = useCallback(async () => {
        await fileExplorer.handleCut();
        onClose();
    }, [fileExplorer, onClose]);

    const handlePaste = useCallback(async () => {
        await fileExplorer.handlePaste();
        onRefresh?.();
        onClose();
    }, [fileExplorer, onRefresh, onClose]);

    const handleDelete = useCallback(async () => {
        await fileExplorer.handleDelete();
        onRefresh?.();
        onClose();
    }, [fileExplorer, onRefresh, onClose]);

    const handleRename = useCallback(async () => {
        await fileExplorer.handleRename();
        onRefresh?.();
        onClose();
    }, [fileExplorer, onRefresh, onClose]);

    const handleNewFolder = useCallback(async () => {
        await fileExplorer.handleNewFolder();
        onRefresh?.();
        onClose();
    }, [fileExplorer, onRefresh, onClose]);

    const handleOpen = useCallback(async () => {
        for (const item of selectedItems) {
            if (item.type === 'directory') {
                navigationUtils.navigateToPath(item.path);
            } else {
                await window.electronAPI.system.openFileFast(item.path);
            }
        }
        onClose();
    }, [selectedItems, navigationUtils, onClose]);

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

    const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Initialize position
    useEffect(() => {
        setAdjustedPosition(getAdjustedPosition());
    }, [getAdjustedPosition]);

    // Refine position after menu renders with actual dimensions
    useEffect(() => {
        if (menuRef.current && isVisible) {
            const rect = menuRef.current.getBoundingClientRect();
            const actualWidth = rect.width;
            const actualHeight = rect.height;

            // Only recalculate if there's a significant difference from estimates
            const estimatedWidth = 300;
            const estimatedHeight = Math.min((selectedItems.length > 0 ? 12 : 8) * 35 + 60, 400);

            const widthDiff = Math.abs(actualWidth - estimatedWidth);
            const heightDiff = Math.abs(actualHeight - estimatedHeight);

            // Only reposition if the actual size is significantly different from estimate
            if (widthDiff > 50 || heightDiff > 50) {
                let { x, y } = position;
                x -= 290;
                y -= 200;

                const viewport = {
                    width: window.innerWidth - 20,
                    height: window.innerHeight - 20
                };

                // Re-calculate with actual dimensions
                if (x + actualWidth > viewport.width) {
                    x = position.x - actualWidth + 290;
                }
                if (x < 10) x = 10;

                if (y + actualHeight > viewport.height) {
                    y = position.y - actualHeight + 200;
                }
                if (y < 10) y = 10;

                // Final bounds check
                if (x + actualWidth > viewport.width) {
                    x = viewport.width - actualWidth;
                }
                if (y + actualHeight > viewport.height) {
                    y = viewport.height - actualHeight;
                }

                setAdjustedPosition({ x, y });
            }
        }
    }, [position, selectedItems.length, isVisible]);
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
