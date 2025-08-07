import React, { useState, useEffect } from 'react';
import { FaHdd, FaDesktop, FaFolder, FaDownload, FaMusic, FaVideo, FaFileImage, FaSdCard, FaUsb, FaServer, FaCloud, FaNetworkWired, FaCog, FaBars, FaThLarge, FaExternalLinkAlt, FaGamepad, FaDatabase, FaTimes, FaChartBar, FaChartPie, FaArchive, FaHardHat } from 'react-icons/fa';

interface DriveInfo {
    name: string;
    letter: string;
    type: 'local' | 'removable' | 'network' | 'cd';
    totalSpace: string;
    totalBytes: number;
    usedSpace: string;
    usedBytes: number;
    freeSpace: string;
    freeBytes: number;
    usagePercentage: number;
    icon: React.ReactNode;
    customIcon?: React.ReactNode;
    status: 'healthy' | 'warning' | 'critical';
    color: string;
    description?: string;
}

interface QuickAccessItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    description: string;
}

interface ThisPCViewProps {
    viewMode: string;
}

export const ThisPCView: React.FC<ThisPCViewProps> = ({ viewMode }) => {
    const [drives, setDrives] = useState<DriveInfo[]>([
        {
            name: 'Local Disk',
            letter: 'C:',
            type: 'local',
            totalSpace: '1.86 TB',
            totalBytes: 2046820564992,
            usedSpace: '1.12 TB',
            usedBytes: 1228416921600,
            freeSpace: '755 GB',
            freeBytes: 818403643392,
            usagePercentage: 60,
            icon: <FaHdd style={{ color: '#0078D4' }} />,
            customIcon: <FaHdd style={{ color: '#0078D4' }} />,
            status: 'healthy',
            color: '#0078D4',
            description: 'System drive with Windows and programs'
        },
        {
            name: 'Data Drive',
            letter: 'D:',
            type: 'local',
            totalSpace: '3.64 TB',
            totalBytes: 4003791560704,
            usedSpace: '2.89 TB',
            usedBytes: 3162995294208,
            freeSpace: '758 GB',
            freeBytes: 840796266496,
            usagePercentage: 79,
            icon: <FaDatabase style={{ color: '#107C10' }} />,
            customIcon: <FaDatabase style={{ color: '#107C10' }} />,
            status: 'warning',
            color: '#107C10',
            description: 'Storage drive for documents and media'
        },
        {
            name: 'SSD Storage',
            letter: 'E:',
            type: 'local',
            totalSpace: '931 GB',
            totalBytes: 1000204886016,
            usedSpace: '456 GB',
            usedBytes: 489900441600,
            freeSpace: '475 GB',
            freeBytes: 510304444416,
            usagePercentage: 49,
            icon: <FaSdCard style={{ color: '#FF8C00' }} />,
            customIcon: <FaSdCard style={{ color: '#FF8C00' }} />,
            status: 'healthy',
            color: '#FF8C00',
            description: 'High-speed SSD for games and applications'
        },
        {
            name: 'USB Drive',
            letter: 'F:',
            type: 'removable',
            totalSpace: '64 GB',
            totalBytes: 68719476736,
            usedSpace: '58.2 GB',
            usedBytes: 62498128896,
            freeSpace: '5.8 GB',
            freeBytes: 6221347840,
            usagePercentage: 91,
            icon: <FaUsb style={{ color: '#8B4513' }} />,
            customIcon: <FaUsb style={{ color: '#8B4513' }} />,
            status: 'critical',
            color: '#8B4513',
            description: 'Portable USB storage device'
        },
        {
            name: 'Network Drive',
            letter: 'Z:',
            type: 'network',
            totalSpace: '10 TB',
            totalBytes: 10995116277760,
            usedSpace: '3.2 TB',
            usedBytes: 3518437208883,
            freeSpace: '6.8 TB',
            freeBytes: 7476679068877,
            usagePercentage: 32,
            icon: <FaNetworkWired style={{ color: '#6B46C1' }} />,
            customIcon: <FaNetworkWired style={{ color: '#6B46C1' }} />,
            status: 'healthy',
            color: '#6B46C1',
            description: 'Network attached storage'
        }
    ]);

    const [visualizationMode, setVisualizationMode] = useState<'bar' | 'pie'>('bar');
    const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
    const [driveViewMode, setDriveViewMode] = useState<'large' | 'medium' | 'small'>('large');
    const [showIconPicker, setShowIconPicker] = useState<{ driveIndex: number; show: boolean }>({ driveIndex: -1, show: false });

    // Icon selection options
    const iconOptions = [
        { Icon: FaHdd, name: 'HDD', color: '#0078D4' },
        { Icon: FaHardHat, name: 'SSD', color: '#FF8C00' },
        { Icon: FaDatabase, name: 'Database', color: '#107C10' },
        { Icon: FaUsb, name: 'USB', color: '#8B4513' },
        { Icon: FaSdCard, name: 'SD Card', color: '#FF6B6B' },
        { Icon: FaNetworkWired, name: 'Network', color: '#6B46C1' },
        { Icon: FaServer, name: 'Server', color: '#4A5568' },
        { Icon: FaCloud, name: 'Cloud', color: '#00D4FF' },
        { Icon: FaFolder, name: 'Folder', color: '#F59E0B' },
        { Icon: FaArchive, name: 'Archive', color: '#8B5CF6' }
    ];

    const updateDriveIcon = (driveIndex: number, iconIndex: number) => {
        const newDrives = [...drives];
        const selectedIcon = iconOptions[iconIndex];
        newDrives[driveIndex].customIcon = <selectedIcon.Icon style={{ color: selectedIcon.color }} />;
        newDrives[driveIndex].color = selectedIcon.color;
        setDrives(newDrives);
        setShowIconPicker({ driveIndex: -1, show: false });
    };

    const IconPicker: React.FC<{ driveIndex: number; onClose: () => void }> = ({ driveIndex, onClose }) => {
        return (
            <div className="icon-picker-overlay" onClick={onClose}>
                <div className="icon-picker-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="icon-picker-header">
                        <h3>Choose Drive Icon</h3>
                        <button onClick={onClose} className="close-button">
                            <FaTimes />
                        </button>
                    </div>
                    <div className="icon-picker-grid">
                        {iconOptions.map((option, index) => (
                            <button
                                key={index}
                                className="icon-picker-option"
                                onClick={() => updateDriveIcon(driveIndex, index)}
                                title={option.name}
                            >
                                <option.Icon style={{ color: option.color }} />
                                <span>{option.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const [quickAccessItems] = useState<QuickAccessItem[]>([
        {
            name: 'Desktop',
            path: 'C:\\Users\\User\\Desktop',
            icon: <FaDesktop style={{ color: '#0078D4' }} />,
            description: 'Access your desktop files and shortcuts'
        },
        {
            name: 'Documents',
            path: 'C:\\Users\\User\\Documents',
            icon: <FaFolder style={{ color: '#FDB900' }} />,
            description: 'Your documents and important files'
        },
        {
            name: 'Downloads',
            path: 'C:\\Users\\User\\Downloads',
            icon: <FaDownload style={{ color: '#107C10' }} />,
            description: 'Files downloaded from the internet'
        },
        {
            name: 'Pictures',
            path: 'C:\\Users\\User\\Pictures',
            icon: <FaFileImage style={{ color: '#E74856' }} />,
            description: 'Photos and image files'
        },
        {
            name: 'Music',
            path: 'C:\\Users\\User\\Music',
            icon: <FaMusic style={{ color: '#FF8C00' }} />,
            description: 'Audio files and music library'
        },
        {
            name: 'Videos',
            path: 'C:\\Users\\User\\Videos',
            icon: <FaVideo style={{ color: '#8B4513' }} />,
            description: 'Video files and movies'
        }
    ]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return '#107C10';
            case 'warning': return '#FFB900';
            case 'critical': return '#D13438';
            default: return '#0078D4';
        }
    };

    const formatBytes = (usagePercentage: number) => {
        if (usagePercentage >= 90) return 'critical';
        if (usagePercentage >= 75) return 'warning';
        return 'healthy';
    };

    const availableIcons = [
        { name: 'Hard Drive', icon: <FaHdd />, color: '#0078D4' },
        { name: 'Database', icon: <FaDatabase />, color: '#107C10' },
        { name: 'SD Card', icon: <FaSdCard />, color: '#FF8C00' },
        { name: 'USB Drive', icon: <FaUsb />, color: '#8B4513' },
        { name: 'Network', icon: <FaNetworkWired />, color: '#6B46C1' },
        { name: 'Server', icon: <FaServer />, color: '#E74856' },
        { name: 'Gaming', icon: <FaGamepad />, color: '#FF6B35' }
    ];

    const PieChart: React.FC<{ drive: DriveInfo }> = ({ drive }) => {
        const radius = 60;
        const strokeWidth = 16;
        const normalizedRadius = radius - strokeWidth * 2;
        const circumference = normalizedRadius * 2 * Math.PI;
        const strokeDasharray = `${drive.usagePercentage / 100 * circumference} ${circumference}`;

        return (
            <div className="pie-chart-container">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="pie-chart"
                    onMouseEnter={() => setSelectedDrive(drive)}
                    onMouseLeave={() => setSelectedDrive(null)}
                    viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                >
                    <circle
                        stroke="var(--border-primary)"
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke={drive.color}
                        fill="transparent"
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        style={{
                            strokeDashoffset: circumference / 4,
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%',
                            transition: 'stroke-dasharray 0.3s ease'
                        }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>
                <div className="pie-chart-center">
                    <div className="pie-chart-percentage">{drive.usagePercentage}%</div>
                    <div className="pie-chart-label">Used</div>
                </div>
                {selectedDrive?.letter === drive.letter && (
                    <div className="drive-stats-tooltip">
                        <div className="tooltip-row">
                            <span className="stat-label">Used:</span>
                            <span className="stat-value">{drive.usedSpace}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="stat-label">Free:</span>
                            <span className="stat-value">{drive.freeSpace}</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="stat-label">Total:</span>
                            <span className="stat-value">{drive.totalSpace}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="thispc-view">
            {showIconPicker.show && (
                <IconPicker 
                    driveIndex={showIconPicker.driveIndex} 
                    onClose={() => setShowIconPicker({ driveIndex: -1, show: false })} 
                />
            )}
            
            <div className="thispc-header">
                <div className="header-content">
                    <FaDesktop className="header-icon" />
                    <div className="header-text">
                        <h2>This PC</h2>
                        <p>Access your drives, folders, and devices</p>
                    </div>
                </div>
                
                <div className="thispc-controls">
                    <div className="view-size-controls">
                        <button
                            className={`size-btn ${driveViewMode === 'large' ? 'active' : ''}`}
                            onClick={() => setDriveViewMode('large')}
                            title="Large icons"
                        >
                            <FaThLarge />
                        </button>
                        <button
                            className={`size-btn ${driveViewMode === 'medium' ? 'active' : ''}`}
                            onClick={() => setDriveViewMode('medium')}
                            title="Medium icons"
                        >
                            <FaBars />
                        </button>
                        <button
                            className={`size-btn ${driveViewMode === 'small' ? 'active' : ''}`}
                            onClick={() => setDriveViewMode('small')}
                            title="Small icons"
                        >
                            <FaCog />
                        </button>
                    </div>
                    
                    <div className="header-controls">
                        <button 
                            className={`view-toggle-btn ${visualizationMode === 'bar' ? 'active' : ''}`}
                            onClick={() => setVisualizationMode('bar')}
                            title="Bar visualization"
                        >
                            <FaBars />
                        </button>
                        <button 
                            className={`view-toggle-btn ${visualizationMode === 'pie' ? 'active' : ''}`}
                            onClick={() => setVisualizationMode('pie')}
                            title="Pie chart visualization"
                        >
                            <FaChartPie />
                        </button>
                    </div>
                </div>
            </div>

            <div className="thispc-content">

            {/* Quick Access Section */}
            <div className="quick-access-section">
                <h3 className="section-title">
                    <FaFolder className="section-icon" />
                    Folders
                </h3>
                <div className={`quick-access-${viewMode}`}>
                    {quickAccessItems.map((item, index) => (
                        <div key={index} className="quick-access-item">
                            <div className="item-icon-container">
                                {item.icon}
                            </div>
                            <div className="item-content">
                                <h4 className="item-name">{item.name}</h4>
                                {viewMode === 'grid' && (
                                    <p className="item-description">{item.description}</p>
                                )}
                                <div className="item-path">{item.path}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Drives Section */}
            <div className="drives-section">
                <h3 className="section-title">
                    <FaHdd className="section-icon" />
                    Devices and drives ({drives.length})
                </h3>
                <div className={`drives-container drives-${driveViewMode} drives-scrollable`}>
                    {drives.map((drive, index) => (
                        <div key={index} className={`drive-card ${drive.type} ${drive.status}`}>
                            <div className="drive-header">
                                <div className="drive-icon-large">
                                    {drive.customIcon || drive.icon}
                                    <div className={`status-dot ${drive.status}`}></div>
                                    <button 
                                        className="icon-edit-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowIconPicker({ driveIndex: index, show: true });
                                        }}
                                        title="Change drive icon"
                                    >
                                        <FaCog />
                                    </button>
                                </div>
                                
                                <div className="drive-info">
                                    <div className="drive-title">
                                        <h4 className="drive-name">{drive.name}</h4>
                                        <span className="drive-letter">({drive.letter})</span>
                                    </div>
                                    <div className="drive-type-badge">
                                        {drive.type === 'local' && 'Local Disk'}
                                        {drive.type === 'removable' && 'Removable Disk'}
                                        {drive.type === 'network' && 'Network Drive'}
                                        {drive.type === 'cd' && 'CD/DVD Drive'}
                                    </div>
                                    {drive.description && (
                                        <p className="drive-description">{drive.description}</p>
                                    )}
                                </div>

                                <div className="drive-actions">
                                    <button className="action-btn" title="Properties">
                                        <FaCog />
                                    </button>
                                    <button className="action-btn" title="Open in new window">
                                        <FaExternalLinkAlt />
                                    </button>
                                </div>
                            </div>

                            <div className="drive-storage">
                                {visualizationMode === 'bar' ? (
                                    <>
                                        <div className="storage-bar-container">
                                            <div className="storage-bar">
                                                <div 
                                                    className={`storage-fill ${formatBytes(drive.usagePercentage)}`}
                                                    style={{ 
                                                        width: `${drive.usagePercentage}%`,
                                                        background: `linear-gradient(90deg, ${drive.color}, ${drive.color}aa)`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="storage-labels">
                                                <span className="storage-used">Used: {drive.usedSpace}</span>
                                                <span className="storage-free">Free: {drive.freeSpace}</span>
                                            </div>
                                        </div>
                                        <div className="storage-summary">
                                            <div className="storage-total">
                                                <strong>{drive.totalSpace}</strong> total
                                            </div>
                                            <div className={`storage-percentage ${formatBytes(drive.usagePercentage)}`}>
                                                {drive.usagePercentage}% used
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="pie-visualization">
                                        <PieChart drive={drive} />
                                        <div className="storage-details">
                                            <div className="detail-item">
                                                <div className="detail-color-indicator" style={{ backgroundColor: drive.color }}></div>
                                                <span className="detail-label">Used</span>
                                                <span className="detail-value">{drive.usedSpace}</span>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-color-indicator" style={{ backgroundColor: 'var(--border-primary)' }}></div>
                                                <span className="detail-label">Free</span>
                                                <span className="detail-value">{drive.freeSpace}</span>
                                            </div>
                                            <div className="total-space">
                                                Total: <strong>{drive.totalSpace}</strong>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {drive.type === 'network' && (
                                <div className="network-indicator">
                                    <FaCloud className="cloud-icon" />
                                    <span>Connected to network</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            </div>
        </div>
    );
};
