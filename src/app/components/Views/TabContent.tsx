import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaFolder, FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaCopy, FaCut, FaPaste, FaTrash, FaEdit, FaFolderPlus, FaCog, FaArrowLeft, FaArrowRight, FaHome, FaSearch, FaThLarge, FaBars, FaHdd, FaDesktop, FaDownload, FaMusic, FaVideo, FaFilePdf, FaSortAlphaDown, FaSortAlphaUp, FaSortNumericDown, FaSortNumericUp, FaChevronDown, FaPalette, FaSun, FaMoon, FaWindows, FaClock, FaShare, FaEnvelope, FaPrint, FaFax, FaUsers, FaInfoCircle, FaEye, FaTimes, FaFilter, FaCalendarAlt, FaRulerHorizontal, FaFont } from 'react-icons/fa';
import { DetailsPanel } from '../DetailsPanel';
import { RecentsView } from './RecentsView';
import { ThisPCView } from './ThisPCView';
import { FileList } from './FileList';
import { SettingsMenu } from '../SettingsMenu/SettingsMenu';
import { Drive, FileItem } from 'shared/file-data';
import { FileSystemItem } from '../../../shared/ipc-channels';
import './RecentsThisPCStyles.scss';

// Drive Item Component with usage bar
interface DriveItemProps {
    drive: Drive;
    active: boolean;
    onClick: () => void;
    onHover: (drive: Drive) => void;
}

const DriveItem: React.FC<DriveItemProps> = React.memo(({ drive, active, onClick, onHover }) => {
    const formatBytes = useCallback((bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }, []);

    const { usagePercentage, usageColor } = useMemo(() => {
        const percentage = drive.total > 0 ? (drive.used / drive.total) * 100 : 0;
        const getUsageColor = (percentage: number): string => {
            if (percentage < 70) return 'var(--accent-color)';
            if (percentage < 85) return '#f59e0b';
            return '#ef4444';
        };
        return {
            usagePercentage: percentage,
            usageColor: getUsageColor(percentage)
        };
    }, [drive.total, drive.used]);

    const handleMouseEnter = useCallback(() => {
        onHover(drive);
    }, [drive, onHover]);

    return (
        <div
            className={`sidebar-item drive-item ${active ? 'active' : ''}`}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
        >
            <div className="drive-main">
                <span className="sidebar-icon"><FaHdd /></span>
                <div className="drive-info">
                    <div className="drive-name">{drive.driveName} ({drive.drivePath})</div>
                    <div className="drive-usage">
                        <div className="usage-bar">
                            <div
                                className="usage-fill"
                                style={{
                                    width: `${usagePercentage}%`,
                                    backgroundColor: usageColor
                                }}
                            ></div>
                        </div>
                        <div className="usage-text">
                            {formatBytes(drive.available)} free of {formatBytes(drive.total)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

interface TabContentProps {
    tabId: string;
    isActive: boolean;
    viewMode: string;
    setViewMode: (mode: string) => void;
    drives: Drive[];
    drivesLoading?: boolean;
    drivesError?: string | null;
    onRefreshDrives?: () => Promise<void>;
}

export const TabContent: React.FC<TabContentProps> = React.memo(({ tabId, isActive, viewMode, setViewMode, drives, drivesLoading = false, drivesError = null, onRefreshDrives }) => {
    const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
    const [hoveredDrive, setHoveredDrive] = useState<Drive | null>(null);
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentView, setCurrentView] = useState<'thispc' | 'recents' | 'folder'>('thispc');
    const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'share' | 'view' | 'manage' | 'organize' | 'tools' | 'help'>('home');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    // File browser state
    const [currentPath, setCurrentPath] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<FileSystemItem[]>([]);

    // Clipboard state management
    const [clipboardState, setClipboardState] = useState<{
        operation: 'copy' | 'cut' | null;
        files: string[];
    }>({ operation: null, files: [] });

    // File list refresh trigger
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Helper function to trigger file list refresh
    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // Clipboard state computed values
    const clipboardHasFiles = clipboardState.files.length > 0;

    // Sync clipboard state with the system clipboard
    useEffect(() => {
        const syncClipboardState = async () => {
            try {
                const hasFiles = await window.electronAPI.clipboard.hasFiles();
                const state = await window.electronAPI.clipboard.getState();
                setClipboardState(state);
            } catch (error) {
                console.error('Failed to sync clipboard state:', error);
            }
        };

        // Initial sync
        syncClipboardState();

        // Listen for clipboard state changes
        const handleClipboardStateChange = (event: CustomEvent) => {
            const { operation, files } = event.detail;
            setClipboardState({ operation, files });
        };

        document.addEventListener('clipboard-state-changed', handleClipboardStateChange as EventListener);

        return () => {
            document.removeEventListener('clipboard-state-changed', handleClipboardStateChange as EventListener);
        };
    }, []);

    // Action handlers for context bar
    const handleCopyFiles = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        try {
            const paths = selectedFiles.map(file => file.path);
            await window.electronAPI.clipboard.copyFiles(paths);
            setClipboardState({ operation: 'copy', files: paths });

            // Broadcast clipboard state change
            document.dispatchEvent(new CustomEvent('clipboard-state-changed', {
                detail: { operation: 'copy', files: paths }
            }));

            console.log('Copied files:', paths);
        } catch (error) {
            console.error('Failed to copy files:', error);
        }
    }, [selectedFiles]);

    const handleCutFiles = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        try {
            const paths = selectedFiles.map(file => file.path);
            await window.electronAPI.clipboard.cutFiles(paths);
            setClipboardState({ operation: 'cut', files: paths });

            // Broadcast clipboard state change
            document.dispatchEvent(new CustomEvent('clipboard-state-changed', {
                detail: { operation: 'cut', files: paths }
            }));

            console.log('Cut files:', paths);
        } catch (error) {
            console.error('Failed to cut files:', error);
        }
    }, [selectedFiles]);

    const handlePasteFiles = useCallback(async () => {
        if (!clipboardHasFiles || !currentPath) return;

        try {
            await window.electronAPI.clipboard.pasteFiles(currentPath);
            setClipboardState({ operation: null, files: [] });

            // Broadcast clipboard state change (cleared)
            document.dispatchEvent(new CustomEvent('clipboard-state-changed', {
                detail: { operation: null, files: [] }
            }));

            // Trigger refresh after paste
            triggerRefresh();

            console.log('Pasted files to:', currentPath);
        } catch (error) {
            console.error('Failed to paste files:', error);
        }
    }, [clipboardHasFiles, currentPath, triggerRefresh]);

    const handleDeleteFiles = useCallback(async () => {
        if (selectedFiles.length === 0) return;

        try {
            const paths = selectedFiles.map(file => file.path);
            await window.electronAPI.files.delete(paths);
            setSelectedFiles([]);

            // Trigger refresh after delete
            triggerRefresh();

            console.log('Deleted files:', paths);
        } catch (error) {
            console.error('Failed to delete files:', error);
        }
    }, [selectedFiles, triggerRefresh]);

    const handleRenameFile = useCallback(async () => {
        if (selectedFiles.length !== 1) return;

        const file = selectedFiles[0];
        const newName = prompt('Enter new name:', file.name);
        if (!newName || newName === file.name) return;

        try {
            await window.electronAPI.files.rename(file.path, newName);

            // Trigger refresh after rename
            triggerRefresh();

            console.log('Renamed file:', file.path, 'to', newName);
        } catch (error) {
            console.error('Failed to rename file:', error);
        }
    }, [selectedFiles, triggerRefresh]);

    const handleNewFolder = useCallback(async () => {
        if (!currentPath) return;

        const folderName = prompt('Enter folder name:', 'New Folder');
        if (!folderName) return;

        try {
            await window.electronAPI.files.createFolder(currentPath, folderName);

            // Trigger refresh after creating folder
            triggerRefresh();

            console.log('Created folder:', folderName, 'in', currentPath);
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
    }, [currentPath, triggerRefresh]);

    // Select all files handler
    const handleSelectAll = useCallback(() => {
        // This would need to be implemented to select all files in the current directory
        // For now, we'll just log it
        console.log('Select all requested');
        // TODO: Implement select all functionality
    }, []);

    // Keyboard shortcuts handler
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.ctrlKey && !event.shiftKey && !event.altKey) {
            switch (event.key.toLowerCase()) {
                case 'c':
                    if (selectedFiles.length > 0) {
                        event.preventDefault();
                        handleCopyFiles();
                    }
                    break;
                case 'x':
                    if (selectedFiles.length > 0) {
                        event.preventDefault();
                        handleCutFiles();
                    }
                    break;
                case 'v':
                    if (clipboardState.files.length > 0) {
                        event.preventDefault();
                        handlePasteFiles();
                    }
                    break;
                case 'a':
                    event.preventDefault();
                    handleSelectAll();
                    break;
            }
        } else if (event.key === 'Delete' && selectedFiles.length > 0) {
            event.preventDefault();
            handleDeleteFiles();
        } else if (event.key === 'F2' && selectedFiles.length === 1) {
            event.preventDefault();
            handleRenameFile();
        }
    }, [selectedFiles, clipboardState, handleCopyFiles, handleCutFiles, handlePasteFiles, handleDeleteFiles, handleRenameFile, handleSelectAll]);

    // Add keyboard event listeners
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    // Navigation history
    const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    // Search and filter state
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState<'current' | 'global'>('current');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        fileTypes: [] as string[],
        dateRange: { start: '', end: '' },
        sizeRange: { min: '', max: '' },
        nameContains: ''
    });

    // Resizable panel states
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [detailsPanelWidth, setDetailsPanelWidth] = useState(320);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingDetails, setIsResizingDetails] = useState(false);

    // Convert drive to FileSystemItem for details panel
    const driveToFileSystemItem = (drive: Drive): FileSystemItem => {
        return {
            name: `${drive.driveName} (${drive.drivePath})`,
            path: drive.drivePath,
            type: 'directory' as const,
            size: drive.total,
            modified: new Date(),
            created: new Date(),
            extension: undefined,
            isHidden: false,
            isSystem: drive.flags?.isSystem || false,
            permissions: {
                read: true,
                write: !drive.flags?.isReadOnly,
                execute: true
            }
        };
    };

    // Get items for details panel based on current selection
    const getDetailsPanelItems = (): FileSystemItem[] => {
        // Always prioritize actual file/folder selections over drive hover
        if (selectedFiles.length > 0) {
            return selectedFiles;
        }

        // Only show drive info if no files are selected and a drive is hovered
        if (hoveredDrive) {
            return [driveToFileSystemItem(hoveredDrive)];
        }

        return [];
    };

    const handleDriveHover = (drive: Drive) => {
        setHoveredDrive(drive);
    };

    // Resize handlers
    const handleSidebarResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingSidebar(true);
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const diff = e.clientX - startX;
            const newWidth = Math.max(200, Math.min(500, startWidth + diff));
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleDetailsPanelResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingDetails(true);
        const startX = e.clientX;
        const startWidth = detailsPanelWidth;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const diff = startX - e.clientX;
            const newWidth = Math.max(250, Math.min(600, startWidth + diff));
            setDetailsPanelWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizingDetails(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Navigation functions
    const navigateToPath = (path: string) => {
        // Only add to history if we're not currently navigating through history
        if (path !== currentPath) {
            // If we're not at the end of history, slice off the future entries
            const newHistory = [...navigationHistory.slice(0, historyIndex + 1), path];
            setNavigationHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
        }

        setCurrentPath(path);
        setCurrentView('folder');
    };

    const navigateBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setCurrentPath(navigationHistory[newIndex]);
            setCurrentView('folder');
        }
    };

    const navigateForward = () => {
        if (historyIndex < navigationHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setCurrentPath(navigationHistory[newIndex]);
            setCurrentView('folder');
        }
    };

    const navigateHome = () => {
        // Navigate to This PC view
        setCurrentView('thispc');
        setCurrentPath('');
        // Add to history
        const newHistory = [...navigationHistory.slice(0, historyIndex + 1), 'home'];
        setNavigationHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const navigateUp = async () => {
        if (currentPath) {
            try {
                const parentPath = await window.electronAPI.fs.getParentDirectory(currentPath);
                if (parentPath) {
                    navigateToPath(parentPath);
                }
            } catch (error) {
                console.error('Failed to navigate up:', error);
            }
        }
    };

    // Generate breadcrumbs from current path
    const generateBreadcrumbs = () => {
        if (!currentPath) return [];

        const parts = currentPath.split(/[\\\\/]/).filter(Boolean);
        const breadcrumbs = [];

        let currentPathBuild = '';
        if (window.electronAPI.system.platform === 'win32' && parts[0]?.includes(':')) {
            // Windows drive
            currentPathBuild = parts[0] + '\\';
            breadcrumbs.push({ name: parts[0], path: currentPathBuild });
            parts.shift();
        }

        parts.forEach((part) => {
            currentPathBuild = currentPathBuild.endsWith('/') || currentPathBuild.endsWith('\\')
                ? currentPathBuild + part
                : currentPathBuild + (window.electronAPI.system.platform === 'win32' ? '\\' : '/') + part;
            breadcrumbs.push({ name: part, path: currentPathBuild });
        });

        return breadcrumbs;
    };

    // File browser handlers  
    const handleFileNavigation = (path: string) => {
        navigateToPath(path);
    };

    const handleFileSelect = (files: FileSystemItem | FileSystemItem[]) => {
        const fileArray = Array.isArray(files) ? files : [files];
        setSelectedFiles(fileArray);
        console.log('Files selected:', fileArray);
    };

    const handleSelectionChange = (files: FileSystemItem[]) => {
        setSelectedFiles(files);
    };

    const handleDirectorySelect = (directory: FileSystemItem) => {
        setCurrentPath(directory.path);
        console.log('Directory selected:', directory);
    };

    const handleSidebarNavigation = async (view: string, itemName: string) => {
        if (view === 'thispc') {
            setCurrentView('thispc');
            setSelectedFiles([]);
        } else if (view === 'recents') {
            setCurrentView('recents');
            setSelectedFiles([]);
        } else {
            setCurrentView('folder');
            // Navigate to the selected folder
            try {
                let path = '';
                if (itemName === 'Documents') {
                    path = await window.electronAPI.fs.getKnownFolder('documents');
                } else if (itemName === 'Downloads') {
                    path = await window.electronAPI.fs.getKnownFolder('downloads');
                } else if (itemName === 'Desktop') {
                    path = await window.electronAPI.fs.getKnownFolder('desktop');
                } else if (itemName === 'Pictures') {
                    path = await window.electronAPI.fs.getKnownFolder('pictures');
                } else if (itemName === 'Music') {
                    path = await window.electronAPI.fs.getKnownFolder('music');
                } else if (itemName === 'Videos') {
                    path = await window.electronAPI.fs.getKnownFolder('videos');
                } else if (itemName === 'Home') {
                    path = await window.electronAPI.fs.getKnownFolder('home');
                } else {
                    // Handle drive navigation
                    const selectedDrive = drives.find(drive => drive.driveName === itemName);
                    if (selectedDrive) {
                        path = selectedDrive.drivePath;
                    }
                }

                if (path) {
                    setCurrentPath(path);
                }
            } catch (error) {
                console.error('Failed to navigate to folder:', error);
            }
        }
    };
    const fileItems: FileItem[] = [
        {
            name: 'Desktop',
            type: 'folder',
            dateModified: '1/15/2024 3:42 PM',
            dateCreated: '12/1/2023 10:00 AM',
            owner: 'Current User',
            description: 'Desktop folder containing user shortcuts and files',
            tags: ['System', 'Desktop'],
            icon: <FaDesktop />
        },
        {
            name: 'Documents',
            type: 'folder',
            dateModified: '2/1/2024 9:15 AM',
            dateCreated: '12/1/2023 10:00 AM',
            owner: 'Current User',
            description: 'Main documents folder for user files',
            tags: ['Documents', 'Personal'],
            icon: <FaFolder />
        },
        {
            name: 'Downloads',
            type: 'folder',
            dateModified: '2/2/2024 2:30 PM',
            dateCreated: '12/1/2023 10:00 AM',
            owner: 'Current User',
            description: 'Downloaded files from web browsers',
            tags: ['Downloads', 'Temporary'],
            icon: <FaDownload />
        },
        {
            name: 'Pictures',
            type: 'folder',
            dateModified: '1/28/2024 11:22 AM',
            dateCreated: '12/1/2023 10:00 AM',
            owner: 'Current User',
            description: 'Image files and photo collections',
            tags: ['Media', 'Photos'],
            icon: <FaFolder />
        },
        {
            name: 'Music',
            type: 'folder',
            dateModified: '1/20/2024 4:18 PM',
            dateCreated: '12/1/2023 10:00 AM',
            owner: 'Current User',
            description: 'Audio files and music library',
            tags: ['Media', 'Audio'],
            icon: <FaMusic />
        },
        {
            name: 'Videos',
            type: 'folder',
            dateModified: '1/25/2024 7:45 PM',
            dateCreated: '12/1/2023 10:00 AM',
            owner: 'Current User',
            description: 'Video files and movie collection',
            tags: ['Media', 'Videos'],
            icon: <FaVideo />
        },
        {
            name: 'Quarterly Report.docx',
            type: 'file',
            size: '245 KB',
            dateModified: '2/1/2024 10:30 AM',
            dateCreated: '1/15/2024 9:00 AM',
            owner: 'Current User',
            description: 'Q4 2023 business performance analysis and metrics',
            tags: ['Work', 'Reports', 'Q4'],
            icon: <FaFileWord />
        },
        {
            name: 'Project Presentation.pptx',
            type: 'file',
            size: '2.1 MB',
            dateModified: '1/30/2024 4:15 PM',
            dateCreated: '1/20/2024 2:30 PM',
            owner: 'Current User',
            description: 'Client presentation for upcoming project proposal',
            tags: ['Work', 'Presentation', 'Client'],
            icon: <FaFilePowerpoint />
        },
        {
            name: 'Budget Analysis.xlsx',
            type: 'file',
            size: '89 KB',
            dateModified: '1/29/2024 2:45 PM',
            dateCreated: '1/25/2024 11:00 AM',
            owner: 'Current User',
            description: 'Financial budget breakdown and expense tracking',
            tags: ['Finance', 'Budget', 'Analysis'],
            icon: <FaFileExcel />
        },
        {
            name: 'Vacation Photo.jpg',
            type: 'file',
            size: '3.2 MB',
            dateModified: '1/28/2024 6:20 PM',
            dateCreated: '1/28/2024 6:20 PM',
            owner: 'Current User',
            description: 'Beautiful sunset photo from recent vacation',
            tags: ['Personal', 'Photos', 'Vacation'],
            icon: <FaFileImage />
        },
        {
            name: 'app.js',
            type: 'file',
            size: '12 KB',
            dateModified: '2/2/2024 1:10 PM',
            dateCreated: '1/30/2024 3:45 PM',
            owner: 'Current User',
            description: 'Main application JavaScript file with core functionality',
            tags: ['Code', 'JavaScript', 'Development'],
            icon: <FaFileCode />
        },
        {
            name: 'User Manual.pdf',
            type: 'file',
            size: '1.8 MB',
            dateModified: '1/22/2024 11:35 AM',
            dateCreated: '1/18/2024 4:20 PM',
            owner: 'Current User',
            description: 'Comprehensive user guide and documentation',
            tags: ['Documentation', 'Manual', 'Guide'],
            icon: <FaFilePdf />
        },
    ];

    // Sidebar items with modern design
    // Separate local and network drives
    const localDrives = drives.filter(drive => !drive.flags?.isVirtual && drive.drivePath !== 'Z:');
    const networkDrives = drives.filter(drive => drive.flags?.isVirtual || drive.drivePath === 'Z:');

    // Sample network devices data
    const networkDevices = [
        {
            name: 'DESKTOP-PC01',
            type: 'other' as const,
            address: '192.168.1.100',
            status: 'online' as const,
            icon: <FaDesktop style={{ color: '#0078D4' }} />,
            description: 'Windows desktop computer on network'
        },
        {
            name: 'NAS-SERVER',
            type: 'storage' as const,
            address: '192.168.1.50',
            status: 'online' as const,
            icon: <FaHdd style={{ color: '#107C10' }} />,
            description: 'Network attached storage device'
        },
        {
            name: 'PRINTER-HP',
            type: 'printer' as const,
            address: '192.168.1.200',
            status: 'offline' as const,
            icon: <FaCog style={{ color: '#E74856' }} />,
            description: 'HP LaserJet network printer'
        }
    ];

    const sidebarSections = [
        {
            title: 'Quick Access',
            items: [
                { name: 'Recents', icon: <FaClock />, active: currentView === 'recents', view: 'recents' },
                { name: 'Downloads', icon: <FaDownload />, active: false, view: 'folder' },
                { name: 'Documents', icon: <FaFolder />, active: currentView === 'folder' && selectedItem?.name === 'Documents', view: 'folder' },
                { name: 'Pictures', icon: <FaFileImage />, active: false, view: 'folder' },
            ]
        },
        {
            title: 'This PC',
            items: [
                { name: 'This PC', icon: <FaDesktop />, active: currentView === 'thispc', view: 'thispc' },
            ],
            drives: localDrives // Local drives only
        },
        ...(networkDrives.length > 0 ? [{
            title: 'Network Locations',
            items: [],
            drives: networkDrives // Network drives separately
        }] : [])
    ];

    // Sort files
    const sortedFiles = [...fileItems].sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'size':
                const sizeA = a.size ? parseInt(a.size.replace(/[^\d]/g, '')) || 0 : 0;
                const sizeB = b.size ? parseInt(b.size.replace(/[^\d]/g, '')) || 0 : 0;
                comparison = sizeA - sizeB;
                break;
            case 'date':
                comparison = new Date(a.dateModified).getTime() - new Date(b.dateModified).getTime();
                break;
            case 'type':
                comparison = a.type.localeCompare(b.type);
                break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const handleSort = (column: 'name' | 'size' | 'date' | 'type') => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    const handleItemClick = (item: FileItem) => {
        setSelectedItem(item);
    };

    const getSortIcon = (column: 'name' | 'size' | 'date' | 'type') => {
        if (sortBy !== column) return null;

        if (column === 'name' || column === 'type') {
            return sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />;
        } else {
            return sortOrder === 'asc' ? <FaSortNumericDown /> : <FaSortNumericUp />;
        }
    };

    if (!isActive) {
        return null;
    }

    return (
        <div className="main-content">
            <div className="content-area">
                {/* Modern Toolbar */}
                <div className="toolbar">
                    <div className="toolbar-section">
                        <button
                            className={`toolbar-button ${historyIndex <= 0 ? 'disabled' : ''}`}
                            onClick={navigateBack}
                            disabled={historyIndex <= 0}
                            title="Back"
                        >
                            <FaArrowLeft />
                        </button>
                        <button
                            className={`toolbar-button ${historyIndex >= navigationHistory.length - 1 ? 'disabled' : ''}`}
                            onClick={navigateForward}
                            disabled={historyIndex >= navigationHistory.length - 1}
                            title="Forward"
                        >
                            <FaArrowRight />
                        </button>
                        <button
                            className="toolbar-button"
                            onClick={navigateHome}
                            title="Home"
                        >
                            <FaHome />
                        </button>
                    </div>
                    <div className="address-bar-container">
                        <div className="address-bar">
                            {currentView === 'thispc' && (
                                <span className="path-segment active">This PC</span>
                            )}
                            {currentView === 'recents' && (
                                <span className="path-segment active">Recent Files</span>
                            )}
                            {currentView === 'folder' && generateBreadcrumbs().length > 0 && (
                                <>
                                    {generateBreadcrumbs().map((breadcrumb, index) => (
                                        <React.Fragment key={breadcrumb.path}>
                                            {index > 0 && <span className="path-separator">›</span>}
                                            <span
                                                className={`path-segment ${index === generateBreadcrumbs().length - 1 ? 'active' : ''}`}
                                                onClick={() => index < generateBreadcrumbs().length - 1 && navigateToPath(breadcrumb.path)}
                                                style={{ cursor: index < generateBreadcrumbs().length - 1 ? 'pointer' : 'default' }}
                                            >
                                                {breadcrumb.name}
                                            </span>
                                        </React.Fragment>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="toolbar-section">
                        <div className="search-container">
                            <button
                                className={`toolbar-button ${showAdvancedSearch ? 'active' : ''}`}
                                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                                title="Advanced Search"
                            >
                                <FaSearch />
                            </button>

                            {showAdvancedSearch && (
                                <div className="advanced-search-overlay">
                                    <div className="advanced-search-panel">
                                        <div className="search-header">
                                            <h3>Advanced Search</h3>
                                            <button
                                                className="close-button"
                                                onClick={() => setShowAdvancedSearch(false)}
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>

                                        <div className="search-content">
                                            <div className="search-input-group">
                                                <label>Search for:</label>
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Enter search terms..."
                                                />
                                            </div>

                                            <div className="search-scope-group">
                                                <label>Search in:</label>
                                                <div className="radio-group">
                                                    <label className="radio-option">
                                                        <input
                                                            type="radio"
                                                            value="current"
                                                            checked={searchScope === 'current'}
                                                            onChange={(e) => setSearchScope(e.target.value as 'current' | 'global')}
                                                        />
                                                        Current directory and subdirectories
                                                    </label>
                                                    <label className="radio-option">
                                                        <input
                                                            type="radio"
                                                            value="global"
                                                            checked={searchScope === 'global'}
                                                            onChange={(e) => setSearchScope(e.target.value as 'current' | 'global')}
                                                        />
                                                        Entire drive ({currentPath ? currentPath.split(':')[0] + ':' : 'All drives'})
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="filter-section">
                                                <div className="filter-header">
                                                    <label>
                                                        <FaFilter /> Filters
                                                    </label>
                                                    <button
                                                        className={`filter-toggle ${showFilters ? 'active' : ''}`}
                                                        onClick={() => setShowFilters(!showFilters)}
                                                    >
                                                        {showFilters ? 'Hide' : 'Show'} Filters
                                                    </button>
                                                </div>

                                                {showFilters && (
                                                    <div className="filter-options">
                                                        <div className="filter-row">
                                                            <label><FaFont /> Name contains:</label>
                                                            <input
                                                                type="text"
                                                                value={filters.nameContains}
                                                                onChange={(e) => setFilters(prev => ({ ...prev, nameContains: e.target.value }))}
                                                                placeholder="Text in filename..."
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
                                                                />
                                                                <span>to</span>
                                                                <input
                                                                    type="date"
                                                                    value={filters.dateRange.end}
                                                                    onChange={(e) => setFilters(prev => ({
                                                                        ...prev,
                                                                        dateRange: { ...prev.dateRange, end: e.target.value }
                                                                    }))}
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
                                                                    placeholder="Min size (e.g., 1MB)"
                                                                />
                                                                <span>to</span>
                                                                <input
                                                                    type="text"
                                                                    value={filters.sizeRange.max}
                                                                    onChange={(e) => setFilters(prev => ({
                                                                        ...prev,
                                                                        sizeRange: { ...prev.sizeRange, max: e.target.value }
                                                                    }))}
                                                                    placeholder="Max size (e.g., 100MB)"
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
                                                    </div>
                                                )}
                                            </div>

                                            <div className="search-actions">
                                                <button className="search-button primary">
                                                    <FaSearch /> Search
                                                </button>
                                                <button
                                                    className="clear-button"
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        setFilters({
                                                            fileTypes: [],
                                                            dateRange: { start: '', end: '' },
                                                            sizeRange: { min: '', max: '' },
                                                            nameContains: ''
                                                        });
                                                    }}
                                                >
                                                    Clear All
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            className="toolbar-button"
                            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                        >
                            {viewMode === 'list' ? <FaThLarge /> : <FaBars />}
                        </button>
                        <button
                            className={`toolbar-button ${showDetailsPanel ? 'primary' : ''}`}
                            onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                        >
                            Details
                        </button>
                    </div>
                </div>

                {/* Modern Ribbon - Show different content based on theme */}
                <div className="ribbon">
                    <div className="ribbon-tabs">
                        <span
                            className={`ribbon-tab ${activeRibbonTab === 'home' ? 'active' : ''}`}
                            onClick={() => setActiveRibbonTab('home')}
                        >
                            Home
                        </span>
                        <span
                            className={`ribbon-tab ${activeRibbonTab === 'share' ? 'active' : ''}`}
                            onClick={() => setActiveRibbonTab('share')}
                        >
                            Share
                        </span>
                        <span
                            className={`ribbon-tab ${activeRibbonTab === 'view' ? 'active' : ''}`}
                            onClick={() => setActiveRibbonTab('view')}
                        >
                            View
                        </span>
                        <span
                            className={`ribbon-tab ${activeRibbonTab === 'manage' ? 'active' : ''}`}
                            onClick={() => setActiveRibbonTab('manage')}
                        >
                            Manage
                        </span>
                        <span
                            className={`ribbon-tab ${activeRibbonTab === 'organize' ? 'active' : ''}`}
                            onClick={() => setActiveRibbonTab('organize')}
                        >
                            Organize
                        </span>
                        <span
                            className={`ribbon-tab ${activeRibbonTab === 'tools' ? 'active' : ''}`}
                            onClick={() => setActiveRibbonTab('tools')}
                        >
                            Tools
                        </span>
                        <span
                            className={`ribbon-tab ${activeRibbonTab === 'help' ? 'active' : ''}`}
                            onClick={() => setActiveRibbonTab('help')}
                        >
                            Help
                        </span>
                    </div>
                    <div className="ribbon-content">
                        {activeRibbonTab === 'home' && (
                            <>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Clipboard</div>
                                    <button
                                        className={`ribbon-button ${selectedFiles.length === 0 ? 'disabled' : ''}`}
                                        disabled={selectedFiles.length === 0}
                                        onClick={handleCopyFiles}
                                        title="Copy selected files (Ctrl+C)"
                                    >
                                        <div className="ribbon-icon"><FaCopy /></div>
                                        <span>Copy</span>
                                    </button>
                                    <button
                                        className={`ribbon-button ${selectedFiles.length === 0 ? 'disabled' : ''}`}
                                        disabled={selectedFiles.length === 0}
                                        onClick={handleCutFiles}
                                        title="Cut selected files (Ctrl+X)"
                                    >
                                        <div className="ribbon-icon"><FaCut /></div>
                                        <span>Cut</span>
                                    </button>
                                    <button
                                        className={`ribbon-button ${!clipboardHasFiles ? 'disabled' : ''}`}
                                        disabled={!clipboardHasFiles}
                                        onClick={handlePasteFiles}
                                        title="Paste files (Ctrl+V)"
                                    >
                                        <div className="ribbon-icon"><FaPaste /></div>
                                        <span>Paste</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Organize</div>
                                    <button
                                        className={`ribbon-button ${selectedFiles.length === 0 ? 'disabled' : ''}`}
                                        disabled={selectedFiles.length === 0}
                                        onClick={handleDeleteFiles}
                                        title="Delete selected files (Delete)"
                                    >
                                        <div className="ribbon-icon"><FaTrash /></div>
                                        <span>Delete</span>
                                    </button>
                                    <button
                                        className={`ribbon-button ${selectedFiles.length !== 1 ? 'disabled' : ''}`}
                                        disabled={selectedFiles.length !== 1}
                                        onClick={handleRenameFile}
                                        title="Rename selected file (F2)"
                                    >
                                        <div className="ribbon-icon"><FaEdit /></div>
                                        <span>Rename</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">New</div>
                                    <button
                                        className="ribbon-button"
                                        onClick={handleNewFolder}
                                        title="Create new folder (Ctrl+Shift+N)"
                                    >
                                        <div className="ribbon-icon"><FaFolderPlus /></div>
                                        <span>New folder</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaCog /></div>
                                        <span>Properties</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {activeRibbonTab === 'share' && (
                            <>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Send</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaShare /></div>
                                        <span>Share</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaEnvelope /></div>
                                        <span>Email</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Print</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaPrint /></div>
                                        <span>Print</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaFax /></div>
                                        <span>Fax</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Advanced sharing</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaUsers /></div>
                                        <span>Share with people</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {activeRibbonTab === 'view' && (
                            <>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Layout</div>
                                    <button
                                        className={`ribbon-button ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <div className="ribbon-icon"><FaThLarge /></div>
                                        <span>Large icons</span>
                                    </button>
                                    <button
                                        className={`ribbon-button ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')}
                                    >
                                        <div className="ribbon-icon"><FaBars /></div>
                                        <span>Details</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Panes</div>
                                    <button
                                        className={`ribbon-button ${showDetailsPanel ? 'active' : ''}`}
                                        onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                                    >
                                        <div className="ribbon-icon"><FaInfoCircle /></div>
                                        <span>Details pane</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Show/hide</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaEye /></div>
                                        <span>Hidden items</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaFile /></div>
                                        <span>File extensions</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {activeRibbonTab === 'manage' && (
                            <>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Devices</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaHdd /></div>
                                        <span>Disk Manager</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaDesktop /></div>
                                        <span>Open This PC</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Maintenance</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaCog /></div>
                                        <span>Optimize</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaCog /></div>
                                        <span>Cleanup</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {activeRibbonTab === 'organize' && (
                            <>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Sort</div>
                                    <button className="ribbon-button" onClick={() => setSortBy('name')}>
                                        <div className="ribbon-icon"><FaSortAlphaDown /></div>
                                        <span>By name</span>
                                    </button>
                                    <button className="ribbon-button" onClick={() => setSortBy('date')}>
                                        <div className="ribbon-icon"><FaSortNumericDown /></div>
                                        <span>By date</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Layout</div>
                                    <button className="ribbon-button" onClick={() => setViewMode('grid')}>
                                        <div className="ribbon-icon"><FaThLarge /></div>
                                        <span>Icons</span>
                                    </button>
                                    <button className="ribbon-button" onClick={() => setViewMode('list')}>
                                        <div className="ribbon-icon"><FaBars /></div>
                                        <span>Details</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {activeRibbonTab === 'tools' && (
                            <>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Utilities</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaCog /></div>
                                        <span>Options</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaCog /></div>
                                        <span>Batch Ops</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Advanced</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaInfoCircle /></div>
                                        <span>Logs</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {activeRibbonTab === 'help' && (
                            <>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Support</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaInfoCircle /></div>
                                        <span>About</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaInfoCircle /></div>
                                        <span>Shortcuts</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Updates</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaInfoCircle /></div>
                                        <span>Check updates</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* File Explorer Content */}
                <div className="file-explorer-content">
                    {/* Modern Sidebar */}
                    <div
                        className="sidebar"
                        style={{ width: `${sidebarWidth}px`, minWidth: '200px', maxWidth: '500px' }}
                    >
                        <div className="sidebar-main">
                            {sidebarSections.map((section, index) => (
                                <div key={index} className="sidebar-section">
                                    <div className="sidebar-header">{section.title}</div>
                                    {section.items.map((item, itemIndex) => (
                                        <div
                                            key={itemIndex}
                                            className={`sidebar-item ${item.active ? 'active' : ''}`}
                                            onClick={() => handleSidebarNavigation(item.view, item.name)}
                                        >
                                            <span className="sidebar-icon">{item.icon}</span>
                                            {item.name}
                                        </div>
                                    ))}
                                    {/* Render drives for This PC section */}
                                    {section.drives && section.drives.map((drive, driveIndex) => (
                                        <DriveItem
                                            key={`drive-${driveIndex}`}
                                            drive={drive}
                                            active={currentView === 'folder' && selectedItem?.name === drive.driveName}
                                            onClick={() => handleSidebarNavigation('folder', drive.driveName)}
                                            onHover={handleDriveHover}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {/* Settings Button */}
                        <div className="sidebar-footer">
                            <div
                                className="sidebar-item settings-button"
                                onClick={() => setShowSettingsMenu(true)}
                                title="Settings"
                            >
                                <span className="sidebar-icon"><FaCog /></span>
                                Settings
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Resize Handle */}
                    <div
                        className={`resize-handle resize-handle-vertical ${isResizingSidebar ? 'active' : ''}`}
                        onMouseDown={handleSidebarResize}
                        title="Resize sidebar"
                    />

                    {/* File Area */}
                    <div className="file-area">
                        {currentView === 'thispc' && (
                            <ThisPCView
                                viewMode={viewMode}
                                onDriveHover={handleDriveHover}
                                drives={drives}
                                drivesLoading={drivesLoading}
                                drivesError={drivesError}
                                onRefreshDrives={onRefreshDrives}
                                quickAccessItems={undefined}
                                networkDevices={networkDevices}
                            />
                        )}

                        {currentView === 'recents' && (
                            <RecentsView viewMode={viewMode} />
                        )}

                        {currentView === 'folder' && (
                            <FileList
                                currentPath={currentPath}
                                viewMode={viewMode as 'list' | 'grid'}
                                onNavigate={handleFileNavigation}
                                onFileSelect={handleFileSelect}
                                selectedFiles={selectedFiles}
                                onSelectionChange={handleSelectionChange}
                                refreshTrigger={refreshTrigger}
                            />
                        )}
                    </div>

                    {/* Details Panel Resize Handle */}
                    {showDetailsPanel && (
                        <div
                            className={`resize-handle resize-handle-vertical ${isResizingDetails ? 'active' : ''}`}
                            onMouseDown={handleDetailsPanelResize}
                            title="Resize details panel"
                        />
                    )}

                    {/* Details Panel */}
                    <div
                        className={`details-panel-container ${showDetailsPanel ? 'visible' : 'hidden'}`}
                        style={{ width: showDetailsPanel ? `${detailsPanelWidth}px` : '0px', minWidth: showDetailsPanel ? '250px' : '0px', maxWidth: '600px' }}
                    >
                        <DetailsPanel
                            selectedItems={getDetailsPanelItems()}
                            isVisible={showDetailsPanel}
                        />
                    </div>
                </div>
            </div>

            {/* Settings Menu */}
            <SettingsMenu
                isOpen={showSettingsMenu}
                onClose={() => setShowSettingsMenu(false)}
            />
        </div>
    );
});
