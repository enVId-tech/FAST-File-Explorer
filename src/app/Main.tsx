import React, { useState } from 'react';
import './main.scss';

interface FileItem {
    name: string;
    type: 'file' | 'folder';
    size?: string;
    dateModified: string;
    icon: string;
}

export default function Main(): React.JSX.Element {
    const [currentPath, setCurrentPath] = useState('This PC > Documents');
    const [viewMode, setViewMode] = useState('list');

    // Sample files and folders
    const fileItems: FileItem[] = [
        { name: 'Desktop', type: 'folder', dateModified: '1/15/2024 3:42 PM', icon: '📁' },
        { name: 'Documents', type: 'folder', dateModified: '2/1/2024 9:15 AM', icon: '📁' },
        { name: 'Downloads', type: 'folder', dateModified: '2/2/2024 2:30 PM', icon: '📁' },
        { name: 'Pictures', type: 'folder', dateModified: '1/28/2024 11:22 AM', icon: '📁' },
        { name: 'Music', type: 'folder', dateModified: '1/20/2024 4:18 PM', icon: '📁' },
        { name: 'Videos', type: 'folder', dateModified: '1/25/2024 7:45 PM', icon: '📁' },
        { name: 'Report.docx', type: 'file', size: '245 KB', dateModified: '2/1/2024 10:30 AM', icon: '📄' },
        { name: 'Presentation.pptx', type: 'file', size: '2.1 MB', dateModified: '1/30/2024 4:15 PM', icon: '📊' },
        { name: 'Budget.xlsx', type: 'file', size: '89 KB', dateModified: '1/29/2024 2:45 PM', icon: '📈' },
        { name: 'Photo.jpg', type: 'file', size: '3.2 MB', dateModified: '1/28/2024 6:20 PM', icon: '🖼️' },
        { name: 'Script.js', type: 'file', size: '12 KB', dateModified: '2/2/2024 1:10 PM', icon: '📝' },
    ];

    return (
        <div className="file-explorer">
            {/* Title Bar */}
            <div className="title-bar">
                <div className="title-bar-content">
                    <span className="app-name">File Explorer</span>
                </div>
                <div className="window-controls">
                    <button className="control-button minimize">−</button>
                    <button className="control-button maximize">□</button>
                    <button className="control-button close">×</button>
                </div>
            </div>

            {/* Menu Bar */}
            <div className="menu-bar">
                <div className="menu-items">
                    <span className="menu-item">File</span>
                    <span className="menu-item">Edit</span>
                    <span className="menu-item">View</span>
                    <span className="menu-item">Tools</span>
                    <span className="menu-item">Help</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="toolbar-section">
                    <button className="toolbar-button">← Back</button>
                    <button className="toolbar-button">→ Forward</button>
                    <button className="toolbar-button">↑ Up</button>
                </div>
                <div className="address-bar-container">
                    <div className="address-bar">
                        <span className="path-segment">This PC</span>
                        <span className="path-separator">&gt;</span>
                        <span className="path-segment">Documents</span>
                    </div>
                </div>
                <div className="toolbar-section">
                    <button className="toolbar-button">🔍</button>
                    <button className="toolbar-button" onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
                        {viewMode === 'list' ? '⊞' : '☰'}
                    </button>
                </div>
            </div>

            {/* Ribbon (when expanded) */}
            <div className="ribbon">
                <div className="ribbon-tabs">
                    <span className="ribbon-tab active">Home</span>
                    <span className="ribbon-tab">Share</span>
                    <span className="ribbon-tab">View</span>
                </div>
                <div className="ribbon-content">
                    <div className="ribbon-group">
                        <button className="ribbon-button">
                            <div className="ribbon-icon">📋</div>
                            <span>Copy</span>
                        </button>
                        <button className="ribbon-button">
                            <div className="ribbon-icon">✂️</div>
                            <span>Cut</span>
                        </button>
                        <button className="ribbon-button">
                            <div className="ribbon-icon">📄</div>
                            <span>Paste</span>
                        </button>
                    </div>
                    <div className="ribbon-group">
                        <button className="ribbon-button">
                            <div className="ribbon-icon">🗑️</div>
                            <span>Delete</span>
                        </button>
                        <button className="ribbon-button">
                            <div className="ribbon-icon">✏️</div>
                            <span>Rename</span>
                        </button>
                    </div>
                    <div className="ribbon-group">
                        <button className="ribbon-button">
                            <div className="ribbon-icon">📁</div>
                            <span>New folder</span>
                        </button>
                        <button className="ribbon-button">
                            <div className="ribbon-icon">⚙️</div>
                            <span>Properties</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content">
                {/* Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-section">
                        <div className="sidebar-header">Quick access</div>
                        <div className="sidebar-item">📁 Desktop</div>
                        <div className="sidebar-item">📁 Downloads</div>
                        <div className="sidebar-item">📁 Documents</div>
                        <div className="sidebar-item">📁 Pictures</div>
                    </div>
                    <div className="sidebar-section">
                        <div className="sidebar-header">This PC</div>
                        <div className="sidebar-item">📁 Desktop</div>
                        <div className="sidebar-item">📁 Documents</div>
                        <div className="sidebar-item">📁 Downloads</div>
                        <div className="sidebar-item">📁 Music</div>
                        <div className="sidebar-item">📁 Pictures</div>
                        <div className="sidebar-item">📁 Videos</div>
                        <div className="sidebar-item">💾 Local Disk (C:)</div>
                        <div className="sidebar-item">💿 DVD Drive (D:)</div>
                    </div>
                    <div className="sidebar-section">
                        <div className="sidebar-header">Network</div>
                        <div className="sidebar-item">🌐 Network</div>
                    </div>
                </div>

                {/* File List */}
                <div className="file-list-container">
                    <div className={`file-list ${viewMode}`}>
                        {viewMode === 'list' && (
                            <div className="file-list-header">
                                <div className="column-header name">Name</div>
                                <div className="column-header date">Date modified</div>
                                <div className="column-header type">Type</div>
                                <div className="column-header size">Size</div>
                            </div>
                        )}
                        <div className="file-items">
                            {fileItems.map((item, index) => (
                                <div key={index} className="file-item">
                                    <div className="file-icon">{item.icon}</div>
                                    <div className="file-name">{item.name}</div>
                                    {viewMode === 'list' && (
                                        <>
                                            <div className="file-date">{item.dateModified}</div>
                                            <div className="file-type">{item.type === 'folder' ? 'File folder' : 'File'}</div>
                                            <div className="file-size">{item.size || ''}</div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="status-bar">
                <div className="status-left">
                    <span>{fileItems.length} items</span>
                </div>
                <div className="status-right">
                    <span>Size: 6.2 MB</span>
                </div>
            </div>
        </div>
    );
}