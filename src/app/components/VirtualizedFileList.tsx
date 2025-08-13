import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { FaFile, FaFolder, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { useSettings } from '../../contexts/SettingsContext';
import './FileList.scss';

interface VirtualizedFileListProps {
  currentPath: string;
  onNavigate?: (path: string) => void;
  onFileSelect?: (item: FileSystemItem) => void;
  height?: number;
  width?: number;
}

interface DirectoryContents {
  items: FileSystemItem[];
  totalItems: number;
  path: string;
  parent?: string;
  error?: string;
}

// Individual file item component - memoized for performance
const FileItem = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    items: FileSystemItem[];
    onNavigate?: (path: string) => void;
    onFileSelect?: (item: FileSystemItem) => void;
    fileSizeUnit: string;
  };
}>(({ index, style, data }) => {
  const { items, onNavigate, onFileSelect, fileSizeUnit } = data;
  const item = items[index];
  
  if (!item) return null;

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

  return (
    <div 
      style={style}
      className={`file-item ${item.type}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="file-icon">
        {item.type === 'directory' ? <FaFolder /> : <FaFile />}
      </div>
      <div className="file-name" title={item.name}>
        {item.name}
      </div>
      <div className="file-size">
        {item.type === 'file' ? formatFileSize(item.size) : '-'}
      </div>
      <div className="file-modified">
        {new Date(item.modified).toLocaleString()}
      </div>
    </div>
  );
});

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = ({
  currentPath,
  onNavigate,
  onFileSelect,
  height = 400,
  width = 800
}) => {
  const { settings } = useSettings();
  const [directoryContents, setDirectoryContents] = useState<DirectoryContents | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Build list options from settings
  const listOptions = useMemo(() => ({
    includeHidden: settings.showHiddenFiles,
    sortBy: settings.defaultSortBy === 'type' ? 'name' : settings.defaultSortBy,
    sortDirection: settings.defaultSortOrder as 'asc' | 'desc',
    maxItems: 10000 // Increased for virtualization
  }), [settings.showHiddenFiles, settings.defaultSortBy, settings.defaultSortOrder]);

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

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!directoryContents?.items) return [];
    
    if (!searchTerm.trim()) {
      return directoryContents.items;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    return directoryContents.items.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      (item.extension && item.extension.toLowerCase().includes(searchLower))
    );
  }, [directoryContents?.items, searchTerm]);

  // Memoized data for virtual list
  const listData = useMemo(() => ({
    items: filteredItems,
    onNavigate,
    onFileSelect,
    fileSizeUnit: settings.fileSizeUnit
  }), [filteredItems, onNavigate, onFileSelect, settings.fileSizeUnit]);

  // Load directory when path changes
  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  // Clear search when path changes
  useEffect(() => {
    setSearchTerm('');
  }, [currentPath]);

  // Loading state
  if (loading) {
    return (
      <div className="virtualized-file-list-loading">
        <FaSpinner className="loading-spinner" />
        <span>Loading directory...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="virtualized-file-list-error">
        <FaExclamationTriangle className="error-icon" />
        <span>Failed to load directory</span>
        <small>{error}</small>
        <button onClick={() => loadDirectory(currentPath)}>Retry</button>
      </div>
    );
  }

  // Empty state
  if (!directoryContents || filteredItems.length === 0) {
    const isSearching = searchTerm.trim().length > 0;
    const hasItems = directoryContents?.items && directoryContents.items.length > 0;
    
    return (
      <div className="virtualized-file-list-empty">
        <FaFolder className="empty-icon" />
        {isSearching && hasItems ? (
          <>
            <span>No files found matching "{searchTerm}"</span>
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
    <div className="virtualized-file-list">
      {/* Search bar */}
      <div className="file-list-search">
        <input
          type="text"
          placeholder="Search files and folders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* File list header */}
      <div className="file-list-header">
        <div className="header-name">Name</div>
        <div className="header-size">Size</div>
        <div className="header-modified">Modified</div>
      </div>

      {/* Virtualized list */}
      <List
        height={height - 80} // Account for search and header
        itemCount={filteredItems.length}
        itemSize={32} // Height of each item
        width={width}
        itemData={listData}
      >
        {FileItem}
      </List>

      {/* Status bar */}
      <div className="file-list-status">
        <span>{filteredItems.length} items</span>
        {directoryContents.totalItems > filteredItems.length && (
          <span> • {directoryContents.totalItems - filteredItems.length} hidden</span>
        )}
      </div>
    </div>
  );
};
