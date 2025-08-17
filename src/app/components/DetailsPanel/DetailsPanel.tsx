import React, { useState, useEffect } from 'react';
import { FaFolder, FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaMusic, FaVideo, FaFilePdf, FaClock, FaHdd, FaUser, FaTags, FaMemory, FaDatabase, FaLock, FaSpinner } from 'react-icons/fa';
import { FileSystemItem, FolderMetadata } from '../../../shared/ipc-channels';
import { formatFileSize } from '../../../shared/fileSizeUtils';
import './DetailsPanel.scss';

interface DetailsPanelProps {
    selectedItems: FileSystemItem[];
    isVisible: boolean;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ selectedItems, isVisible }) => {
    const [folderMetadata, setFolderMetadata] = useState<Record<string, FolderMetadata>>({});
    const [loadingMetadata, setLoadingMetadata] = useState<Set<string>>(new Set());

    // Load folder metadata for selected directories
    useEffect(() => {
        const folderPaths = selectedItems
            .filter(item => item.type === 'directory')
            .map(item => item.path);

        const loadMetadata = async () => {
            for (const folderPath of folderPaths) {
                if (!folderMetadata[folderPath] && !loadingMetadata.has(folderPath)) {
                    setLoadingMetadata(prev => new Set([...prev, folderPath]));

                    try {
                        const metadata = await window.electronAPI.fs.getFolderMetadata(folderPath);
                        setFolderMetadata(prev => ({
                            ...prev,
                            [folderPath]: metadata
                        }));
                    } catch (error) {
                        console.error(`Failed to load metadata for ${folderPath}:`, error);
                    } finally {
                        setLoadingMetadata(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(folderPath);
                            return newSet;
                        });
                    }
                }
            }
        };

        if (folderPaths.length > 0) {
            loadMetadata();
        }
    }, [selectedItems, folderMetadata, loadingMetadata]);

    if (!isVisible || selectedItems.length === 0) {
        return null;
    }

    // Handle multiple selection
    if (selectedItems.length > 1) {
        const totalSize = selectedItems.reduce((total, item) => total + item.size, 0);
        const fileCount = selectedItems.filter(item => item.type === 'file').length;
        const folderCount = selectedItems.filter(item => item.type === 'directory').length;

        // Analyze file types for multiple selection
        const fileTypes: Record<string, number> = {};
        selectedItems.forEach(item => {
            if (item.type === 'file') {
                const ext = item.extension || 'No extension';
                fileTypes[ext] = (fileTypes[ext] || 0) + 1;
            }
        });

        return (
            <div className="details-panel slide-in-right">
                <div className="details-header">
                    <h3>Details</h3>
                    <div className="details-subtitle">{selectedItems.length} items selected</div>
                </div>

                <div className="details-content">
                    <div className="multi-selection-summary">
                        <div className="summary-stats">
                            <div className="stat-item">
                                <FaFolder className="stat-icon" />
                                <span>{folderCount} folders</span>
                            </div>
                            <div className="stat-item">
                                <FaFile className="stat-icon" />
                                <span>{fileCount} files</span>
                            </div>
                            <div className="stat-item">
                                <FaHdd className="stat-icon" />
                                <span>{formatFileSize(totalSize)}</span>
                            </div>
                        </div>

                        {/* Show file type breakdown */}
                        {Object.keys(fileTypes).length > 0 && (
                            <div className="file-types-breakdown">
                                <h4>File Types</h4>
                                {Object.entries(fileTypes)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([ext, count]) => (
                                        <div key={ext} className="file-type-item">
                                            <span className="file-type-ext">{ext}</span>
                                            <span className="file-type-count">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Single item selection
    const selectedItem = selectedItems[0];
    const isFolderLoading = selectedItem.type === 'directory' && loadingMetadata.has(selectedItem.path);
    const metadata = selectedItem.type === 'directory' ? folderMetadata[selectedItem.path] : null;

    const getFileTypeInfo = (name: string, type: string) => {
        if (type === 'directory') {
            return { typeName: 'Folder', category: 'File Folder' };
        }

        const extension = name.split('.').pop()?.toLowerCase() || '';
        const typeMap: Record<string, { typeName: string; category: string }> = {
            'docx': { typeName: 'Word Document', category: 'Microsoft Word Document' },
            'doc': { typeName: 'Word Document', category: 'Microsoft Word Document' },
            'pptx': { typeName: 'PowerPoint Presentation', category: 'Microsoft PowerPoint Presentation' },
            'ppt': { typeName: 'PowerPoint Presentation', category: 'Microsoft PowerPoint Presentation' },
            'xlsx': { typeName: 'Excel Workbook', category: 'Microsoft Excel Workbook' },
            'xls': { typeName: 'Excel Workbook', category: 'Microsoft Excel Workbook' },
            'pdf': { typeName: 'PDF Document', category: 'Adobe Acrobat Document' },
            'jpg': { typeName: 'JPEG Image', category: 'JPEG Image File' },
            'jpeg': { typeName: 'JPEG Image', category: 'JPEG Image File' },
            'png': { typeName: 'PNG Image', category: 'PNG Image File' },
            'gif': { typeName: 'GIF Image', category: 'GIF Image File' },
            'mp3': { typeName: 'MP3 Audio', category: 'MP3 Audio File' },
            'wav': { typeName: 'WAV Audio', category: 'WAV Audio File' },
            'mp4': { typeName: 'MP4 Video', category: 'MP4 Video File' },
            'avi': { typeName: 'AVI Video', category: 'AVI Video File' },
            'js': { typeName: 'JavaScript File', category: 'JavaScript Source Code' },
            'ts': { typeName: 'TypeScript File', category: 'TypeScript Source Code' },
            'tsx': { typeName: 'TypeScript React File', category: 'TypeScript React Component' },
            'html': { typeName: 'HTML File', category: 'HTML Document' },
            'css': { typeName: 'CSS File', category: 'Cascading Style Sheet' },
            'txt': { typeName: 'Text File', category: 'Plain Text Document' },
        };

        return typeMap[extension] || { typeName: 'File', category: 'Unknown File Type' };
    };

    const getFileIcon = (item: FileSystemItem) => {
        if (item.type === 'directory') {
            return <FaFolder className="file-icon directory-icon" />;
        }
        const ext = item.extension?.toLowerCase();
        switch (ext) {
            case '.jpg':
            case '.jpeg':
            case '.png':
            case '.gif':
            case '.webp':
            case '.svg':
                return <FaFileImage className="file-icon image-icon" />;
            case '.mp4':
            case '.avi':
            case '.mkv':
            case '.mov':
            case '.wmv':
                return <FaVideo className="file-icon video-icon" />;
            case '.mp3':
            case '.wav':
            case '.flac':
            case '.aac':
                return <FaMusic className="file-icon audio-icon" />;
            case '.js':
            case '.ts':
            case '.jsx':
            case '.tsx':
            case '.html':
            case '.css':
            case '.scss':
            case '.json':
                return <FaFileCode className="file-icon code-icon" />;
            case '.pdf':
                return <FaFilePdf className="file-icon pdf-icon" />;
            case '.doc':
            case '.docx':
                return <FaFileWord className="file-icon word-icon" />;
            case '.xls':
            case '.xlsx':
                return <FaFileExcel className="file-icon excel-icon" />;
            case '.ppt':
            case '.pptx':
                return <FaFilePowerpoint className="file-icon powerpoint-icon" />;
            default:
                return <FaFile className="file-icon default-icon" />;
        }
    };

    const fileTypeInfo = getFileTypeInfo(selectedItem.name, selectedItem.type);

    return (
        <div className="details-panel slide-in-right">
            <div className="details-header">
                <h3>Details</h3>
                <div className="details-subtitle">Properties & Information</div>
            </div>

            <div className="details-content">
                {/* File Preview */}
                <div className="file-preview fade-in-up">
                    <span className="preview-icon">{getFileIcon(selectedItem)}</span>
                    <div className="preview-name">{selectedItem.name}</div>
                    <div className="preview-type">{fileTypeInfo.typeName}</div>
                </div>

                {/* General Information */}
                <div className="details-section">
                    <div className="section-title">
                        <FaFile className="section-icon" />
                        General
                    </div>
                    <div className="details-grid">
                        <div className="detail-row">
                            <FaFile className="detail-icon" />
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">{fileTypeInfo.category}</span>
                        </div>
                        <div className="detail-row">
                            <FaHdd className="detail-icon" />
                            <span className="detail-label">Size:</span>
                            <span className="detail-value">
                                {selectedItem.type === 'directory'
                                    ? metadata
                                        ? `${formatFileSize(metadata.totalSize)} (${metadata.totalFiles} files, ${metadata.totalFolders} folders)`
                                        : isFolderLoading ? 'Calculating...' : 'Unknown'
                                    : formatFileSize(selectedItem.size)
                                }
                                {isFolderLoading && <FaSpinner className="loading-icon" />}
                            </span>
                        </div>
                        <div className="detail-row">
                            <FaClock className="detail-icon" />
                            <span className="detail-label">Modified:</span>
                            <span className="detail-value">{new Date(selectedItem.modified).toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                            <FaClock className="detail-icon" />
                            <span className="detail-label">Created:</span>
                            <span className="detail-value">{new Date(selectedItem.created).toLocaleString()}</span>
                        </div>
                        <div className="detail-row">
                            <FaLock className="detail-icon" />
                            <span className="detail-label">Permissions:</span>
                            <span className="detail-value">
                                {selectedItem.permissions.read ? 'Read ' : ''}
                                {selectedItem.permissions.write ? 'Write ' : ''}
                                {selectedItem.permissions.execute ? 'Execute' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Folder Analysis */}
                {selectedItem.type === 'directory' && metadata && (
                    <div className="details-section">
                        <div className="section-title">
                            <FaFolder className="section-icon" />
                            Contents Analysis
                        </div>
                        <div className="folder-analysis">
                            <div className="analysis-stats">
                                <div className="stat-item">
                                    <FaFile className="stat-icon" />
                                    <span className="stat-label">Files:</span>
                                    <span className="stat-value">{metadata.totalFiles}</span>
                                </div>
                                <div className="stat-item">
                                    <FaFolder className="stat-icon" />
                                    <span className="stat-label">Folders:</span>
                                    <span className="stat-value">{metadata.totalFolders}</span>
                                </div>
                                <div className="stat-item">
                                    <FaDatabase className="stat-icon" />
                                    <span className="stat-label">Total Size:</span>
                                    <span className="stat-value">{formatFileSize(metadata.totalSize)}</span>
                                </div>
                            </div>

                            {/* File Type Breakdown */}
                            {Object.keys(metadata.fileTypes).length > 0 && (
                                <div className="file-types-section">
                                    <h4>File Types</h4>
                                    <div className="file-types-list">
                                        {Object.entries(metadata.fileTypes)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 10)
                                            .map(([ext, count]) => (
                                                <div key={ext} className="file-type-item">
                                                    <span className="file-type-ext">{ext}</span>
                                                    <span className="file-type-count">{count}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Additional Properties */}
                <div className="details-section">
                    <div className="section-title">
                        <FaTags className="section-icon" />
                        Properties
                    </div>
                    <div className="details-grid">
                        <div className="detail-row">
                            <FaUser className="detail-icon" />
                            <span className="detail-label">Hidden:</span>
                            <span className="detail-value">{selectedItem.isHidden ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="detail-row">
                            <FaDatabase className="detail-icon" />
                            <span className="detail-label">System:</span>
                            <span className="detail-value">{selectedItem.isSystem ? 'Yes' : 'No'}</span>
                        </div>
                        {selectedItem.extension && (
                            <div className="detail-row">
                                <FaFile className="detail-icon" />
                                <span className="detail-label">Extension:</span>
                                <span className="detail-value">{selectedItem.extension}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
