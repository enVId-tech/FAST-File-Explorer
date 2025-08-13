import React, { useState, useEffect, useCallback } from 'react';
import { FaDownload, FaUpload, FaCopy, FaTimes, FaPause, FaPlay, FaStop, FaChartLine, FaFolder, FaFile } from 'react-icons/fa';
import './FileTransferUI.scss';

interface FileTransfer {
    id: string;
    type: 'download' | 'upload' | 'copy' | 'move';
    sourcePath: string;
    destinationPath: string;
    fileName: string;
    fileSize: number;
    transferred: number;
    speed: number; // bytes per second
    status: 'active' | 'paused' | 'completed' | 'error';
    startTime: number;
    estimatedTimeRemaining?: number;
}

interface FileTransferUIProps {
    isVisible: boolean;
    onClose: () => void;
    fileSizeUnit: 'decimal' | 'binary';
}

export const FileTransferUI: React.FC<FileTransferUIProps> = ({ isVisible, onClose, fileSizeUnit }) => {
    const [transfers, setTransfers] = useState<FileTransfer[]>([]);
    const [showCompleted, setShowCompleted] = useState(false);

    // Demo data generator
    useEffect(() => {
        if (!isVisible) return;

        const demoTransfers: FileTransfer[] = [
            {
                id: '1',
                type: 'download',
                sourcePath: 'https://example.com/large-file.zip',
                destinationPath: 'C:\\Users\\Downloads\\large-file.zip',
                fileName: 'large-file.zip',
                fileSize: 1024 * 1024 * 500, // 500 MB
                transferred: 1024 * 1024 * 250, // 250 MB
                speed: 1024 * 1024 * 5, // 5 MB/s
                status: 'active',
                startTime: Date.now() - 50000,
            },
            {
                id: '2',
                type: 'copy',
                sourcePath: 'D:\\Videos\\movie.mp4',
                destinationPath: 'E:\\Backup\\Videos\\movie.mp4',
                fileName: 'movie.mp4',
                fileSize: 1024 * 1024 * 1024 * 2, // 2 GB
                transferred: 1024 * 1024 * 800, // 800 MB
                speed: 1024 * 1024 * 15, // 15 MB/s
                status: 'active',
                startTime: Date.now() - 120000,
            },
            {
                id: '3',
                type: 'upload',
                sourcePath: 'C:\\Documents\\presentation.pptx',
                destinationPath: 'cloud://drive/presentations/presentation.pptx',
                fileName: 'presentation.pptx',
                fileSize: 1024 * 1024 * 25, // 25 MB
                transferred: 1024 * 1024 * 25, // Complete
                speed: 0,
                status: 'completed',
                startTime: Date.now() - 300000,
            },
        ];

        setTransfers(demoTransfers);

        // Demo animation - update progress
        const interval = setInterval(() => {
            setTransfers(prev => prev.map(transfer => {
                if (transfer.status === 'active' && transfer.transferred < transfer.fileSize) {
                    const increment = Math.random() * transfer.speed * 0.5; // Simulate variable speed
                    const newTransferred = Math.min(transfer.transferred + increment, transfer.fileSize);
                    const progress = newTransferred / transfer.fileSize;
                    
                    return {
                        ...transfer,
                        transferred: newTransferred,
                        speed: transfer.speed + (Math.random() - 0.5) * transfer.speed * 0.1, // Slight speed variation
                        status: progress >= 1 ? 'completed' : 'active',
                        estimatedTimeRemaining: progress < 1 ? Math.round((transfer.fileSize - newTransferred) / transfer.speed) : undefined,
                    };
                }
                return transfer;
            }));
        }, 500);

        return () => clearInterval(interval);
    }, [isVisible]);

    const formatFileSize = useCallback((bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = fileSizeUnit === 'binary' ? 1024 : 1000;
        const sizes = fileSizeUnit === 'binary' 
            ? ['B', 'KiB', 'MiB', 'GiB', 'TiB'] 
            : ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }, [fileSizeUnit]);

    const formatSpeed = useCallback((bytesPerSecond: number) => {
        return formatFileSize(bytesPerSecond) + '/s';
    }, [formatFileSize]);

    const formatTime = useCallback((seconds: number) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
    }, []);

    const getTransferIcon = (type: FileTransfer['type']) => {
        switch (type) {
            case 'download': return <FaDownload />;
            case 'upload': return <FaUpload />;
            case 'copy': return <FaCopy />;
            case 'move': return <FaCopy />;
        }
    };

    const getStatusColor = (status: FileTransfer['status']) => {
        switch (status) {
            case 'active': return 'var(--accent-color)';
            case 'paused': return 'var(--warning-color, #f59e0b)';
            case 'completed': return 'var(--success-color, #10b981)';
            case 'error': return 'var(--error-color, #ef4444)';
        }
    };

    const activeTransfers = transfers.filter(t => t.status === 'active' || t.status === 'paused');
    const completedTransfers = transfers.filter(t => t.status === 'completed' || t.status === 'error');
    const totalSpeed = activeTransfers.reduce((sum, t) => sum + t.speed, 0);
    const totalTransfersPerSecond = activeTransfers.length;

    if (!isVisible) return null;

    return (
        <div className="file-transfer-overlay">
            <div className="file-transfer-ui">
                <div className="transfer-header">
                    <div className="header-left">
                        <h3>File Transfers</h3>
                        <div className="transfer-stats">
                            <span className="stat">
                                <FaChartLine />
                                {totalTransfersPerSecond} transfers/s
                            </span>
                            <span className="stat">
                                {formatSpeed(totalSpeed)}
                            </span>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="transfer-controls">
                    <button
                        className={`control-tab ${!showCompleted ? 'active' : ''}`}
                        onClick={() => setShowCompleted(false)}
                    >
                        Active ({activeTransfers.length})
                    </button>
                    <button
                        className={`control-tab ${showCompleted ? 'active' : ''}`}
                        onClick={() => setShowCompleted(true)}
                    >
                        Completed ({completedTransfers.length})
                    </button>
                </div>

                <div className="transfer-list">
                    {(showCompleted ? completedTransfers : activeTransfers).map(transfer => (
                        <TransferItem
                            key={transfer.id}
                            transfer={transfer}
                            formatFileSize={formatFileSize}
                            formatSpeed={formatSpeed}
                            formatTime={formatTime}
                            getTransferIcon={getTransferIcon}
                            getStatusColor={getStatusColor}
                        />
                    ))}
                    
                    {(showCompleted ? completedTransfers : activeTransfers).length === 0 && (
                        <div className="empty-state">
                            <p>No {showCompleted ? 'completed' : 'active'} transfers</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TransferItem: React.FC<{
    transfer: FileTransfer;
    formatFileSize: (bytes: number) => string;
    formatSpeed: (bytesPerSecond: number) => string;
    formatTime: (seconds: number) => string;
    getTransferIcon: (type: FileTransfer['type']) => React.ReactElement;
    getStatusColor: (status: FileTransfer['status']) => string;
}> = ({ transfer, formatFileSize, formatSpeed, formatTime, getTransferIcon, getStatusColor }) => {
    const progress = (transfer.transferred / transfer.fileSize) * 100;
    
    return (
        <div className="transfer-item">
            <div className="transfer-info">
                <div className="transfer-icon" style={{ color: getStatusColor(transfer.status) }}>
                    {getTransferIcon(transfer.type)}
                </div>
                <div className="transfer-details">
                    <div className="transfer-name">
                        <FaFile className="file-icon" />
                        {transfer.fileName}
                    </div>
                    <div className="transfer-paths">
                        <div className="path">
                            <span className="path-label">From:</span>
                            <span className="path-value">{transfer.sourcePath}</span>
                        </div>
                        <div className="path">
                            <span className="path-label">To:</span>
                            <span className="path-value">{transfer.destinationPath}</span>
                        </div>
                    </div>
                </div>
                <div className="transfer-stats">
                    <div className="stat-item">
                        <span className="stat-label">Progress</span>
                        <span className="stat-value">
                            {formatFileSize(transfer.transferred)} / {formatFileSize(transfer.fileSize)}
                        </span>
                    </div>
                    {transfer.status === 'active' && (
                        <>
                            <div className="stat-item">
                                <span className="stat-label">Speed</span>
                                <span className="stat-value">{formatSpeed(transfer.speed)}</span>
                            </div>
                            {transfer.estimatedTimeRemaining && (
                                <div className="stat-item">
                                    <span className="stat-label">ETA</span>
                                    <span className="stat-value">{formatTime(transfer.estimatedTimeRemaining)}</span>
                                </div>
                            )}
                        </>
                    )}
                    <div className="stat-item">
                        <span className="stat-label">Status</span>
                        <span className="stat-value status" style={{ color: getStatusColor(transfer.status) }}>
                            {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="progress-container">
                <div className="progress-bar">
                    <div 
                        className="progress-fill"
                        style={{ 
                            width: `${progress}%`,
                            backgroundColor: getStatusColor(transfer.status)
                        }}
                    />
                </div>
                <div className="progress-text">
                    {Math.round(progress)}%
                </div>
            </div>
            
            {transfer.status === 'active' && (
                <div className="transfer-actions">
                    <button className="action-button" title="Pause">
                        <FaPause />
                    </button>
                    <button className="action-button" title="Stop">
                        <FaStop />
                    </button>
                </div>
            )}
        </div>
    );
};
