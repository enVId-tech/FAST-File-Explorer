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
import { useDebounce, useThrottle } from '../../hooks/usePerformance';
import { useFileExplorerUI } from '../../utils';
import { EnhancedContextMenu } from '../EnhancedContextMenu/EnhancedContextMenu';
import { FileItem } from './FileItem';
import { windowsNaturalSort, SortField, SortDirection, SortState } from '../FileUtils/fileUtils';
import './FileList.scss';
import { VirtualizedList } from '../VirtualizedList/VirtualizedList';

interface FileListProps {
    currentPath: string;
    viewMode: 'list' | 'grid';
    onNavigate?: (path: string) => void;
    onFileSelect?: (file: FileSystemItem | FileSystemItem[]) => void;
    selectedFiles?: FileSystemItem[];
    onSelectionChange?: (files: FileSystemItem[]) => void;
    refreshTrigger?: number; // Add refresh trigger prop
}

export const FileList = React.memo<FileListProps>(({ currentPath, viewMode, onNavigate, onFileSelect, selectedFiles = [], onSelectionChange, refreshTrigger }) => {
    const { settings } = useSettings();
    const fileExplorer = useFileExplorerUI();
    const { clipboardState } = fileExplorer;
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

    // Debounced filter values for performance optimization
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const debouncedFilters = useDebounce(filters, 300);

    // Sorting state - default to Windows File Explorer behavior (name, ascending)
    const [sortState, setSortState] = useState<SortState>({
        field: 'name', // Windows default
        direction: 'asc' // Windows default
    });

    // Enhanced context menu state
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        selectedItems: FileSystemItem[];
    }>({
        visible: false,
        x: 0,
        y: 0,
        selectedItems: [],
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

    // Handle item navigation (double click) - ultra-fast optimized version
    const handleItemNavigation = useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            onNavigate?.(item.path);
        } else {
            // Performance timing for optimization verification
            const startTime = performance.now();

            // For files, use ultra-fast fire-and-forget opening
            // This has zero latency as it doesn't wait for any response
            window.electronAPI.system.openFileFast(item.path);

            const endTime = performance.now();
            console.log(`Fast file opening took ${(endTime - startTime).toFixed(2)}ms for: ${item.name}`);
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
                // Try to determine drive type based on common patterns and drive letter
                const driveLetter = item.path.charAt(0).toLowerCase();

                // System drive (usually C:)
                if (driveLetter === 'c') {
                    return <FaHdd className="file-icon drive-icon system-drive" title="System Drive" />;
                }

                // Common removable drive patterns (D:, E:, F:, etc. are often removable)
                // This is a simplified heuristic - in a real implementation you might want to
                // get actual drive information from the backend
                if (['d', 'e', 'f', 'g', 'h'].includes(driveLetter)) {
                    return <FaUsb className="file-icon drive-icon usb-drive" title="Removable Drive" />;
                }

                // Default drive icon for other drives
                return <FaHdd className="file-icon drive-icon" title="Local Drive" />;
            }

            // Regular folder
            return <FaFolder className="file-icon directory-icon" title="Folder" />;
        }

        const ext = item.extension?.toLowerCase();
        switch (ext) {
            case '.jpg':
            case '.jpeg':
            case '.png':
            case '.gif':
            case '.webp':
            case '.svg':
                return <FaFileImage className="file-icon image-icon" title="Image File" />;
            case '.mp4':
            case '.avi':
            case '.mkv':
            case '.mov':
            case '.wmv':
                return <FaFileVideo className="file-icon video-icon" title="Video File" />;
            case '.mp3':
            case '.wav':
            case '.flac':
            case '.aac':
                return <FaFileAudio className="file-icon audio-icon" title="Audio File" />;
            case '.zip':
            case '.rar':
            case '.7z':
            case '.tar':
                return <FaFileArchive className="file-icon archive-icon" title="Archive File" />;
            case '.js':
            case '.ts':
            case '.jsx':
            case '.tsx':
            case '.html':
            case '.css':
            case '.scss':
            case '.json':
                return <FaFileCode className="file-icon code-icon" title="Code File" />;
            case '.pdf':
                return <FaFilePdf className="file-icon pdf-icon" title="PDF Document" />;
            case '.doc':
            case '.docx':
                return <FaFileWord className="file-icon word-icon" title="Word Document" />;
            case '.xls':
            case '.xlsx':
                return <FaFileExcel className="file-icon excel-icon" title="Excel Spreadsheet" />;
            case '.ppt':
            case '.pptx':
                return <FaFilePowerpoint className="file-icon powerpoint-icon" title="PowerPoint Presentation" />;
            default:
                return <FaFile className="file-icon default-icon" title="File" />;
        }
    }, []);

    // Format file size using user's preferred unit system
    const formatFileSizeWithSettings = useCallback((size: number) => {
        if (size === -1) return 'Calculating...'; // Loading state
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

    // Enhanced context menu handlers
    const handleContextMenu = useCallback((event: React.MouseEvent, item: FileSystemItem) => {
        event.preventDefault();

        // If the clicked item is not in the current selection, select only it
        // Otherwise, keep the current selection for multi-item operations
        const itemsForContextMenu = isItemSelected(item)
            ? selectedFiles.length > 0 ? selectedFiles : [item]
            : [item];

        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            selectedItems: itemsForContextMenu,
        });
    }, [isItemSelected, selectedFiles]);

    const handleBackgroundContextMenu = useCallback((event: React.MouseEvent) => {
        // Only show context menu if clicking on empty area
        if (event.target === event.currentTarget) {
            event.preventDefault();
            setContextMenu({
                visible: true,
                x: event.clientX,
                y: event.clientY,
                selectedItems: [], // No items selected for background menu
            });
        }
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

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

            // Show files immediately for better perceived performance
            setDirectoryContents(contents);
            setLoading(false);

            // Load folder metadata asynchronously without blocking the UI
            const folderItems = contents.items.filter(item => item.type === 'directory');
            if (folderItems.length > 0) {
                // Concurrency-limited processing to reduce memory/CPU spikes
                const CONCURRENCY = 3;
                let index = 0;
                let cancelled = false;
                const isMounted = { current: true };
                // Ensure we don't update state after unmount or when path changes
                const currentPathSnapshot = path;
                const runNext = async () => {
                    while (!cancelled && index < folderItems.length) {
                        const item = folderItems[index++];
                        try {
                            const folderMetadata = await window.electronAPI.fs.getFolderMetadata(item.path);
                            if (!isMounted.current || currentPath !== currentPathSnapshot) return;
                            if (folderMetadata && typeof folderMetadata.totalSize === 'number') {
                                setDirectoryContents(prev => {
                                    if (!prev) return prev;
                                    const updatedItems = prev.items.map(prevItem =>
                                        prevItem.path === item.path
                                            ? { ...prevItem, size: folderMetadata.totalSize }
                                            : prevItem
                                    );
                                    return { ...prev, items: updatedItems };
                                });
                            }
                        } catch (error) {
                            if (!isMounted.current || currentPath !== currentPathSnapshot) return;
                            setDirectoryContents(prev => {
                                if (!prev) return prev;
                                const updatedItems = prev.items.map(prevItem =>
                                    prevItem.path === item.path
                                        ? { ...prevItem, size: -1 }
                                        : prevItem
                                );
                                return { ...prev, items: updatedItems };
                            });
                        }
                    }
                };
                const workers = Array.from({ length: Math.min(CONCURRENCY, folderItems.length) }, () => runNext());
                Promise.all(workers).catch(err => console.warn('Some folder metadata tasks failed:', err));
                // Cleanup function to cancel when unmounting or path changes
                return () => { cancelled = true; isMounted.current = false; };
            }

        } catch (err) {
            console.error('Failed to load directory:', err);
            setError(err instanceof Error ? err.message : 'Failed to load directory');
            setDirectoryContents(null);
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

        // Apply search term filter (using debounced value)
        if (debouncedSearchTerm.trim()) {
            const searchLower = debouncedSearchTerm.toLowerCase().trim();
            items = items.filter(item =>
                item.name.toLowerCase().includes(searchLower) ||
                (item.extension && item.extension.toLowerCase().includes(searchLower))
            );
        }

        // Apply name contains filter (using debounced value)
        if (debouncedFilters.nameContains.trim()) {
            const nameFilter = debouncedFilters.nameContains.toLowerCase().trim();
            items = items.filter(item =>
                item.name.toLowerCase().includes(nameFilter)
            );
        }

        // Apply file type filters (using debounced value)
        if (debouncedFilters.fileTypes.length > 0) {
            items = items.filter(item => {
                if (item.type === 'directory') return debouncedFilters.fileTypes.includes('Folders');

                const ext = item.extension?.toLowerCase();
                const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'].includes(ext || '');
                const isDocument = ['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt'].includes(ext || '');
                const isVideo = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'].includes(ext || '');
                const isAudio = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'].includes(ext || '');
                const isArchive = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'].includes(ext || '');
                const isCode = ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.json', '.xml', '.sql'].includes(ext || '');

                return (
                    (debouncedFilters.fileTypes.includes('Images') && isImage) ||
                    (debouncedFilters.fileTypes.includes('Documents') && isDocument) ||
                    (debouncedFilters.fileTypes.includes('Videos') && isVideo) ||
                    (debouncedFilters.fileTypes.includes('Audio') && isAudio) ||
                    (debouncedFilters.fileTypes.includes('Archives') && isArchive) ||
                    (debouncedFilters.fileTypes.includes('Code') && isCode)
                );
            });
        }

        // Apply date range filter (using debounced value)
        if (debouncedFilters.dateRange.start || debouncedFilters.dateRange.end) {
            items = items.filter(item => {
                const itemDate = new Date(item.modified);
                const startDate = debouncedFilters.dateRange.start ? new Date(debouncedFilters.dateRange.start) : null;
                const endDate = debouncedFilters.dateRange.end ? new Date(debouncedFilters.dateRange.end) : null;

                if (startDate && itemDate < startDate) return false;
                if (endDate && itemDate > endDate) return false;
                return true;
            });
        }

        // Apply size range filter (using debounced value)
        if (debouncedFilters.sizeRange.min || debouncedFilters.sizeRange.max) {
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

                const minSize = parseSize(debouncedFilters.sizeRange.min);
                const maxSize = parseSize(debouncedFilters.sizeRange.max);

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
    }, [directoryItems, debouncedSearchTerm, debouncedFilters, sortState]);

    // Keyboard shortcut action handlers
    const handleCopyFiles = useCallback(async () => {
        await fileExplorer.handleCopy();
    }, [fileExplorer]);

    const handleCutFiles = useCallback(async () => {
        await fileExplorer.handleCut();
    }, [fileExplorer]);

    const handlePasteFiles = useCallback(async () => {
        await fileExplorer.handlePaste();
        loadDirectory(currentPath); // Refresh the directory
    }, [fileExplorer, currentPath]);

    const handleDeleteFiles = useCallback(async () => {
        await fileExplorer.handleDelete();
        onSelectionChange?.([]);
        loadDirectory(currentPath); // Refresh the directory
    }, [fileExplorer, currentPath, onSelectionChange]);

    const handleRenameFile = useCallback(async () => {
        await fileExplorer.handleRename();
        loadDirectory(currentPath); // Refresh the directory
    }, [fileExplorer, currentPath]);

    const handleNewFolder = useCallback(async () => {
        await fileExplorer.handleNewFolder();
        loadDirectory(currentPath); // Refresh the directory
    }, [fileExplorer, currentPath]);

    const handleOpenFiles = useCallback(async () => {
        if (selectedFiles.length === 0) return;
        try {
            for (const item of selectedFiles) {
                if (item.type === 'directory') {
                    onNavigate?.(item.path);
                } else {
                    await window.electronAPI.system.openFileFast(item.path);
                }
            }
        } catch (error) {
            console.error('Failed to open files:', error);
        }
    }, [selectedFiles, onNavigate]);

    // Clear selection when clicking on empty space
    const handleBackgroundClick = useCallback((event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onSelectionChange?.([]);
            onFileSelect?.([]);
        }
    }, [onSelectionChange, onFileSelect]);

    // Handle keyboard navigation and shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't handle shortcuts if user is typing in an input
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            const isCtrl = event.ctrlKey;
            const isShift = event.shiftKey;
            const key = event.key.toLowerCase();

            // Ctrl+A - Select all
            if (isCtrl && key === 'a') {
                event.preventDefault();
                onSelectionChange?.(filteredItems);
                onFileSelect?.(filteredItems);
                return;
            }

            // Escape - Clear selection
            if (key === 'escape') {
                onSelectionChange?.([]);
                onFileSelect?.([]);
                return;
            }

            // Ctrl+C - Copy
            if (isCtrl && key === 'c' && selectedFiles.length > 0) {
                event.preventDefault();
                handleCopyFiles();
                return;
            }

            // Ctrl+X - Cut
            if (isCtrl && key === 'x' && selectedFiles.length > 0) {
                event.preventDefault();
                handleCutFiles();
                return;
            }

            // Ctrl+V - Paste
            if (isCtrl && key === 'v') {
                event.preventDefault();
                handlePasteFiles();
                return;
            }

            // Delete - Delete files
            if (key === 'delete' && selectedFiles.length > 0) {
                event.preventDefault();
                handleDeleteFiles();
                return;
            }

            // F2 - Rename (single file only)
            if (key === 'f2' && selectedFiles.length === 1) {
                event.preventDefault();
                handleRenameFile();
                return;
            }

            // Ctrl+Shift+N - New folder
            if (isCtrl && isShift && key === 'n') {
                event.preventDefault();
                handleNewFolder();
                return;
            }

            // F5 - Refresh
            if (key === 'f5') {
                event.preventDefault();
                loadDirectory(currentPath);
                return;
            }

            // Enter - Open selected files
            if (key === 'enter' && selectedFiles.length > 0) {
                event.preventDefault();
                handleOpenFiles();
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [filteredItems, selectedFiles, currentPath, onSelectionChange, onFileSelect, handleCopyFiles, handleCutFiles, handlePasteFiles, handleDeleteFiles, handleRenameFile, handleNewFolder, handleOpenFiles, loadDirectory]);

    // Load directory when path or list options change
    useEffect(() => {
        loadDirectory(currentPath);
    }, [currentPath, loadDirectory, refreshTrigger]);

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
            <div className="file-grid-view" onClick={handleBackgroundClick} onContextMenu={handleBackgroundContextMenu}>
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
            <div className="file-list-view" onClick={handleBackgroundClick} onContextMenu={handleBackgroundContextMenu}>
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
                                clipboardState={clipboardState}
                            />
                        );
                    }}
                />

                {/* Context Menu */}
                {contextMenu.visible && (
                    <EnhancedContextMenu
                        isVisible={contextMenu.visible}
                        position={{ x: contextMenu.x, y: contextMenu.y }}
                        selectedItems={contextMenu.selectedItems}
                        onClose={handleCloseContextMenu}
                        onNavigate={onNavigate}
                    />
                )}
            </div>
        );
    }

    // Render file list in grid view
    return (
        <div className="file-grid-view" onClick={handleBackgroundClick} onContextMenu={handleBackgroundContextMenu}>
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
                        clipboardState={clipboardState}
                    />
                ))}
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <EnhancedContextMenu
                    isVisible={contextMenu.visible}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    selectedItems={contextMenu.selectedItems}
                    onClose={handleCloseContextMenu}
                    onNavigate={onNavigate}
                />
            )}
        </div>
    );
});
