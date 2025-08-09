import React from 'react';
import { FaFolder, FaFileExcel, FaFilePowerpoint, FaFileWord, FaFileImage, FaFileCode, FaFile, FaMusic, FaVideo, FaFilePdf, FaClock, FaHdd, FaUser, FaTags } from 'react-icons/fa';
import './DetailsPanel.scss';

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

interface DetailsPanelProps {
    selectedItem: FileItem | null;
    isVisible: boolean;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({ selectedItem, isVisible }) => {
    if (!isVisible || !selectedItem) {
        return null;
    }

    const getFileTypeInfo = (name: string, type: string) => {
        if (type === 'folder') {
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

    const fileTypeInfo = getFileTypeInfo(selectedItem.name, selectedItem.type);

    // Generate placeholder data for demonstration
    const placeholderData = {
        dateCreated: selectedItem.dateCreated || '1/20/2024 2:15 PM',
        owner: selectedItem.owner || 'Current User',
        permissions: selectedItem.permissions || 'Full Control',
        description: selectedItem.description || 'A sample file for demonstration purposes.',
        tags: selectedItem.tags || ['Important', 'Work', 'Project'],
        dimensions: selectedItem.type === 'file' && selectedItem.name.match(/\.(jpg|jpeg|png|gif)$/i) ? '1920 × 1080' : undefined,
        duration: selectedItem.type === 'file' && selectedItem.name.match(/\.(mp3|wav|mp4|avi)$/i) ? '3:42' : undefined,
        pages: selectedItem.type === 'file' && selectedItem.name.match(/\.(pdf|docx?)$/i) ? '12' : undefined,
    };

    return (
        <div className="details-panel slide-in-right">
            <div className="details-header">
                <h3>Details</h3>
                <div className="details-subtitle">Properties & Information</div>
            </div>
            
            <div className="details-content">
                {/* File Preview */}
                <div className="file-preview fade-in-up">
                    <span className="preview-icon">{selectedItem.icon}</span>
                    <div className="preview-name">{selectedItem.name}</div>
                    <div className="preview-type">{fileTypeInfo.typeName}</div>
                </div>

                {/* General Information */}
                <div className="details-section">
                    <div className="section-title">
                        <FaFile />
                        General
                    </div>
                    <div className="details-item">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{fileTypeInfo.category}</span>
                    </div>
                    {selectedItem.size && (
                        <div className="details-item">
                            <span className="detail-label">Size:</span>
                            <span className="detail-value">{selectedItem.size}</span>
                        </div>
                    )}
                    {placeholderData.dimensions && (
                        <div className="details-item">
                            <span className="detail-label">Dimensions:</span>
                            <span className="detail-value">{placeholderData.dimensions}</span>
                        </div>
                    )}
                    {placeholderData.duration && (
                        <div className="details-item">
                            <span className="detail-label">Duration:</span>
                            <span className="detail-value">{placeholderData.duration}</span>
                        </div>
                    )}
                    {placeholderData.pages && (
                        <div className="details-item">
                            <span className="detail-label">Pages:</span>
                            <span className="detail-value">{placeholderData.pages}</span>
                        </div>
                    )}
                </div>

                {/* Dates & Times */}
                <div className="details-section">
                    <div className="section-title">
                        <FaClock />
                        Dates & Times
                    </div>
                    <div className="details-item">
                        <span className="detail-label">Modified:</span>
                        <span className="detail-value">{selectedItem.dateModified}</span>
                    </div>
                    <div className="details-item">
                        <span className="detail-label">Created:</span>
                        <span className="detail-value">{placeholderData.dateCreated}</span>
                    </div>
                </div>

                {/* Security */}
                <div className="details-section">
                    <div className="section-title">
                        <FaUser />
                        Security
                    </div>
                    <div className="details-item">
                        <span className="detail-label">Owner:</span>
                        <span className="detail-value">{placeholderData.owner}</span>
                    </div>
                    <div className="details-item">
                        <span className="detail-label">Permissions:</span>
                        <span className="detail-value">{placeholderData.permissions}</span>
                    </div>
                </div>

                {/* Description */}
                <div className="details-section">
                    <div className="section-title">
                        <FaTags />
                        Description & Tags
                    </div>
                    <div className="details-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="detail-label">Description:</span>
                        <span className="detail-value" style={{ marginTop: '4px', fontSize: '12px', lineHeight: '1.4' }}>
                            {placeholderData.description}
                        </span>
                    </div>
                    <div className="details-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="detail-label">Tags:</span>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {placeholderData.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    style={{
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        backgroundColor: 'var(--selection-bg)',
                                        color: 'var(--accent-color)',
                                        borderRadius: '12px',
                                        border: '1px solid var(--selection-border)'
                                    }}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
