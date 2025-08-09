import React, { useState, useEffect } from 'react';
import { FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaFilePdf, FaFolder, FaClock, FaStar, FaCalendarAlt } from 'react-icons/fa';

interface RecentFile {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size?: string;
    lastOpened: string;
    dateModified: string;
    icon: React.ReactNode;
    isFavorite?: boolean;
}

interface RecentsViewProps {
    viewMode: string;
}

export const RecentsView: React.FC<RecentsViewProps> = ({ viewMode }) => {
    const [recentFiles, setRecentFiles] = useState<RecentFile[]>([
        {
            name: 'Project Presentation.pptx',
            path: 'C:\\Users\\Documents\\Project Presentation.pptx',
            type: 'file',
            size: '2.4 MB',
            lastOpened: '2 hours ago',
            dateModified: '2/5/2024 2:30 PM',
            icon: <FaFilePowerpoint style={{ color: '#D24726' }} />,
            isFavorite: true
        },
        {
            name: 'Budget Analysis.xlsx',
            path: 'C:\\Users\\Documents\\Budget Analysis.xlsx',
            type: 'file',
            size: '890 KB',
            lastOpened: '4 hours ago',
            dateModified: '2/5/2024 10:15 AM',
            icon: <FaFileExcel style={{ color: '#207245' }} />,
            isFavorite: false
        },
        {
            name: 'Meeting Notes.docx',
            path: 'C:\\Users\\Documents\\Meeting Notes.docx',
            type: 'file',
            size: '156 KB',
            lastOpened: '6 hours ago',
            dateModified: '2/4/2024 4:45 PM',
            icon: <FaFileWord style={{ color: '#2B579A' }} />,
            isFavorite: false
        },
        {
            name: 'Design Assets',
            path: 'C:\\Users\\Documents\\Design Assets',
            type: 'folder',
            lastOpened: '1 day ago',
            dateModified: '2/4/2024 11:20 AM',
            icon: <FaFolder style={{ color: '#FDB900' }} />,
            isFavorite: true
        },
        {
            name: 'Screenshot_2024-02-05.png',
            path: 'C:\\Users\\Desktop\\Screenshot_2024-02-05.png',
            type: 'file',
            size: '1.2 MB',
            lastOpened: '1 day ago',
            dateModified: '2/4/2024 3:12 PM',
            icon: <FaFileImage style={{ color: '#0078D4' }} />,
            isFavorite: false
        },
        {
            name: 'main.tsx',
            path: 'C:\\Projects\\file-explorer\\src\\main.tsx',
            type: 'file',
            size: '45 KB',
            lastOpened: '2 days ago',
            dateModified: '2/3/2024 9:30 AM',
            icon: <FaFileCode style={{ color: '#0078D4' }} />,
            isFavorite: false
        },
        {
            name: 'Annual Report.pdf',
            path: 'C:\\Users\\Downloads\\Annual Report.pdf',
            type: 'file',
            size: '5.8 MB',
            lastOpened: '3 days ago',
            dateModified: '2/2/2024 1:15 PM',
            icon: <FaFilePdf style={{ color: '#DC3545' }} />,
            isFavorite: false
        },
        {
            name: 'config.json',
            path: 'C:\\Projects\\settings\\config.json',
            type: 'file',
            size: '12 KB',
            lastOpened: '1 week ago',
            dateModified: '1/29/2024 8:45 AM',
            icon: <FaFileCode style={{ color: '#FDB900' }} />,
            isFavorite: false
        }
    ]);

    const toggleFavorite = (index: number) => {
        setRecentFiles(prev => 
            prev.map((file, i) => 
                i === index ? { ...file, isFavorite: !file.isFavorite } : file
            )
        );
    };

    if (viewMode === 'grid') {
        return (
            <div className="recents-view">
                <div className="recents-header">
                    <div className="header-content">
                        <FaClock className="header-icon" />
                        <div className="header-text">
                            <h2>Recent Files</h2>
                            <p>Files and folders you've recently opened</p>
                        </div>
                    </div>
                </div>
                
                <div className="recents-content">
                
                <div className="recents-grid">
                    {recentFiles.map((file, index) => (
                        <div key={index} className="recent-item-card">
                            <div className="item-header">
                                <div className="item-icon">
                                    {file.icon}
                                </div>
                                <button 
                                    className={`favorite-btn ${file.isFavorite ? 'active' : ''}`}
                                    onClick={() => toggleFavorite(index)}
                                >
                                    <FaStar />
                                </button>
                            </div>
                            
                            <div className="item-content">
                                <h3 className="item-name" title={file.name}>
                                    {file.name}
                                </h3>
                                <div className="item-details">
                                    <div className="detail-row">
                                        <FaClock className="detail-icon" />
                                        <span>{file.lastOpened}</span>
                                    </div>
                                    {file.size && (
                                        <div className="detail-row">
                                            <span className="file-size">{file.size}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="item-path" title={file.path}>
                                    {file.path}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </div>
        );
    }

    // List view
    return (
        <div className="recents-view">
            <div className="recents-header">
                <div className="header-content">
                    <FaClock className="header-icon" />
                    <div className="header-text">
                        <h2>Recent Files</h2>
                        <p>Files and folders you've recently opened</p>
                    </div>
                </div>
            </div>

            <div className="recents-content">
                <div className="recents-list">
                    <div className="list-header">
                        <div className="column-header name">Name</div>
                        <div className="column-header last-opened">Last Opened</div>
                    <div className="column-header size">Size</div>
                    <div className="column-header modified">Date Modified</div>
                    <div className="column-header path">Location</div>
                </div>
                
                {recentFiles.map((file, index) => (
                    <div key={index} className="recent-item-row">
                        <div className="item-name-column">
                            <div className="item-icon">
                                {file.icon}
                            </div>
                            <span className="item-name">{file.name}</span>
                            <button 
                                className={`favorite-btn ${file.isFavorite ? 'active' : ''}`}
                                onClick={() => toggleFavorite(index)}
                            >
                                <FaStar />
                            </button>
                        </div>
                        <div className="item-last-opened">
                            <FaClock className="time-icon" />
                            {file.lastOpened}
                        </div>
                        <div className="item-size">{file.size || '—'}</div>
                        <div className="item-modified">{file.dateModified}</div>
                        <div className="item-path" title={file.path}>{file.path}</div>
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
};
