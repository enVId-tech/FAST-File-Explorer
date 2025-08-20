import React, { useState, useCallback, useMemo } from 'react';
import { FaFolder, FaFile, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { FileSystemItem, DirectoryContents } from '../../../shared/ipc-channels';
import { formatFileSize } from '../../../shared/fileSizeUtils';
import { useSettings } from '../../contexts/SettingsContext';
import { useFileOperations } from '../../utils/FileOperations';
import { NavigationUtils } from '../../utils/NavigationUtils';
import { useKeyboardShortcuts } from '../../utils/UIUtils';
import './FileList.scss';

interface ModernFileListProps {
    currentPath: string;
    viewMode: 'list' | 'grid';
    onNavigate?: (path: string) => void;
    onFileSelect?: (file: FileSystemItem | FileSystemItem[]) => void;
    selectedFiles?: FileSystemItem[];
    onSelectionChange?: (files: FileSystemItem[]) => void;
    refreshTrigger?: number;
}

export const ModernFileList: React.FC<ModernFileListProps> = ({
    currentPath,
    viewMode,
    onNavigate,
    onFileSelect,
    selectedFiles = [],
    onSelectionChange,
    refreshTrigger
}) => {
    const { settings } = useSettings();
    const [directoryContents, setDirectoryContents] = useState<DirectoryContents | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Use the new file operations utilities
    const fileOps = useFileOperations(() => {
        loadDirectory(currentPath);
    });

    // Load directory with simplified error handling
    const loadDirectory = useCallback(async (path: string) => {
        if (!path) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const contents = await window.electronAPI.fs.getDirectoryContents(path, {
                includeHidden: settings.showHiddenFiles,
                sortBy: 'name',
                sortDirection: 'asc'
            });
            
            setDirectoryContents(contents);
        } catch (err) {
            console.error('Failed to load directory:', err);
            setError(err instanceof Error ? err.message : 'Failed to load directory');
        } finally {
            setLoading(false);
        }
    }, [settings.showHiddenFiles]);

    // Load directory when path changes
    React.useEffect(() => {
        loadDirectory(currentPath);
    }, [currentPath, loadDirectory, refreshTrigger]);

    // Handle file selection with improved logic
    const handleItemClick = useCallback((item: FileSystemItem, event?: React.MouseEvent) => {
        if (!onSelectionChange) return;

        let newSelection: FileSystemItem[];

        if (event?.ctrlKey || event?.metaKey) {
            // Multi-select
            const isSelected = selectedFiles.some(f => f.path === item.path);
            if (isSelected) {
                newSelection = selectedFiles.filter(f => f.path !== item.path);
            } else {
                newSelection = [...selectedFiles, item];
            }
        } else {
            // Single select
            newSelection = [item];
        }

        onSelectionChange(newSelection);
        onFileSelect?.(newSelection);
    }, [selectedFiles, onSelectionChange, onFileSelect]);

    // Handle double-click with modern file operations
    const handleItemDoubleClick = useCallback(async (item: FileSystemItem) => {
        if (item.type === 'directory') {
            // Use navigation validation
            const result = await window.electronAPI.navigation.navigateToPath(item.path);
            if (result.success && result.path) {
                onNavigate?.(result.path);
            } else {
                console.error('Navigation failed:', result.error);
            }
        } else {
            // Use modern file opening
            await fileOps.openFile(item, true); // Use fast open
        }
    }, [onNavigate, fileOps]);

    // Keyboard shortcuts for file operations
    const keyboardShortcuts = useMemo(() => ({
        onCopy: () => fileOps.copyFiles(selectedFiles),
        onCut: () => fileOps.cutFiles(selectedFiles),
        onPaste: () => fileOps.pasteFiles(currentPath),
        onDelete: () => fileOps.deleteFiles(selectedFiles),
        onRename: () => {
            if (selectedFiles.length === 1) {
                const newName = prompt('Enter new name:', selectedFiles[0].name);
                if (newName && newName !== selectedFiles[0].name) {
                    fileOps.renameFile(selectedFiles[0], newName);
                }
            }
        },
        onSelectAll: () => {
            if (directoryContents?.items) {
                onSelectionChange?.(directoryContents.items);
            }
        },
        onRefresh: () => loadDirectory(currentPath)
    }), [fileOps, selectedFiles, currentPath, directoryContents, onSelectionChange]);

    useKeyboardShortcuts(selectedFiles, keyboardShortcuts);

    // Check if item is selected
    const isSelected = useCallback((item: FileSystemItem) => {
        return selectedFiles.some(selected => selected.path === item.path);
    }, [selectedFiles]);

    // Get file icon
    const getFileIcon = useCallback((item: FileSystemItem) => {
        if (item.type === 'directory') {
            return <FaFolder className="file-icon directory-icon" />;
        }
        return <FaFile className="file-icon file-icon" />;
    }, []);

    if (loading) {
        return (
            <div className="file-list-loading">
                <FaSpinner className="spinner" />
                <span>Loading...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="file-list-error">
                <FaExclamationTriangle />
                <span>{error}</span>
                <button onClick={() => loadDirectory(currentPath)}>Retry</button>
            </div>
        );
    }

    if (!directoryContents?.items.length) {
        return (
            <div className="file-list-empty">
                <span>This folder is empty</span>
            </div>
        );
    }

    return (
        <div className={`modern-file-list ${viewMode}`}>
            {viewMode === 'list' && (
                <div className="file-list-header">
                    <div className="column-header name-column">Name</div>
                    <div className="column-header size-column">Size</div>
                    <div className="column-header modified-column">Modified</div>
                </div>
            )}
            
            <div className="file-list-items">
                {directoryContents.items.map((item) => (
                    <div
                        key={item.path}
                        className={`file-item ${isSelected(item) ? 'selected' : ''} ${viewMode}`}
                        onClick={(e) => handleItemClick(item, e)}
                        onDoubleClick={() => handleItemDoubleClick(item)}
                    >
                        {getFileIcon(item)}
                        <span className="file-name">{item.name}</span>
                        
                        {viewMode === 'list' && (
                            <>
                                <span className="file-size">
                                    {item.type === 'file' ? formatFileSize(item.size, settings.fileSizeUnit) : '-'}
                                </span>
                                <span className="file-modified">
                                    {new Date(item.modified).toLocaleString()}
                                </span>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ModernFileList;
