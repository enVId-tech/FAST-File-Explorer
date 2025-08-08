import React, { useState, useRef, useEffect } from 'react';
import { FaFolder, FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaCopy, FaCut, FaPaste, FaTrash, FaEdit, FaFolderPlus, FaCog, FaArrowLeft, FaArrowRight, FaArrowUp, FaSearch, FaThLarge, FaBars, FaHdd, FaDesktop, FaDownload, FaMusic, FaVideo, FaFilePdf, FaSortAlphaDown, FaSortAlphaUp, FaSortNumericDown, FaSortNumericUp, FaChevronDown, FaPalette, FaSun, FaMoon, FaWindows, FaClock, FaShare, FaEnvelope, FaPrint, FaFax, FaUsers, FaInfoCircle, FaEye } from 'react-icons/fa';
import { DetailsPanel } from './DetailsPanel';
import { RecentsView } from './RecentsView';
import { ThisPCView } from './ThisPCView';
import './RecentsThisPCStyles.scss';

interface FileItem {
    name: string;
    type: 'file' | 'folder';
    size?: string;
    dateModified: string;
    dateCreated?: string;
    owner?: string;
    permissions?: string;
    description?: string;
    tags?: string[];
    icon: React.ReactNode;
}

interface TabContentProps {
    tabId: string;
    isActive: boolean;
    viewMode: string;
    setViewMode: (mode: string) => void;
}

export const TabContent: React.FC<TabContentProps> = ({ tabId, isActive, viewMode, setViewMode }) => {
    const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
    const [showDetailsPanel, setShowDetailsPanel] = useState(true);
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentView, setCurrentView] = useState<'thispc' | 'recents' | 'folder'>('thispc');
    const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'share' | 'view' | 'manage' | 'organize' | 'tools' | 'help'>('home');

    const handleSidebarNavigation = (view: string, itemName: string) => {
        if (view === 'thispc') {
            setCurrentView('thispc');
        } else if (view === 'recents') {
            setCurrentView('recents');
        } else {
            setCurrentView('folder');
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
                { name: 'Local Disk (C:)', icon: <FaHdd />, active: false, view: 'folder' },
                { name: 'Local Disk (D:)', icon: <FaHdd />, active: false, view: 'folder' },
            ]
        }
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
                        <button className="toolbar-button"><FaArrowLeft /></button>
                        <button className="toolbar-button"><FaArrowRight /></button>
                        <button className="toolbar-button"><FaArrowUp /></button>
                    </div>
                    <div className="address-bar-container">
                        <div className="address-bar">
                            <span className="path-segment active">
                                {currentView === 'thispc' && 'This PC'}
                                {currentView === 'recents' && 'Recent Files'}
                                {currentView === 'folder' && 'This PC'}
                            </span>
                            {currentView === 'folder' && (
                                <>
                                    <span className="path-separator">›</span>
                                    <span className="path-segment">Documents</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="toolbar-section">
                        <button className="toolbar-button"><FaSearch /></button>
                        
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
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaCopy /></div>
                                        <span>Copy</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaCut /></div>
                                        <span>Cut</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaPaste /></div>
                                        <span>Paste</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">Organize</div>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaTrash /></div>
                                        <span>Delete</span>
                                    </button>
                                    <button className="ribbon-button">
                                        <div className="ribbon-icon"><FaEdit /></div>
                                        <span>Rename</span>
                                    </button>
                                </div>
                                <div className="ribbon-group">
                                    <div className="ribbon-group-label">New</div>
                                    <button className="ribbon-button">
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
                    <div className="sidebar">
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
                            </div>
                        ))}
                    </div>

                    {/* File Area */}
                    <div className="file-area">
                        {currentView === 'thispc' && (
                            <ThisPCView viewMode={viewMode} />
                        )}
                        
                        {currentView === 'recents' && (
                            <RecentsView viewMode={viewMode} />
                        )}
                        
                        {currentView === 'folder' && (
                            <div className="file-list-container">
                                {viewMode === 'list' ? (
                                    <div className="file-list">
                                        <div className="file-list-header">
                                            <div className="header-cell" onClick={() => handleSort('name')}>
                                                Name {getSortIcon('name')}
                                            </div>
                                            <div className="header-cell" onClick={() => handleSort('size')}>
                                                Size {getSortIcon('size')}
                                            </div>
                                            <div className="header-cell" onClick={() => handleSort('date')}>
                                                Date Modified {getSortIcon('date')}
                                            </div>
                                            <div className="header-cell" onClick={() => handleSort('type')}>
                                                Type {getSortIcon('type')}
                                            </div>
                                        </div>
                                        {sortedFiles.map((file, index) => (
                                            <div 
                                                key={index} 
                                                className={`file-item ${selectedItem?.name === file.name ? 'selected' : ''}`}
                                                onClick={() => handleItemClick(file)}
                                            >
                                                <div className="file-info">
                                                    <span className="file-icon">{file.icon}</span>
                                                    <span className="file-name">{file.name}</span>
                                                </div>
                                                <div className="file-size">{file.size || ''}</div>
                                                <div className="file-date">{file.dateModified}</div>
                                                <div className="file-type">{file.type === 'folder' ? 'File folder' : 'File'}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="file-grid">
                                        {sortedFiles.map((file, index) => (
                                            <div 
                                                key={index} 
                                                className={`file-item ${selectedItem?.name === file.name ? 'selected' : ''}`}
                                                onClick={() => handleItemClick(file)}
                                            >
                                                <span className="file-icon">{file.icon}</span>
                                                <span className="file-name">{file.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Details Panel */}
                    <DetailsPanel 
                        selectedItem={selectedItem} 
                        isVisible={showDetailsPanel} 
                    />
                </div>
            </div>
        </div>
    );
};
