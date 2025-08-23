import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { useFileExplorerUI, generateContextMenuItems } from '../../utils';
import './EnhancedContextMenu.scss';

interface EnhancedContextMenuProps {
    isVisible: boolean;
    position: { x: number; y: number };
    selectedItems: FileSystemItem[];
    onClose: () => void;
    onRefresh?: () => void;
    onNavigate?: (path: string) => void;
}

export const EnhancedContextMenu: React.FC<EnhancedContextMenuProps> = ({
    isVisible,
    position,
    selectedItems,
    onClose,
    onRefresh,
    onNavigate
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Initialize file explorer utilities with refresh callback
    const fileExplorer = useFileExplorerUI(onRefresh);
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

    // Generate menu items using the shared utility; wrap actions to close/refresh when needed
    const menuItems = React.useMemo(() => {
        const handlers = {
            onCopy: async () => { await fileExplorer.handleCopy(); onClose(); },
            onCut: async () => { await fileExplorer.handleCut(); onClose(); },
            onPaste: async () => { await fileExplorer.handlePaste(); onRefresh?.(); onClose(); },
            onDelete: async () => { await fileExplorer.handleDelete(); onRefresh?.(); onClose(); },
            onRename: async () => { await fileExplorer.handleRename(); onRefresh?.(); onClose(); },
            onNewFolder: async () => { await fileExplorer.handleNewFolder(); onRefresh?.(); onClose(); },
            onProperties: async () => {
                if (selectedItems.length === 1) {
                    await fileExplorer.showProperties(selectedItems[0]);
                }
                onClose();
            },
            onShowInExplorer: async () => {
                if (selectedItems.length === 1) {
                    await fileExplorer.showInExplorer(selectedItems[0]);
                }
                onClose();
            }
        };

        return generateContextMenuItems(selectedItems, fileExplorer.clipboardState, handlers);
    }, [selectedItems, fileExplorer.clipboardState, fileExplorer, onRefresh, onClose]);

    if (!isVisible) return null;
    const adjustedPosition = React.useMemo(() => getAdjustedPosition(), [getAdjustedPosition]);

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
                if ((item as any).type === 'separator') {
                    return <div key={`sep-${index}`} className="context-menu-separator" />;
                }
                const entry = item as any as { label: string; action: () => void; shortcut?: string };
                return (
                    <div
                        key={`item-${index}`}
                        className="context-menu-item"
                        onClick={() => entry.action()}
                    >
                        <div className="context-menu-label">{entry.label}</div>
                        {entry.shortcut && (
                            <div className="context-menu-shortcut">{entry.shortcut}</div>
                        )}
                    </div>
                );
            })}
        </div>
        
    );
};
