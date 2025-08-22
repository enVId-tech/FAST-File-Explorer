import React, { useState, useCallback, useMemo } from 'react';
import { FaFolder, FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaCopy, FaCut, FaPaste, FaTrash, FaEdit, FaFolderPlus, FaCog, FaArrowLeft, FaArrowRight, FaHome, FaSearch, FaThLarge, FaBars, FaHdd, FaDesktop, FaDownload, FaMusic, FaVideo, FaFilePdf, FaSortAlphaDown, FaSortAlphaUp, FaSortNumericDown, FaSortNumericUp, FaClock, FaShare, FaEnvelope, FaPrint, FaFax, FaUsers, FaInfoCircle, FaEye, FaTimes, FaFilter, FaCalendarAlt, FaRulerHorizontal, FaFont } from 'react-icons/fa';
import { DetailsPanel } from '../DetailsPanel';
import { RecentsView } from './RecentsView';
import { ThisPCView } from './ThisPCView';
import { FileList } from '../FileUtils/FileList';
import { DriveItem } from './DriveItem';
import { SettingsMenu } from '../SettingsMenu/SettingsMenu';
import { Drive, FileItem } from 'shared/file-data';
import { FileSystemItem } from '../../../shared/ipc-channels';
import { useFileExplorerUI, generateContextMenuItems } from '../../utils/UIUtils';
import './RecentsThisPCStyles.scss';

interface TabContentModernProps {
    tabId: string;
    isActive: boolean;
    viewMode: string;
    setViewMode: (mode: string) => void;
    drives: Drive[];
    drivesLoading?: boolean;
    drivesError?: string | null;
    onRefreshDrives?: () => Promise<void>;
}

export const TabContentModern: React.FC<TabContentModernProps> = React.memo(({ 
    tabId, 
    isActive, 
    viewMode, 
    setViewMode, 
    drives, 
    drivesLoading = false, 
    drivesError = null, 
    onRefreshDrives 
}) => {
    // UI state
    const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
    const [hoveredDrive, setHoveredDrive] = useState<Drive | null>(null);
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'share' | 'view' | 'manage' | 'organize' | 'tools' | 'help'>('home');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Helper function to trigger file list refresh
    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // Use the comprehensive file explorer UI hook
    const fileExplorer = useFileExplorerUI(triggerRefresh, { enableShortcuts: isActive });

    // Context menu state
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
        if (fileExplorer.selectedFiles.length > 0) {
            return fileExplorer.selectedFiles;
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

    // Enhanced navigation with the new IPC navigation utils
    const handleSidebarNavigation = useCallback(async (view: string, itemName: string) => {
        if (view === 'thispc') {
            fileExplorer.navigateToThisPC();
            fileExplorer.clearSelection();
        } else if (view === 'recents') {
            fileExplorer.navigateToRecents();
            fileExplorer.clearSelection();
        } else {
            // Use the new navigation IPC for known folders
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
                console.error(`Failed to navigate to ${itemName}`);
            }
        }
    }, [fileExplorer, drives]);

    // Context menu handlers
    const handleContextMenu = useCallback((event: React.MouseEvent, item?: FileSystemItem) => {
        event.preventDefault();

        const itemsForContextMenu = item 
            ? (fileExplorer.isSelected(item) ? fileExplorer.selectedFiles : [item])
            : [];

        setContextMenu({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            selectedItems: itemsForContextMenu,
        });
    }, [fileExplorer]);

    const handleCloseContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, visible: false }));
    }, []);

    // Context menu items
    const contextMenuItems = useMemo(() => {
        return generateContextMenuItems(
            contextMenu.selectedItems,
            fileExplorer.clipboardState,
            {
                onCopy: fileExplorer.handleCopy,
                onCut: fileExplorer.handleCut,
                onPaste: fileExplorer.handlePaste,
                onDelete: fileExplorer.handleDelete,
                onRename: fileExplorer.handleRename,
                onNewFolder: fileExplorer.handleNewFolder,
                onProperties: () => {
                    if (contextMenu.selectedItems.length === 1) {
                        fileExplorer.showProperties(contextMenu.selectedItems[0]);
                    }
                },
                onShowInExplorer: () => {
                    if (contextMenu.selectedItems.length === 1) {
                        fileExplorer.showInExplorer(contextMenu.selectedItems[0]);
                    }
                }
            }
        );
    }, [contextMenu.selectedItems, fileExplorer]);

    // Resize handlers (keeping existing functionality)
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

    return (
        <div className="tab-content-modern">
            {/* Your existing JSX structure, but using the new fileExplorer methods */}
            
            {/* Example usage in the file list */}
            {fileExplorer.currentView === 'folder' && (
                <FileList
                    currentPath={fileExplorer.currentPath}
                    viewMode={viewMode as 'list' | 'grid'}
                    onNavigate={fileExplorer.navigateToPath}
                    onFileSelect={(file) => {
                        const files = Array.isArray(file) ? file : [file];
                        fileExplorer.selectFiles(files);
                    }}
                    selectedFiles={fileExplorer.selectedFiles}
                    onSelectionChange={fileExplorer.selectFiles}
                    refreshTrigger={refreshTrigger}
                />
            )}

            {/* Context menu example */}
            {contextMenu.visible && (
                <div 
                    className="context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={handleCloseContextMenu}
                >
                    {contextMenuItems.map((item, index) => (
                        <div key={index} className="context-menu-item" onClick={item.action}>
                            {item.label}
                            {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                        </div>
                    ))}
                </div>
            )}

            {/* Details Panel */}
            <div
                className={`details-panel-container ${showDetailsPanel ? 'visible' : 'hidden'}`}
                style={{ width: showDetailsPanel ? `${detailsPanelWidth}px` : '0px' }}
            >
                <DetailsPanel
                    selectedItems={getDetailsPanelItems()}
                    isVisible={showDetailsPanel}
                />
            </div>
        </div>
    );
});

export default TabContentModern;
