import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaFolder, 
    FaFile, 
    FaFileImage, 
    FaFileVideo, 
    FaFileAudio, 
    FaFileArchive, 
    FaFileCode, 
    FaFilePdf, 
    FaFileWord, 
    FaFileExcel, 
    FaFilePowerpoint,
    FaSpinner,
    FaExclamationTriangle
} from 'react-icons/fa';
import { FileSystemItem, DirectoryContents } from '../../../shared/ipc-channels';
import { formatFileSize } from '../../../shared/fileSizeUtils';
import { useSettings } from '../../contexts/SettingsContext';
import { CustomContextMenu } from '../CustomContextMenu/CustomContextMenu';
import './FileList.scss';
import { VirtualizedList } from '../VirtualizedList/VirtualizedList';

interface FileListProps {
    currentPath: string;
    viewMode: 'list' | 'grid';
    onNavigate?: (path: string) => void;
    onFileSelect?: (file: FileSystemItem) => void;
    selectedFile?: FileSystemItem | null;
}

// Memoized FileItem component for better performance
const FileItem = React.memo<{
    item: FileSystemItem;
    isSelected: boolean;
    onClick: (item: FileSystemItem) => void;
    onDoubleClick: (item: FileSystemItem) => void;
    onContextMenu: (event: React.MouseEvent, item: FileSystemItem) => void;
    viewMode: 'list' | 'grid';
    getFileIcon: (item: FileSystemItem) => React.ReactElement;
    formatFileSize: (size: number) => string;
    formatDate: (date: Date) => string;
    showFileExtensions: boolean;
    compactMode: boolean;
}>(({ item, isSelected, onClick, onDoubleClick, onContextMenu, viewMode, getFileIcon, formatFileSize, formatDate, showFileExtensions, compactMode }) => {
    
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
                className={`file-list-item ${isSelected ? 'selected' : ''} ${compactMode ? 'compact' : ''}`}
                onClick={() => onClick(item)}
                onDoubleClick={() => onDoubleClick(item)}
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
                    {item.type === 'directory' ? '' : formatFileSize(item.size)}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`file-grid-item ${isSelected ? 'selected' : ''} ${compactMode ? 'compact' : ''}`}
            onClick={() => onClick(item)}
            onDoubleClick={() => onDoubleClick(item)}
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
                    {item.type === 'directory' ? '' : formatFileSize(item.size)}
                </span>
                <span className="file-grid-date">
                    {formatDate(item.modified)}
                </span>
            </div>
        </div>
    );
});

export const FileList = React.memo<FileListProps>(({ currentPath, viewMode, onNavigate, onFileSelect, selectedFile }) => {
    const { settings } = useSettings();
    const [directoryContents, setDirectoryContents] = useState<DirectoryContents | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    
    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        item: FileSystemItem | null;
    }>({
        visible: false,
        x: 0,
        y: 0,
        item: null,
    });

    // Get file size unit from settings context (no need for separate state)
    const fileSizeUnit = settings.fileSizeUnit;

    // Build list options from settings once
    const listOptions = useMemo(() => {
        const sortBy = settings.defaultSortBy === 'type' ? 'name' : settings.defaultSortBy;
        return {
            includeHidden: settings.showHiddenFiles,
            sortBy,
            sortDirection: settings.defaultSortOrder as 'asc' | 'desc',
            maxItems: 5000,
        };
    }, [settings.showHiddenFiles, settings.defaultSortBy, settings.defaultSortOrder]);

    // Get file icon based on extension
    const getFileIcon = useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            return <FaFolder className="file-icon directory-icon" />;
        }
        const ext = item.extension?.toLowerCase();
        switch (ext) {
            case '.jpg':
            case '.jpeg':
            case '.png':
            case '.gif':
            case '.webp':
            case '.svg':
                return <FaFileImage className="file-icon image-icon" />;
            case '.mp4':
            case '.avi':
            case '.mkv':
            case '.mov':
            case '.wmv':
                return <FaFileVideo className="file-icon video-icon" />;
            case '.mp3':
            case '.wav':
            case '.flac':
            case '.aac':
                return <FaFileAudio className="file-icon audio-icon" />;
            case '.zip':
            case '.rar':
            case '.7z':
            case '.tar':
                return <FaFileArchive className="file-icon archive-icon" />;
            case '.js':
            case '.ts':
            case '.jsx':
            case '.tsx':
            case '.html':
            case '.css':
            case '.scss':
            case '.json':
                return <FaFileCode className="file-icon code-icon" />;
            case '.pdf':
                return <FaFilePdf className="file-icon pdf-icon" />;
            case '.doc':
            case '.docx':
                return <FaFileWord className="file-icon word-icon" />;
            case '.xls':
            case '.xlsx':
                return <FaFileExcel className="file-icon excel-icon" />;
            case '.ppt':
            case '.pptx':
                return <FaFilePowerpoint className="file-icon powerpoint-icon" />;
            default:
                return <FaFile className="file-icon default-icon" />;
        }
    }, []);

    // Format file size using user's preferred unit system
    const formatFileSizeWithSettings = useCallback((size: number) => {
        if (size === 0) return '-';
        return formatFileSize(size, fileSizeUnit, 1);
    }, [fileSizeUnit]);

    // Format date
    const formatDate = useCallback((date: Date) => {
        try {
            return new Date(date).toLocaleString();
        } catch {
            return 'Unknown';
        }
    }, []);

    // Context menu handlers
    const handleContextMenu = useCallback((event: React.MouseEvent, item: FileSystemItem) => {
        event.preventDefault();
        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            item: item,
        });
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    const handleContextMenuAction = useCallback((action: string, items: FileSystemItem[]) => {
        console.log(`Context menu action: ${action} on items:`, items);
        // Here you would implement the actual file operations
        handleCloseContextMenu();
    }, [handleCloseContextMenu]);

    // Close context menu when clicking elsewhere
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.visible) {
                handleCloseContextMenu();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [contextMenu.visible, handleCloseContextMenu]);

    // Load directory contents
    const loadDirectory = useCallback(async (path: string) => {
        if (!path) return;
        setLoading(true);
        setError(null);
        try {
            const contents = await window.electronAPI.fs.getDirectoryContents(path, listOptions);
            setDirectoryContents(contents);
        } catch (err) {
            console.error('Failed to load directory:', err);
            setError(err instanceof Error ? err.message : 'Failed to load directory');
            setDirectoryContents(null);
        } finally {
            setLoading(false);
        }
    }, [listOptions]);

    // Handle file/folder clicks with memoization
    const handleItemClick = useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            onNavigate?.(item.path);
        } else {
            onFileSelect?.(item);
        }
    }, [onNavigate, onFileSelect]);

    // Handle double clicks with memoization
    const handleItemDoubleClick = useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            onNavigate?.(item.path);
        }
    }, [onNavigate]);

    // Memoized directory items for performance
    const directoryItems = useMemo(() => directoryContents?.items || [], [directoryContents]);
    
    // Filtered items based on search term
    const filteredItems = useMemo(() => {
        if (!searchTerm.trim()) {
            return directoryItems;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        return directoryItems.filter(item => 
            item.name.toLowerCase().includes(searchLower) ||
            (item.extension && item.extension.toLowerCase().includes(searchLower))
        );
    }, [directoryItems, searchTerm]);

    // Load directory when path or list options change
    useEffect(() => {
        loadDirectory(currentPath);
    }, [currentPath, loadDirectory]);

    // Clear search when path changes
    useEffect(() => {
        setSearchTerm('');
    }, [currentPath]);

    // Render loading state
    if (loading) {
        return (
            <div className="file-list-loading">
                <FaSpinner className="loading-spinner" />
                <span>Loading...</span>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="file-list-error">
                <FaExclamationTriangle className="error-icon" />
                <span>Failed to load directory</span>
                <small>{error}</small>
            </div>
        );
    }

    // Render empty state
    if (!directoryContents || filteredItems.length === 0) {
        const isSearching = searchTerm.trim().length > 0;
        const hasItems = directoryContents?.items && directoryContents.items.length > 0;
        
        return (
            <div className="file-list-empty">
                <FaFolder className="empty-icon" />
                {isSearching && hasItems ? (
                    <>
                        <span>No files found matching "{searchTerm}"</span>
                        <small>Try a different search term</small>
                    </>
                ) : (
                    <span>This folder is empty</span>
                )}
            </div>
        );
    }

    // Render file list in list view with virtualization for large directories
    if (viewMode === 'list') {
        const rowHeight = settings.compactMode ? 32 : 40; // adjust height based on compact mode
        return (
            <div className="file-list-view">
                {/* Search bar */}
                <div className="file-search-bar">
                    <input
                        type="text"
                        placeholder="Search in current folder..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="file-list-header">
                    <div className="file-list-column name-column">Name</div>
                    <div className="file-list-column date-column">Date modified</div>
                    <div className="file-list-column type-column">Type</div>
                    <div className="file-list-column size-column">Size</div>
                </div>
                <VirtualizedList
                    itemCount={filteredItems.length}
                    itemHeight={rowHeight}
                    overscan={10}
                    className="file-list-content"
                    renderItem={(index) => {
                        const item = filteredItems[index];
                        return (
                            <FileItem
                                key={`${item.path}`}
                                item={item}
                                isSelected={selectedFile?.path === item.path}
                                onClick={handleItemClick}
                                onDoubleClick={handleItemDoubleClick}
                                onContextMenu={handleContextMenu}
                                viewMode={viewMode}
                                getFileIcon={getFileIcon}
                                formatFileSize={formatFileSizeWithSettings}
                                formatDate={formatDate}
                                showFileExtensions={settings.showFileExtensions}
                                compactMode={settings.compactMode}
                            />
                        );
                    }}
                />
                
                {/* Context Menu */}
                {contextMenu.visible && contextMenu.item && (
                    <CustomContextMenu
                        position={{ x: contextMenu.x, y: contextMenu.y }}
                        isVisible={contextMenu.visible}
                        selectedItems={[contextMenu.item]}
                        onAction={handleContextMenuAction}
                        onClose={handleCloseContextMenu}
                    />
                )}
            </div>
        );
    }

    // Render file list in grid view
    return (
        <div className="file-grid-view">
            {/* Search bar */}
            <div className="file-search-bar">
                <input
                    type="text"
                    placeholder="Search in current folder..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>
            <div className="file-grid-content">
                {filteredItems.map((item) => (
                <FileItem
                    key={item.path}
                    item={item}
                    isSelected={selectedFile?.path === item.path}
                    onClick={handleItemClick}
                    onDoubleClick={handleItemDoubleClick}
                    onContextMenu={handleContextMenu}
                    viewMode={viewMode}
                    getFileIcon={getFileIcon}
                    formatFileSize={formatFileSizeWithSettings}
                    formatDate={formatDate}
                    showFileExtensions={settings.showFileExtensions}
                    compactMode={settings.compactMode}
                />
            ))}
            </div>
            
            {/* Context Menu */}
            {contextMenu.visible && contextMenu.item && (
                <CustomContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    isVisible={contextMenu.visible}
                    selectedItems={[contextMenu.item]}
                    onAction={handleContextMenuAction}
                    onClose={handleCloseContextMenu}
                />
            )}
        </div>
    );
});
