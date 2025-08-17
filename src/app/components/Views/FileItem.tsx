import React from 'react';
import { FileSystemItem } from '../../../shared/ipc-channels';

interface FileItemProps {
    item: FileSystemItem;
    isSelected: boolean;
    onClick: (item: FileSystemItem, event?: React.MouseEvent) => void;
    onDoubleClick: (item: FileSystemItem) => void;
    onContextMenu: (event: React.MouseEvent, item: FileSystemItem) => void;
    viewMode: 'list' | 'grid';
    getFileIcon: (item: FileSystemItem) => React.ReactElement;
    formatFileSize: (size: number) => string;
    formatDate: (date: Date) => string;
    showFileExtensions: boolean;
    compactMode: boolean;
    clipboardState: { operation: 'copy' | 'cut' | null; files: string[] };
}

// Memoized FileItem component for better performance
export const FileItem = React.memo<FileItemProps>(({ 
    item, 
    isSelected, 
    onClick, 
    onDoubleClick, 
    onContextMenu, 
    viewMode, 
    getFileIcon, 
    formatFileSize, 
    formatDate, 
    showFileExtensions, 
    compactMode, 
    clipboardState 
}) => {
    // Check if this item is in clipboard for visual indicators
    const isInClipboard = clipboardState.files.includes(item.path);
    const isCut = isInClipboard && clipboardState.operation === 'cut';
    const isCopied = isInClipboard && clipboardState.operation === 'copy';

    // Fast double-click handler with reduced delay detection
    const fastDoubleClickHandler = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDoubleClick(item);
    }, [item, onDoubleClick]);

    // Format file name based on settings
    const displayName = React.useMemo(() => {
        if (item.type === 'directory') {
            return item.name; // Always show full name for directories
        }

        if (showFileExtensions || !item.extension) {
            return item.name; // Show full name if extensions enabled or no extension
        }

        // Hide extension: remove the last dot and everything after
        const lastDotIndex = item.name.lastIndexOf('.');
        return lastDotIndex > 0 ? item.name.substring(0, lastDotIndex) : item.name;
    }, [item.name, item.type, item.extension, showFileExtensions]);

    if (viewMode === 'list') {
        return (
            <div
                className={`file-list-item ${isSelected ? 'selected' : ''} ${compactMode ? 'compact' : ''} ${isCut ? 'clipboard-cut' : ''} ${isCopied ? 'clipboard-copied' : ''}`}
                onClick={(e) => onClick(item, e)}
                onDoubleClick={fastDoubleClickHandler}
                onContextMenu={(e) => onContextMenu(e, item)}
            >
                <div className="file-list-column name-column">
                    <div className="file-name-container">
                        {getFileIcon(item)}
                        <span className="file-name">{displayName}</span>
                    </div>
                </div>
                <div className="file-list-column date-column">
                    {formatDate(item.modified)}
                </div>
                <div className="file-list-column type-column">
                    {item.type === 'directory' ? 'File folder' : item.extension || 'File'}
                </div>
                <div className="file-list-column size-column">
                    {item.size ? formatFileSize(item.size) : '0 B'}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`file-grid-item ${isSelected ? 'selected' : ''} ${compactMode ? 'compact' : ''} ${isCut ? 'clipboard-cut' : ''} ${isCopied ? 'clipboard-copied' : ''}`}
            onClick={(e) => onClick(item, e)}
            onDoubleClick={fastDoubleClickHandler}
            onContextMenu={(e) => onContextMenu(e, item)}
        >
            <div className="file-grid-icon">
                {getFileIcon(item)}
            </div>
            <div className="file-grid-name">
                {displayName}
            </div>
            <div className="file-grid-details">
                <span className="file-grid-size">
                    {item.size ? formatFileSize(item.size) : '0 B'}
                </span>
                <span className="file-grid-date">
                    {formatDate(item.modified)}
                </span>
            </div>
        </div>
    );
});

FileItem.displayName = 'FileItem';
