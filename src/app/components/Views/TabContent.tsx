import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaFolder, FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaCopy, FaCut, FaPaste, FaTrash, FaEdit, FaFolderPlus, FaCog, FaArrowLeft, FaArrowRight, FaHome, FaSearch, FaThLarge, FaBars, FaHdd, FaDesktop, FaDownload, FaMusic, FaVideo, FaFilePdf, FaSortAlphaDown, FaSortAlphaUp, FaSortNumericDown, FaSortNumericUp, FaClock, FaShare, FaEnvelope, FaPrint, FaFax, FaUsers, FaInfoCircle, FaEye, FaTimes, FaFilter, FaCalendarAlt, FaRulerHorizontal, FaFont } from 'react-icons/fa';
import { DetailsPanel } from '../DetailsPanel';
import { RecentsView } from './RecentsView';
import { ThisPCView } from './ThisPCView';
import { FileList } from '../FileUtils/FileList';
import { DriveItem } from './DriveItem';
import { SettingsMenu } from '../SettingsMenu/SettingsMenu';
import { QuickAccessEditor } from '../QuickAccessEditor';
import { SortPreferencesEditor } from '../SortPreferencesEditor';
import { BatchRenameDialog } from '../BatchRenameDialog';
import { AdvancedSearchDialog } from '../AdvancedSearchDialog';
import { FileOperationsDialog } from '../FileOperationsDialog';
import { PerformancePanel } from '../PerformancePanel';
import { ArchiveDialog } from '../ArchiveDialog';
import { CloudDialog } from '../CloudDialog';
import { BackupDialog } from '../BackupDialog';
import { PluginDialog } from '../PluginDialog';
import { quickAccessManager } from '../../utils/QuickAccessManager';
import { Drive, FileItem } from 'shared/file-data';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { useFileExplorerUI, NavigationUtils } from '../../utils';
import './RecentsThisPCStyles.scss';

interface TabContentProps {
    tabId: string;
    isActive: boolean;
    viewMode: string;
    setViewMode: (mode: string) => void;
    drives: Drive[];
    drivesLoading?: boolean;
    drivesError?: string | null;
    onRefreshDrives?: () => Promise<void>;
    onPathChange?: (path: string, title: string) => void; // Callback to update tab title
}

export const TabContent: React.FC<TabContentProps> = React.memo(({ tabId, isActive, viewMode, setViewMode, drives, drivesLoading = false, drivesError = null, onRefreshDrives, onPathChange }) => {
    const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
    const [hoveredDrive, setHoveredDrive] = useState<Drive | null>(null);
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [showQuickAccessEditor, setShowQuickAccessEditor] = useState(false);
    const [showSortPreferences, setShowSortPreferences] = useState(false);
    const [showBatchRename, setShowBatchRename] = useState(false);
    const [showFileOperations, setShowFileOperations] = useState(false);
    const [showPerformancePanel, setShowPerformancePanel] = useState(false);
    const [showArchive, setShowArchive] = useState(false);
    const [showCloud, setShowCloud] = useState(false);
    const [showBackup, setShowBackup] = useState(false);
    const [showPlugin, setShowPlugin] = useState(false);
    const [archiveMode, setArchiveMode] = useState<'create' | 'extract' | 'view'>('create');
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'share' | 'view' | 'manage' | 'organize' | 'tools' | 'help'>('home');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    // Navigation and state come from the unified fileExplorer hook

    // File list refresh trigger
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Initialize file explorer utilities with refresh callback
    const fileExplorer = useFileExplorerUI(() => {
        setRefreshTrigger(prev => prev + 1);
    }, { enableShortcuts: isActive });

    // Update tab title when path changes
    useEffect(() => {
        if (onPathChange && fileExplorer.currentPath) {
            const pathSegments = fileExplorer.currentPath.split('\\').filter(Boolean);
            const folderName = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : fileExplorer.currentPath;
            onPathChange(fileExplorer.currentPath, folderName || 'This PC');
        }
    }, [fileExplorer.currentPath, onPathChange]);

    // Use utilities from centralized hook
    const { 
        selectedFiles,
        clipboardState
    } = fileExplorer;

    // Clipboard state computed values
    const clipboardHasFiles = clipboardState.files.length > 0;

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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    // Guard to prevent updates after unmount during global mouse listeners
    const isMountedRef = React.useRef(true);
    React.useEffect(() => {
        return () => { isMountedRef.current = false; };
    }, []);

    // Resize handlers
    const handleSidebarResize = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingSidebar(true);
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isMountedRef.current) {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
            }
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
            if (!isMountedRef.current) {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return;
            }
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

    // File browser handlers using utility functions
    const handleFileNavigation = (path: string) => {
        fileExplorer.navigateToPath(path);
        console.log("Navigated to folder:", path);
    };

    const handleFileSelect = (files: FileSystemItem | FileSystemItem[]) => {
        const fileArray = Array.isArray(files) ? files : [files];
        fileExplorer.selectFiles(fileArray);
        console.log('Files selected:', fileArray);
    };

    const handleSelectionChange = (files: FileSystemItem[]) => {
        fileExplorer.selectFiles(files);
    };

    const handleDirectorySelect = (directory: FileSystemItem) => {
        fileExplorer.navigateToPath(directory.path);
        console.log('Directory selected:', directory);
    };

    const handleSidebarNavigation = async (view: string, itemName: string) => {
        if (view === 'thispc') {
            fileExplorer.navigateToThisPC();
            fileExplorer.clearSelection();
        } else if (view === 'recents') {
            fileExplorer.navigateToRecents();
            fileExplorer.clearSelection();
        } else {
            // Navigate to the selected folder using utility
            try {
                let success = false;
                if (itemName === 'Documents') {
                    success = await fileExplorer.navigateToKnownFolder('documents');
                } else if (itemName === 'Downloads') {
                    success = await fileExplorer.navigateToKnownFolder('downloads');
                } else if (itemName === 'Desktop') {
                    success = await fileExplorer.navigateToKnownFolder('desktop');
                } else if (itemName === 'Pictures') {
                    success = await fileExplorer.navigateToKnownFolder('pictures');
                } else if (itemName === 'Music') {
                    success = await fileExplorer.navigateToKnownFolder('music');
                } else if (itemName === 'Videos') {
                    success = await fileExplorer.navigateToKnownFolder('videos');
                } else if (itemName === 'Home') {
                    success = await fileExplorer.navigateToKnownFolder('home');
                } else {
                    // Handle drive navigation
                    const selectedDrive = drives.find(drive => drive.driveName === itemName);
                    if (selectedDrive) {
                        success = await fileExplorer.navigateToPath(selectedDrive.drivePath);
                    }
                }

                if (!success) {
                    console.error('Failed to navigate to:', itemName);
                }
            } catch (error) {
                console.error('Failed to navigate to folder:', error);
            }
        }
    };

    // Generate breadcrumbs from current path
    const generateBreadcrumbs = () => {
        return NavigationUtils.generateBreadcrumbs(fileExplorer.currentPath);
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
                { name: 'Recents', icon: <FaClock />, active: fileExplorer.currentView === 'recents', view: 'recents' },
                { name: 'Downloads', icon: <FaDownload />, active: false, view: 'folder' },
                { name: 'Documents', icon: <FaFolder />, active: fileExplorer.currentView === 'folder' && selectedItem?.name === 'Documents', view: 'folder' },
                { name: 'Pictures', icon: <FaFileImage />, active: false, view: 'folder' },
            ]
        },
        {
            title: 'This PC',
            items: [
                { name: 'This PC', icon: <FaDesktop />, active: fileExplorer.currentView === 'thispc', view: 'thispc' },
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
                            className={`toolbar-button ${!fileExplorer.navigationState.canGoBack ? 'disabled' : ''}`}
                            onClick={fileExplorer.navigateBack}
                            disabled={!fileExplorer.navigationState.canGoBack}
                            title="Back"
                        >
                            <FaArrowLeft />
                        </button>
                        <button
                            className={`toolbar-button ${!fileExplorer.navigationState.canGoForward ? 'disabled' : ''}`}
                            onClick={fileExplorer.navigateForward}
                            disabled={!fileExplorer.navigationState.canGoForward}
                            title="Forward"
                        >
                            <FaArrowRight />
                        </button>
                        <button
                            className="toolbar-button"
                            onClick={() => {
                                fileExplorer.navigateToThisPC();
                                fileExplorer.clearSelection();
                            }}
                            title="Home"
                        >
                            <FaHome />
                        </button>
                    </div>
                    <div className="address-bar-container">
                        <div className="address-bar">
                            {fileExplorer.currentView === 'thispc' && (
                                <span className="path-segment active">This PC</span>
                            )}
                            {fileExplorer.currentView === 'recents' && (
                                <span className="path-segment active">Recent Files</span>
                            )}
                            {fileExplorer.currentView === 'folder' && generateBreadcrumbs().length > 0 && (
                                <>
                                    {generateBreadcrumbs().map((breadcrumb: { name: string; path: string }, index: number) => (
                                        <React.Fragment key={breadcrumb.path}>
                                            {index > 0 && <span className="path-separator">›</span>}
                                            <span
                                                className={`path-segment ${index === generateBreadcrumbs().length - 1 ? 'active' : ''}`}
                                                onClick={() => index < generateBreadcrumbs().length - 1 && fileExplorer.navigateToPath(breadcrumb.path)}
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
                                                        Entire drive ({fileExplorer.currentPath ? fileExplorer.currentPath.split(':')[0] + ':' : 'All drives'})
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
                        <button
                            className="toolbar-button"
                            onClick={() => setShowQuickAccessEditor(true)}
                            title="Customize Quick Access"
                        >
                            ⚡ Quick Access
                        </button>
                        <button
                            className="toolbar-button"
                            onClick={() => setShowSortPreferences(true)}
                            title="Customize Sort Preferences"
                        >
                            <FaSortAlphaDown /> Sort
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
                                        onClick={fileExplorer.handleCopy}
                                        title="Copy selected files (Ctrl+C)"
                                    >
                                        <div className="ribbon-icon"><FaCopy /></div>
                                        <span>Copy</span>
                                    </button>
                                    <button
                                        className={`ribbon-button ${selectedFiles.length === 0 ? 'disabled' : ''}`}
                                        disabled={selectedFiles.length === 0}
                                        onClick={fileExplorer.handleCut}
                                        title="Cut selected files (Ctrl+X)"
                                    >
                                        <div className="ribbon-icon"><FaCut /></div>
                                        <span>Cut</span>
                                    </button>
                                    <button
                                        className={`ribbon-button ${!clipboardHasFiles ? 'disabled' : ''}`}
                                        disabled={!clipboardHasFiles}
                                        onClick={fileExplorer.handlePaste}
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
                                        onClick={fileExplorer.handleDelete}
                                        title="Delete selected files (Delete)"
                                    >
                                        <div className="ribbon-icon"><FaTrash /></div>
                                        <span>Delete</span>
                                    </button>
                                    <button
                                        className={`ribbon-button ${selectedFiles.length !== 1 ? 'disabled' : ''}`}
                                        disabled={selectedFiles.length !== 1}
                                        onClick={fileExplorer.handleRename}
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
                                        onClick={fileExplorer.handleNewFolder}
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
                                    <div className="ribbon-group-label">File Tools</div>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => setShowBatchRename(true)}
                                        disabled={selectedFiles.length === 0}
                                        title="Batch Rename Selected Items"
                                    >
                                        <div className="ribbon-icon"><FaEdit /></div>
                                        <span>Batch Rename</span>
                                    </button>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => {
                                            setArchiveMode('create');
                                            setShowArchive(true);
                                        }}
                                        disabled={selectedFiles.length === 0}
                                        title="Create Archive"
                                    >
                                        <div className="ribbon-icon">📦</div>
                                        <span>Archive</span>
                                    </button>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => setShowFileOperations(true)}
                                        title="Advanced File Operations"
                                    >
                                        <div className="ribbon-icon">🛠️</div>
                                        <span>File Ops</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Search & Organize</div>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => setShowAdvancedSearch(true)}
                                        title="Advanced Search"
                                    >
                                        <div className="ribbon-icon"><FaSearch /></div>
                                        <span>Advanced Search</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Cloud & Backup</div>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => setShowCloud(true)}
                                        title="Cloud Integration"
                                    >
                                        <div className="ribbon-icon">☁️</div>
                                        <span>Cloud</span>
                                    </button>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => setShowBackup(true)}
                                        title="Backup & Sync"
                                    >
                                        <div className="ribbon-icon">💾</div>
                                        <span>Backup</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">System</div>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => setShowPerformancePanel(true)}
                                        title="Performance Monitor"
                                    >
                                        <div className="ribbon-icon">📊</div>
                                        <span>Performance</span>
                                    </button>
                                    <button 
                                        className="ribbon-button"
                                        onClick={() => setShowPlugin(true)}
                                        title="Plugin Manager"
                                    >
                                        <div className="ribbon-icon">🧩</div>
                                        <span>Plugins</span>
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
                        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
                        style={{ width: sidebarCollapsed ? '0px' : `${sidebarWidth}px`, minWidth: sidebarCollapsed ? '0px' : '200px', maxWidth: '500px' }}
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
                                            active={fileExplorer.currentView === 'folder' && selectedItem?.name === drive.driveName}
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
                    {!sidebarCollapsed && (
                        <div
                            className={`resize-handle resize-handle-vertical ${isResizingSidebar ? 'active' : ''}`}
                            onMouseDown={handleSidebarResize}
                            title="Resize sidebar"
                        />
                    )}

                    {/* Sidebar Collapse/Expand Toggle */}
                    <button
                        className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {sidebarCollapsed ? '»' : '«'}
                    </button>

                    {/* File Area */}
                    <div className="file-area">
                        {fileExplorer.currentView === 'thispc' && (
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

                        {fileExplorer.currentView === 'recents' && (
                            <RecentsView viewMode={viewMode} />
                        )}

                        {fileExplorer.currentView === 'folder' && (
                            <FileList
                                currentPath={fileExplorer.currentPath}
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

            {/* Quick Access Editor */}
            <QuickAccessEditor
                isOpen={showQuickAccessEditor}
                onClose={() => setShowQuickAccessEditor(false)}
            />

            {/* Sort Preferences Editor */}
            <SortPreferencesEditor
                isOpen={showSortPreferences}
                onClose={() => setShowSortPreferences(false)}
                currentPath={fileExplorer.currentPath}
            />

            {/* Batch Rename Dialog */}
            {showBatchRename && selectedFiles.length > 0 && (
                <BatchRenameDialog
                    items={selectedFiles}
                    onClose={() => setShowBatchRename(false)}
                    onRename={() => {
                        setRefreshTrigger(prev => prev + 1);
                        fileExplorer.clearSelection();
                    }}
                />
            )}

            {/* Advanced Search Dialog */}
            <AdvancedSearchDialog
                isOpen={showAdvancedSearch}
                onClose={() => setShowAdvancedSearch(false)}
                onNavigate={(path) => {
                    fileExplorer.navigateToPath(path);
                    setShowAdvancedSearch(false);
                }}
                currentPath={fileExplorer.currentPath}
                items={selectedFiles}
            />

            {/* File Operations Dialog */}
            <FileOperationsDialog
                isOpen={showFileOperations}
                onClose={() => setShowFileOperations(false)}
                currentPath={fileExplorer.currentPath}
                selectedFiles={selectedFiles.map(item => item.path)}
            />

            {/* Performance Monitor Panel */}
            <PerformancePanel
                isOpen={showPerformancePanel}
                onClose={() => setShowPerformancePanel(false)}
            />

            {/* Archive Dialog */}
            <ArchiveDialog
                isOpen={showArchive}
                onClose={() => setShowArchive(false)}
                selectedPaths={selectedFiles.map(item => item.path)}
                mode={archiveMode}
            />

            {/* Cloud Integration Dialog */}
            <CloudDialog
                isOpen={showCloud}
                onClose={() => setShowCloud(false)}
            />

            {/* Backup & Sync Dialog */}
            <BackupDialog
                isOpen={showBackup}
                onClose={() => setShowBackup(false)}
            />

            {/* Plugin Manager Dialog */}
            <PluginDialog
                isOpen={showPlugin}
                onClose={() => setShowPlugin(false)}
            />
        </div>
    );
});
