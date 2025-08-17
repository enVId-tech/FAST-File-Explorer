import React, { useCallback, useMemo } from 'react';
import { FaHdd } from 'react-icons/fa';
import { Drive } from 'shared/file-data';

interface DriveItemProps {
    drive: Drive;
    active: boolean;
    onClick: () => void;
    onHover: (drive: Drive) => void;
}

export const DriveItem: React.FC<DriveItemProps> = React.memo(({ drive, active, onClick, onHover }) => {
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

DriveItem.displayName = 'DriveItem';
