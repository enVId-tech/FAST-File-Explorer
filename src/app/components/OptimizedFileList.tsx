import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FaFile, FaFolder, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { FileSystemItem, DirectoryContents } from '../../shared/ipc-channels';
import { useSettings } from '../contexts/SettingsContext';
import { useDebounce, useThrottle } from '../hooks/usePerformance';
import './FileList.scss';

interface OptimizedFileListProps {
  currentPath: string;
  onNavigate?: (path: string) => void;
  onFileSelect?: (item: FileSystemItem) => void;
  className?: string;
}

// Memoized file item component
const FileListItem = React.memo<{
  item: FileSystemItem;
  isSelected: boolean;
  onNavigate?: (path: string) => void;
  onFileSelect?: (item: FileSystemItem) => void;
  onContextMenu?: (event: React.MouseEvent, item: FileSystemItem) => void;
  fileSizeUnit: string;
}>(({ item, isSelected, onNavigate, onFileSelect, onContextMenu, fileSizeUnit }) => {

  const formatFileSize = useCallback((size: number): string => {
    if (size === 0) return '-';
    const units = fileSizeUnit === 'binary'
      ? { k: 1024, sizes: ['B', 'KiB', 'MiB', 'GiB', 'TiB'] }
      : { k: 1000, sizes: ['B', 'KB', 'MB', 'GB', 'TB'] };

    const i = Math.floor(Math.log(size) / Math.log(units.k));
    return `${(size / Math.pow(units.k, i)).toFixed(1)} ${units.sizes[i]}`;
  }, [fileSizeUnit]);

  const handleClick = useCallback(() => {
    if (item.type === 'directory') {
      onNavigate?.(item.path);
    } else {
      onFileSelect?.(item);
    }
  }, [item, onNavigate, onFileSelect]);

  const handleDoubleClick = useCallback(() => {
    if (item.type === 'directory') {
      onNavigate?.(item.path);
    }
  }, [item, onNavigate]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    onContextMenu?.(event, item);
  }, [item, onContextMenu]);

  return (
    <div
      className={`file-list-item ${item.type} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
    >
      <div className="item-icon">
        {item.type === 'directory' ? <FaFolder /> : <FaFile />}
      </div>
      <div className="item-name" title={item.name}>
        {item.name}
      </div>
      <div className="item-size">
        {item.type === 'file' ? formatFileSize(item.size) : '—'}
      </div>
      <div className="item-modified">
        {new Date(item.modified).toLocaleDateString()}
      </div>
    </div>
  );
});

export const OptimizedFileList: React.FC<OptimizedFileListProps> = ({
  currentPath,
  onNavigate,
  onFileSelect,
  className = ''
}) => {
  const { settings } = useSettings();
  const [directoryContents, setDirectoryContents] = useState<DirectoryContents | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
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

  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Throttle directory loading to prevent excessive API calls
  const throttledLoadDirectory = useThrottle(
    useCallback(async (path: string) => {
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
    }, []),
    500
  );

  // Build list options from settings
  const listOptions = useMemo(() => ({
    includeHidden: settings.showHiddenFiles,
    sortBy: settings.defaultSortBy === 'type' ? 'name' : settings.defaultSortBy,
    sortDirection: settings.defaultSortOrder as 'asc' | 'desc',
    maxItems: 5000 // Limit for performance
  }), [settings.showHiddenFiles, settings.defaultSortBy, settings.defaultSortOrder]);

  // Memoized filtered and sorted items
  const processedItems = useMemo(() => {
    if (!directoryContents?.items) return [];

    let items = directoryContents.items;

    // Filter by search term
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase().trim();
      items = items.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        (item.extension && item.extension.toLowerCase().includes(searchLower))
      );
    }

    return items;
  }, [directoryContents?.items, debouncedSearchTerm]);

  // Optimized item selection handlers
  const handleItemSelect = useCallback((item: FileSystemItem, event: React.MouseEvent) => {
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.path)) {
          newSet.delete(item.path);
        } else {
          newSet.add(item.path);
        }
        return newSet;
      });
    } else {
      // Single select
      setSelectedItems(new Set([item.path]));
    }
  }, []);

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

  // Load directory when path changes
  useEffect(() => {
    throttledLoadDirectory(currentPath);
  }, [currentPath, throttledLoadDirectory]);

  // Clear search and selection when path changes
  useEffect(() => {
    setSearchTerm('');
    setSelectedItems(new Set());
  }, [currentPath]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    if (contextMenu.visible) {
      const handleClickOutside = () => handleCloseContextMenu();
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.visible, handleCloseContextMenu]);

  // Loading state
  if (loading) {
    return (
      <div className="optimized-file-list-loading">
        <FaSpinner className="loading-spinner" />
        <span>Loading directory...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="optimized-file-list-error">
        <FaExclamationTriangle className="error-icon" />
        <span>Failed to load directory</span>
        <small>{error}</small>
        <button onClick={() => throttledLoadDirectory(currentPath)}>Retry</button>
      </div>
    );
  }

  // Empty state
  if (!directoryContents || processedItems.length === 0) {
    const isSearching = debouncedSearchTerm.trim().length > 0;
    const hasItems = directoryContents?.items && directoryContents.items.length > 0;

    return (
      <div className="optimized-file-list-empty">
        <FaFolder className="empty-icon" />
        {isSearching && hasItems ? (
          <>
            <span>No files found matching "{debouncedSearchTerm}"</span>
            <small>Try a different search term</small>
          </>
        ) : (
          <>
            <span>This folder is empty</span>
            <small>No files or folders to display</small>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`optimized-file-list ${className}`}>
      {/* Search bar */}
      <div className="file-list-search">
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm !== debouncedSearchTerm && (
          <div className="search-loading">
            <FaSpinner className="search-spinner" />
          </div>
        )}
      </div>

      {/* Column headers */}
      <div className="file-list-header">
        <div className="header-name">Name</div>
        <div className="header-size">Size</div>
        <div className="header-modified">Modified</div>
      </div>

      {/* File list */}
      <div className="file-list-content" role="grid">
        {processedItems.map((item) => (
          <FileListItem
            key={item.path}
            item={item}
            isSelected={selectedItems.has(item.path)}
            onNavigate={onNavigate}
            onFileSelect={onFileSelect}
            onContextMenu={handleContextMenu}
            fileSizeUnit={settings.fileSizeUnit}
          />
        ))}
      </div>

      {/* Status bar */}
      <div className="file-list-status">
        <span>{processedItems.length} items</span>
        {directoryContents.totalItems > processedItems.length && (
          <span> • {directoryContents.totalItems - processedItems.length} hidden</span>
        )}
        {selectedItems.size > 0 && (
          <span> • {selectedItems.size} selected</span>
        )}
      </div>
    </div>
  );
};
