import React, { useCallback, useMemo, useState } from 'react';
import { FaHdd, FaPencilAlt } from 'react-icons/fa';
import { Drive } from 'shared/file-data';

interface DriveItemProps {
    drive: Drive;
    active: boolean;
    onClick: () => void;
    onHover: (drive: Drive) => void;
    onRename?: (drivePath: string, newName: string) => Promise<boolean>;
}

export const DriveItem: React.FC<DriveItemProps> = React.memo(({ drive, active, onClick, onHover, onRename }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');

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

    const startRename = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRenaming(true);
        setRenameValue(drive.driveName);
    }, [drive.driveName]);

    const handleRename = useCallback(async () => {
        if (!renameValue.trim() || renameValue === drive.driveName) {
            setIsRenaming(false);
            return;
        }

        if (onRename) {
            const success = await onRename(drive.drivePath, renameValue.trim());
            if (success) {
                setIsRenaming(false);
            }
        }
    }, [renameValue, drive.driveName, drive.drivePath, onRename]);

    const cancelRename = useCallback(() => {
        setIsRenaming(false);
        setRenameValue('');
    }, []);

    return (
        <div
            className={`sidebar-item drive-item ${active ? 'active' : ''}`}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
        >
            <div className="drive-main">
                <span className="sidebar-icon"><FaHdd /></span>
                <div className="drive-info">
                    {isRenaming ? (
                        <div className="drive-rename-sidebar">
                            <input
                                type="text"
                                className="drive-rename-input-sidebar"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                        handleRename();
                                    } else if (e.key === 'Escape') {
                                        cancelRename();
                                    }
                                }}
                                onBlur={handleRename}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                maxLength={32}
                            />
                            <span className="drive-path-small">({drive.drivePath})</span>
                        </div>
                    ) : (
                        <div className="drive-name-container">
                            <div className="drive-name" title="Double-click to rename">
                                {drive.driveName} ({drive.drivePath})
                            </div>
                            {onRename && (
                                <button 
                                    className="drive-rename-btn"
                                    onClick={startRename}
                                    title="Rename drive"
                                >
                                    <FaPencilAlt />
                                </button>
                            )}
                        </div>
                    )}
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

DriveItem.displayName = 'DriveItem';
