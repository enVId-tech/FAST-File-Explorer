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
    FaExclamationTriangle,
    FaFilter,
    FaCalendarAlt,
    FaRulerHorizontal,
    FaFont,
    FaTimes,
    FaSortUp,
    FaSortDown,
    FaSort,
    FaHdd,
    FaUsb
} from 'react-icons/fa';
import { FileSystemItem, DirectoryContents, FolderMetadata } from '../../../shared/ipc-channels';
import { formatFileSize } from '../../../shared/fileSizeUtils';
import { useSettings } from '../../contexts/SettingsContext';
import { CustomContextMenu } from '../CustomContextMenu/CustomContextMenu';
import './FileList.scss';
import { VirtualizedList } from '../VirtualizedList/VirtualizedList';

// Enhanced sorting type definitions
type SortField = 'name' | 'size' | 'modified' | 'type';
type SortDirection = 'asc' | 'desc';

interface SortState {
    field: SortField;
    direction: SortDirection;
}

// Windows-style natural sorting helper
const windowsNaturalSort = (a: string, b: string): number => {
    // Windows File Explorer uses natural sorting (alphanumeric)
    // This handles numbers within strings properly (e.g., "file10.txt" comes after "file2.txt")
    return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base', // Case-insensitive
        ignorePunctuation: false
    });
};

interface FileListProps {
    currentPath: string;
    viewMode: 'list' | 'grid';
    onNavigate?: (path: string) => void;
    onFileSelect?: (file: FileSystemItem | FileSystemItem[]) => void;
    selectedFiles?: FileSystemItem[];
    onSelectionChange?: (files: FileSystemItem[]) => void;
}

// Memoized FileItem component for better performance
const FileItem = React.memo<{
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
                onClick={(e) => onClick(item, e)}
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
                    {item.size ? formatFileSize(item.size) : '0 B'}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`file-grid-item ${isSelected ? 'selected' : ''} ${compactMode ? 'compact' : ''}`}
            onClick={(e) => onClick(item, e)}
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
                    {item.size ? formatFileSize(item.size) : '0 B'}
                </span>
                <span className="file-grid-date">
                    {formatDate(item.modified)}
                </span>
            </div>
        </div>
    );
});

export const FileList = React.memo<FileListProps>(({ currentPath, viewMode, onNavigate, onFileSelect, selectedFiles = [], onSelectionChange }) => {
    const { settings } = useSettings();
    const [directoryContents, setDirectoryContents] = useState<DirectoryContents | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [filters, setFilters] = useState({
        fileTypes: [] as string[],
        dateRange: { start: '', end: '' },
        sizeRange: { min: '', max: '' },
        nameContains: ''
    });

    // Sorting state - default to Windows File Explorer behavior (name, ascending)
    const [sortState, setSortState] = useState<SortState>({
        field: 'name', // Windows default
        direction: 'asc' // Windows default
    });

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

    // Sortable header component
    const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
        const isActive = sortState.field === field;
        const nextDirection = isActive && sortState.direction === 'asc' ? 'desc' : 'asc';

        const handleSort = () => {
            setSortState({ field, direction: nextDirection });
        };

        return (
            <div 
                className={`file-list-column sortable-header ${field}-column ${isActive ? 'active' : ''}`}
                onClick={handleSort}
                title={`Sort by ${field} (${isActive ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'click to sort'})`}
            >
                <span className="header-text">{children}</span>
                <span className="sort-indicator">
                    {isActive ? (
                        sortState.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                    ) : (
                        <FaSort />
                    )}
                </span>
            </div>
        );
    };

    // Reusable search bar component
    const SearchBarWithFilters = () => (
        <div className="file-search-bar">
            <div className="search-input-container">
                <input
                    type="text"
                    placeholder="Search in current folder..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <button 
                    className={`filter-button ${showFilters ? 'active' : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                    title="Show filters"
                >
                    <FaFilter />
                </button>
            </div>
            
            {showFilters && (
                <div className="filter-panel">
                    <div className="filter-row">
                        <label><FaFont /> Name contains:</label>
                        <input 
                            type="text"
                            value={filters.nameContains}
                            onChange={(e) => setFilters(prev => ({ ...prev, nameContains: e.target.value }))}
                            placeholder="Text in filename..."
                            className="filter-input"
                        />
                    </div>
                    
                    <div className="filter-row">
                        <label><FaCalendarAlt /> Date range:</label>
                        <div className="date-range">
                            <input 
                                type="date"
                                value={filters.dateRange.start}
                                onChange={(e) => setFilters(prev => ({ 
                                    ...prev, 
                                    dateRange: { ...prev.dateRange, start: e.target.value }
                                }))}
                                className="filter-input date-input"
                            />
                            <span>to</span>
                            <input 
                                type="date"
                                value={filters.dateRange.end}
                                onChange={(e) => setFilters(prev => ({ 
                                    ...prev, 
                                    dateRange: { ...prev.dateRange, end: e.target.value }
                                }))}
                                className="filter-input date-input"
                            />
                        </div>
                    </div>
                    
                    <div className="filter-row">
                        <label><FaRulerHorizontal /> Size range:</label>
                        <div className="size-range">
                            <input 
                                type="text"
                                value={filters.sizeRange.min}
                                onChange={(e) => setFilters(prev => ({ 
                                    ...prev, 
                                    sizeRange: { ...prev.sizeRange, min: e.target.value }
                                }))}
                                placeholder="Min (e.g., 1MB)"
                                className="filter-input size-input"
                            />
                            <span>to</span>
                            <input 
                                type="text"
                                value={filters.sizeRange.max}
                                onChange={(e) => setFilters(prev => ({ 
                                    ...prev, 
                                    sizeRange: { ...prev.sizeRange, max: e.target.value }
                                }))}
                                placeholder="Max (e.g., 100MB)"
                                className="filter-input size-input"
                            />
                        </div>
                    </div>
                    
                    <div className="filter-row">
                        <label>File types:</label>
                        <div className="file-type-checkboxes">
                            {['Images', 'Documents', 'Videos', 'Audio', 'Archives', 'Code'].map(type => (
                                <label key={type} className="checkbox-option">
                                    <input 
                                        type="checkbox"
                                        checked={filters.fileTypes.includes(type)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFilters(prev => ({ 
                                                    ...prev, 
                                                    fileTypes: [...prev.fileTypes, type]
                                                }));
                                            } else {
                                                setFilters(prev => ({ 
                                                    ...prev, 
                                                    fileTypes: prev.fileTypes.filter(t => t !== type)
                                                }));
                                            }
                                        }}
                                    />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    <div className="filter-actions">
                        <button 
                            className="clear-filters-button"
                            onClick={() => {
                                setFilters({
                                    fileTypes: [],
                                    dateRange: { start: '', end: '' },
                                    sizeRange: { min: '', max: '' },
                                    nameContains: ''
                                });
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    // Check if an item is selected
    const isItemSelected = useCallback((item: FileSystemItem) => {
        return selectedFiles.some(selected => selected.path === item.path);
    }, [selectedFiles]);

    // Handle item selection (single click)
    const handleItemSelection = useCallback((item: FileSystemItem, event?: React.MouseEvent) => {
        if (!onSelectionChange) return;

        let newSelection: FileSystemItem[];

        if (event?.ctrlKey || event?.metaKey) {
            // Ctrl/Cmd click - toggle selection
            if (isItemSelected(item)) {
                newSelection = selectedFiles.filter(selected => selected.path !== item.path);
            } else {
                newSelection = [...selectedFiles, item];
            }
        } else if (event?.shiftKey && selectedFiles.length > 0) {
            // Shift click - range selection
            const allItems = filteredItems;
            const lastSelectedIndex = allItems.findIndex(i => i.path === selectedFiles[selectedFiles.length - 1].path);
            const currentIndex = allItems.findIndex(i => i.path === item.path);

            if (lastSelectedIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastSelectedIndex, currentIndex);
                const end = Math.max(lastSelectedIndex, currentIndex);
                const rangeItems = allItems.slice(start, end + 1);

                // Combine existing selection with range
                const existingPaths = new Set(selectedFiles.map(f => f.path));
                const newItems = rangeItems.filter(i => !existingPaths.has(i.path));
                newSelection = [...selectedFiles, ...newItems];
            } else {
                newSelection = [item];
            }
        } else {
            // Single click - select only this item
            newSelection = [item];
        }

        onSelectionChange(newSelection);
        onFileSelect?.(newSelection);
    }, [selectedFiles, isItemSelected, onSelectionChange, onFileSelect]);

    // Handle item navigation (double click)
    const handleItemNavigation = useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            onNavigate?.(item.path);
        } else {
            // For files, you might want to open them or do something else
            console.log('Double-clicked file:', item.name);
        }
    }, [onNavigate]);

    // Get file size unit from settings context (no need for separate state)
    const fileSizeUnit = settings.fileSizeUnit;

    // Build list options from settings and current sort state
    const listOptions = useMemo(() => {
        return {
            includeHidden: settings.showHiddenFiles,
            sortBy: sortState.field === 'type' ? 'name' : sortState.field, // Backend doesn't handle 'type' sorting
            sortDirection: sortState.direction,
            maxItems: 5000,
        };
    }, [settings.showHiddenFiles, sortState]);

    // Get file icon based on extension and type
    const getFileIcon = useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            // Check if this is a drive root (e.g., C:\, D:\, etc.)
            const isDriveRoot = /^[A-Z]:\\?$/i.test(item.path);
            if (isDriveRoot) {
                // Try to determine drive type based on common patterns
                const driveLetter = item.path.charAt(0).toLowerCase();
                
                // System drive (usually C:)
                if (driveLetter === 'c') {
                    return <FaHdd className="file-icon drive-icon system-drive" />;
                }
                
                // Check if it's a removable drive or USB
                // This is a simplified check - you might want to enhance this with actual drive info
                const driveData = item as any; // Cast to access potential drive metadata
                if (driveData.flags?.isUSB || driveData.flags?.isRemovable) {
                    return <FaUsb className="file-icon drive-icon usb-drive" />;
                }
                
                // Default drive icon
                return <FaHdd className="file-icon drive-icon" />;
            }
            
            // Regular folder
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

            // Process directory items and update folder sizes for directories
            const itemsWithMetadata = await Promise.all(
                contents.items.map(async (item: FileSystemItem) => {
                    if (item.type === 'directory') {
                        try {
                            const folderMetadata = await window.electronAPI.fs.getFolderMetadata(item.path);
                            if (folderMetadata && typeof folderMetadata.totalSize === 'number') {
                                item.size = folderMetadata.totalSize;
                            }
                        } catch (error) {
                            // Ignore metadata errors for individual folders
                        }
                    }
                    return item;
                })
            );

            setDirectoryContents({ ...contents, items: itemsWithMetadata });

        } catch (err) {
            console.error('Failed to load directory:', err);
            setError(err instanceof Error ? err.message : 'Failed to load directory');
            setDirectoryContents(null);
        } finally {
            setLoading(false);
        }
    }, [listOptions]);

    // Handle file/folder clicks with memoization
    // Only navigate on a double click
    const handleItemClick = useCallback((item: FileSystemItem, event?: React.MouseEvent) => {
        // Prevent right-click from triggering selection
        if (event?.button === 2) return;

        handleItemSelection(item, event);
    }, [handleItemSelection]);

    // Handle double clicks with memoization
    const handleItemDoubleClick = useCallback((item: FileSystemItem) => {
        handleItemNavigation(item);
    }, [handleItemNavigation]);

    // Memoized directory items for performance
    const directoryItems = useMemo(() => directoryContents?.items || [], [directoryContents]);

    // Filtered and sorted items based on search term, filters, and sort state
    const filteredItems = useMemo(() => {
        let items = directoryItems;

        // Apply search term filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase().trim();
            items = items.filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                (item.extension && item.extension.toLowerCase().includes(searchLower))
            );
        }

        // Apply name contains filter
        if (filters.nameContains.trim()) {
            const nameFilter = filters.nameContains.toLowerCase().trim();
            items = items.filter(item =>
                item.name.toLowerCase().includes(nameFilter)
            );
        }

        // Apply file type filters
        if (filters.fileTypes.length > 0) {
            items = items.filter(item => {
                if (item.type === 'directory') return filters.fileTypes.includes('Folders');
                
                const ext = item.extension?.toLowerCase();
                const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'].includes(ext || '');
                const isDocument = ['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'].includes(ext || '');
                const isVideo = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'].includes(ext || '');
                const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'].includes(ext || '');
                const isArchive = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext || '');
                const isCode = ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.json', '.xml', '.sql'].includes(ext || '');

                return (
                    (filters.fileTypes.includes('Images') && isImage) ||
                    (filters.fileTypes.includes('Documents') && isDocument) ||
                    (filters.fileTypes.includes('Videos') && isVideo) ||
                    (filters.fileTypes.includes('Audio') && isAudio) ||
                    (filters.fileTypes.includes('Archives') && isArchive) ||
                    (filters.fileTypes.includes('Code') && isCode)
                );
            });
        }

        // Apply date range filter
        if (filters.dateRange.start || filters.dateRange.end) {
            items = items.filter(item => {
                const itemDate = new Date(item.modified);
                const startDate = filters.dateRange.start ? new Date(filters.dateRange.start) : null;
                const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;

                if (startDate && itemDate < startDate) return false;
                if (endDate && itemDate > endDate) return false;
                return true;
            });
        }

        // Apply size range filter
        if (filters.sizeRange.min || filters.sizeRange.max) {
            items = items.filter(item => {
                if (item.type === 'directory') return true; // Don't filter directories by size

                const parseSize = (sizeStr: string): number => {
                    if (!sizeStr) return 0;
                    const units = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
                    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i);
                    if (!match) return 0;
                    const value = parseFloat(match[1]);
                    const unit = match[2]?.toUpperCase() as keyof typeof units;
                    return value * (units[unit] || 1);
                };

                const minSize = parseSize(filters.sizeRange.min);
                const maxSize = parseSize(filters.sizeRange.max);

                if (minSize && item.size < minSize) return false;
                if (maxSize && item.size > maxSize) return false;
                return true;
            });
        }

        // Windows-style sorting logic (matches Windows File Explorer behavior)
        items.sort((a, b) => {
            // First, always sort directories before files (Windows default)
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }

            // Within the same type, apply sorting based on field
            let comparison = 0;
            
            switch (sortState.field) {
                case 'name':
                    // Windows uses natural alphanumeric sorting
                    comparison = windowsNaturalSort(a.name, b.name);
                    break;
                case 'size':
                    // Sort by size, but directories always show as 0 or unspecified
                    if (a.type === 'directory' && b.type === 'directory') {
                        // For directories, fall back to name sorting
                        comparison = windowsNaturalSort(a.name, b.name);
                    } else {
                        comparison = a.size - b.size;
                    }
                    break;
                case 'modified':
                    // Sort by date modified (most recent first by default)
                    comparison = b.modified.getTime() - a.modified.getTime();
                    break;
                case 'type':
                    if (a.type === 'directory' && b.type === 'directory') {
                        // For directories, sort by name
                        comparison = windowsNaturalSort(a.name, b.name);
                    } else if (a.type === 'file' && b.type === 'file') {
                        // For files, sort by extension first, then by name
                        const aExt = a.extension || '';
                        const bExt = b.extension || '';
                        comparison = aExt.localeCompare(bExt, undefined, { sensitivity: 'base' });
                        
                        // If extensions are the same, sort by name
                        if (comparison === 0) {
                            comparison = windowsNaturalSort(a.name, b.name);
                        }
                    }
                    break;
            }

            // Apply sort direction
            return sortState.direction === 'desc' ? -comparison : comparison;
        });

        return items;
    }, [directoryItems, searchTerm, filters, sortState]);

    // Clear selection when clicking on empty space
    const handleBackgroundClick = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onSelectionChange?.([]);
            onFileSelect?.([]);
        }
    }, [onSelectionChange, onFileSelect]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 'a') {
                // Ctrl+A: Select all
                event.preventDefault();
                onSelectionChange?.(filteredItems);
                onFileSelect?.(filteredItems);
            } else if (event.key === 'Escape') {
                // Escape: Clear selection
                onSelectionChange?.([]);
                onFileSelect?.([]);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filteredItems, onSelectionChange, onFileSelect]);

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

        // Always render the view with search bar, even when empty
        if (viewMode === 'list') {
            const rowHeight = settings.compactMode ? 32 : 40;
            return (
                <div className="file-list-view" onClick={handleBackgroundClick}>
                    <SearchBarWithFilters />
                    <div className="file-list-header">
                        <SortableHeader field="name">Name</SortableHeader>
                        <SortableHeader field="modified">Date modified</SortableHeader>
                        <SortableHeader field="type">Type</SortableHeader>
                        <SortableHeader field="size">Size</SortableHeader>
                    </div>
                    <div className="file-list-empty-content">
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
                </div>
            );
        }

        // Grid view empty state
        return (
            <div className="file-grid-view" onClick={handleBackgroundClick}>
                <SearchBarWithFilters />
                <div className="file-list-empty-content">
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
            </div>
        );
    }

    // Render file list in list view with virtualization for large directories
    if (viewMode === 'list') {
        const rowHeight = settings.compactMode ? 32 : 40; // adjust height based on compact mode
        return (
            <div className="file-list-view" onClick={handleBackgroundClick}>
                <SearchBarWithFilters />
                <div className="file-list-header">
                    <SortableHeader field="name">Name</SortableHeader>
                    <SortableHeader field="modified">Date modified</SortableHeader>
                    <SortableHeader field="type">Type</SortableHeader>
                    <SortableHeader field="size">Size</SortableHeader>
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
                                isSelected={isItemSelected(item)}
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
        <div className="file-grid-view" onClick={handleBackgroundClick}>
            <SearchBarWithFilters />
            <div className="file-grid-content">
                {filteredItems.map((item) => (
                    <FileItem
                        key={item.path}
                        item={item}
                        isSelected={isItemSelected(item)}
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
