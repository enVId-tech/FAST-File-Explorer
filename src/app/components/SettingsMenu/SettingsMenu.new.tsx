import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaPalette, FaDesktop, FaKeyboard, FaSync, FaFolderOpen, FaShieldAlt, FaInfoCircle, FaDownload, FaHome, FaEdit, FaCheck, FaTimes, FaUndo } from 'react-icons/fa';
import './SettingsMenu.scss';
import { BUILD_VERSION, getBuildDateString, getVersionDisplayString } from '../../../version';
import { useSettings } from '../../contexts/SettingsContext';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
    const { settings, updateSetting, isLoading } = useSettings();
    const [activeCategory, setActiveCategory] = useState('general');
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const menuRef = useRef<HTMLDivElement>(null);

    // Handle setting updates with immediate UI feedback
    const handleSettingUpdate = async (key: string, value: any) => {
        try {
            await updateSetting(key as any, value);
            console.log(`Setting ${key} updated to:`, value);
        } catch (error: any) {
            console.error(`Failed to update setting ${key}:`, error);
            alert(`Failed to update setting: ${error.message}`);
        }
    };

    const handleFolderEdit = (folderType: string) => {
        setEditingFolder(folderType);
        setEditValue(settings.knownFolders[folderType] || '');
    };

    const handleFolderSave = async (folderType: string) => {
        if (!editValue.trim()) return;

        try {
            // Validate folder first
            const validation = await window.electronAPI?.settings?.validateFolder(editValue);
            if (!validation?.valid) {
                alert(`Invalid folder path: ${editValue}\n${validation?.error || 'Path must exist and be a directory.'}`);
                return;
            }

            // Update the folder
            await window.electronAPI?.settings?.updateKnownFolder(folderType, editValue);

            setEditingFolder(null);
            setEditValue('');
        } catch (error: any) {
            console.error('Failed to update folder:', error);
            alert(`Failed to update folder: ${error.message}`);
        }
    };

    const handleFolderCancel = () => {
        setEditingFolder(null);
        setEditValue('');
    };

    const resetKnownFolders = async () => {
        if (window.confirm('Are you sure you want to reset all known folders to their default locations?')) {
            try {
                await window.electronAPI?.settings?.resetKnownFolders();
                console.log('Known folders reset to defaults');
            } catch (error: any) {
                console.error('Failed to reset known folders:', error);
                alert(`Failed to reset folders: ${error.message}`);
            }
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const settingsCategories = [
        {
            id: 'general',
            name: 'General',
            icon: <FaCog />,
            settings: [
                {
                    id: 'defaultSortBy',
                    name: 'Default sort by',
                    type: 'dropdown',
                    value: settings.defaultSortBy || 'name',
                    options: ['name', 'size', 'modified', 'type'],
                    key: 'defaultSortBy'
                },
                {
                    id: 'defaultSortOrder',
                    name: 'Default sort order',
                    type: 'dropdown',
                    value: settings.defaultSortOrder || 'asc',
                    options: ['asc', 'desc'],
                    optionLabels: ['Ascending', 'Descending'],
                    key: 'defaultSortOrder'
                },
                {
                    id: 'doubleClickToOpen',
                    name: 'Double-click to open',
                    type: 'toggle',
                    value: settings.doubleClickToOpen ?? true,
                    key: 'doubleClickToOpen'
                },
                {
                    id: 'enableQuickSearch',
                    name: 'Enable quick search',
                    type: 'toggle',
                    value: settings.enableQuickSearch ?? true,
                    key: 'enableQuickSearch'
                }
            ]
        },
        {
            id: 'display',
            name: 'Display',
            icon: <FaDesktop />,
            settings: [
                {
                    id: 'fileSizeUnit',
                    name: 'File size units',
                    type: 'dropdown',
                    value: settings.fileSizeUnit || 'decimal',
                    options: ['decimal', 'binary'],
                    optionLabels: ['Decimal (GB, MB, TB)', 'Binary (GiB, MiB, TiB)'],
                    key: 'fileSizeUnit'
                },
                {
                    id: 'showHiddenFiles',
                    name: 'Show hidden files',
                    type: 'toggle',
                    value: settings.showHiddenFiles ?? false,
                    key: 'showHiddenFiles'
                },
                {
                    id: 'showFileExtensions',
                    name: 'Show file extensions',
                    type: 'toggle',
                    value: settings.showFileExtensions ?? true,
                    key: 'showFileExtensions'
                },
                {
                    id: 'showThumbnails',
                    name: 'Show thumbnails',
                    type: 'toggle',
                    value: settings.showThumbnails ?? true,
                    key: 'showThumbnails'
                },
                {
                    id: 'thumbnailSize',
                    name: 'Thumbnail size',
                    type: 'dropdown',
                    value: settings.thumbnailSize || 'medium',
                    options: ['small', 'medium', 'large'],
                    key: 'thumbnailSize'
                },
                {
                    id: 'compactMode',
                    name: 'Compact mode',
                    type: 'toggle',
                    value: settings.compactMode ?? false,
                    key: 'compactMode'
                }
            ]
        },
        {
            id: 'performance',
            name: 'Performance',
            icon: <FaSync />,
            settings: [
                {
                    id: 'enableAnimations',
                    name: 'Enable animations',
                    type: 'toggle',
                    value: settings.enableAnimations ?? true,
                    key: 'enableAnimations'
                },
                {
                    id: 'enableFilePreview',
                    name: 'Enable file preview',
                    type: 'toggle',
                    value: settings.enableFilePreview ?? true,
                    key: 'enableFilePreview'
                },
                {
                    id: 'maxPreviewFileSize',
                    name: 'Max preview file size (MB)',
                    type: 'number',
                    value: settings.maxPreviewFileSize || 10,
                    key: 'maxPreviewFileSize'
                }
            ]
        }
    ];

    const renderSetting = (setting: any) => {
        switch (setting.type) {
            case 'toggle':
                return (
                    <div className="setting-toggle">
                        <input
                            type="checkbox"
                            checked={setting.value}
                            onChange={(e) => handleSettingUpdate(setting.key, e.target.checked)}
                            disabled={isLoading}
                        />
                        <span className="toggle-slider"></span>
                    </div>
                );

            case 'dropdown':
                return (
                    <select
                        value={setting.value}
                        onChange={(e) => handleSettingUpdate(setting.key, e.target.value)}
                        disabled={isLoading}
                        className="setting-select"
                    >
                        {setting.options.map((option: string, index: number) => (
                            <option key={option} value={option}>
                                {setting.optionLabels ? setting.optionLabels[index] : option.charAt(0).toUpperCase() + option.slice(1)}
                            </option>
                        ))}
                    </select>
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={setting.value}
                        onChange={(e) => handleSettingUpdate(setting.key, Number(e.target.value))}
                        disabled={isLoading}
                        className="setting-input"
                        min="0"
                        max="100"
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="settings-overlay">
            <div ref={menuRef} className="settings-menu">
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button onClick={onClose} className="close-button">
                        <FaTimes />
                    </button>
                </div>

                <div className="settings-content">
                    <div className="settings-sidebar">
                        {settingsCategories.map((category) => (
                            <button
                                key={category.id}
                                className={`settings-category ${activeCategory === category.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(category.id)}
                            >
                                {category.icon}
                                <span>{category.name}</span>
                            </button>
                        ))}
                        <button
                            className={`settings-category ${activeCategory === 'folders' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('folders')}
                        >
                            <FaFolderOpen />
                            <span>Known Folders</span>
                        </button>
                        <button
                            className={`settings-category ${activeCategory === 'about' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('about')}
                        >
                            <FaInfoCircle />
                            <span>About</span>
                        </button>
                    </div>

                    <div className="settings-main">
                        {activeCategory !== 'folders' && activeCategory !== 'about' && (
                            <div className="settings-section">
                                <h3>{settingsCategories.find(cat => cat.id === activeCategory)?.name}</h3>
                                <div className="settings-list">
                                    {settingsCategories
                                        .find(cat => cat.id === activeCategory)
                                        ?.settings.map((setting) => (
                                            <div key={setting.id} className="setting-item">
                                                <div className="setting-info">
                                                    <label>{setting.name}</label>
                                                </div>
                                                <div className="setting-control">
                                                    {renderSetting(setting)}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {activeCategory === 'folders' && (
                            <div className="settings-section">
                                <h3>Known Folders</h3>
                                <div className="settings-list">
                                    {Object.entries(settings.knownFolders).map(([folderType, folderPath]: [string, any]) => (
                                        <div key={folderType} className="setting-item folder-item">
                                            <div className="setting-info">
                                                <label>{folderType.charAt(0).toUpperCase() + folderType.slice(1)}</label>
                                                {editingFolder !== folderType && (
                                                    <span className="folder-path">{folderPath}</span>
                                                )}
                                            </div>
                                            <div className="setting-control">
                                                {editingFolder === folderType ? (
                                                    <div className="folder-edit">
                                                        <input
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="folder-input"
                                                            placeholder="Enter folder path..."
                                                        />
                                                        <button
                                                            onClick={() => handleFolderSave(folderType)}
                                                            className="save-button"
                                                            title="Save"
                                                        >
                                                            <FaCheck />
                                                        </button>
                                                        <button
                                                            onClick={handleFolderCancel}
                                                            className="cancel-button"
                                                            title="Cancel"
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleFolderEdit(folderType)}
                                                        className="edit-button"
                                                        title="Edit"
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="folder-actions">
                                    <button onClick={resetKnownFolders} className="reset-button">
                                        <FaUndo />
                                        Reset to Defaults
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'about' && (
                            <div className="settings-section">
                                <h3>About FAST File Explorer</h3>
                                <div className="about-content">
                                    <div className="version-info">
                                        <h4>Version Information</h4>
                                        <p><strong>Version:</strong> {getVersionDisplayString()}</p>
                                        <p><strong>Build:</strong> {BUILD_VERSION}</p>
                                        <p><strong>Built on:</strong> {getBuildDateString()}</p>
                                    </div>
                                    <div className="app-info">
                                        <h4>Application</h4>
                                        <p>FAST File Explorer is a modern, high-performance file manager built with Electron and React.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {isLoading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">Loading...</div>
                    </div>
                )}
            </div>
        </div>
    );
};
