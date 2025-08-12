import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaPalette, FaDesktop, FaKeyboard, FaSync, FaFolderOpen, FaShieldAlt, FaInfoCircle, FaDownload, FaHome, FaEdit, FaCheck, FaTimes, FaUndo } from 'react-icons/fa';
import './SettingsMenu.scss';
import { BUILD_VERSION, getBuildDateString, getVersionDisplayString } from '../../../version';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
    const [activeCategory, setActiveCategory] = useState('general');
    const [knownFolders, setKnownFolders] = useState<any>({});
    const [settings, setSettings] = useState<any>({});
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Load all settings when settings menu opens
    useEffect(() => {
        if (isOpen) {
            loadAllSettings();
        }
    }, [isOpen]);

    const loadAllSettings = async () => {
        try {
            setIsLoading(true);
            const allSettings = await window.electronAPI?.settings?.getAll();
            if (allSettings) {
                setSettings(allSettings);
                setKnownFolders(allSettings.knownFolders);
            }
        } catch (error: any) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        try {
            setIsLoading(true);
            await window.electronAPI?.settings?.update(key as any, value);
            
            // Update local state
            setSettings((prev: any) => ({
                ...prev,
                [key]: value
            }));
        } catch (error: any) {
            console.error(`Failed to update setting ${key}:`, error);
            alert(`Failed to update setting: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const loadKnownFolders = async () => {
        try {
            setIsLoading(true);
            const folders = await window.electronAPI?.settings?.getKnownFolders();
            if (folders) {
                setKnownFolders(folders);
            }
        } catch (error) {
            console.error('Failed to load known folders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFolderEdit = (folderType: string) => {
        setEditingFolder(folderType);
        setEditValue(knownFolders[folderType] || '');
    };

    const handleFolderSave = async (folderType: string) => {
        if (!editValue.trim()) return;

        try {
            setIsLoading(true);
            
            // Validate folder first
            const validation = await window.electronAPI?.settings?.validateFolder(editValue);
            if (!validation?.valid) {
                alert(`Invalid folder path: ${editValue}\n${validation?.error || 'Path must exist and be a directory.'}`);
                return;
            }

            // Update the folder
            await window.electronAPI?.settings?.updateKnownFolder(folderType, editValue);
            
            // Update local state
            setKnownFolders((prev: any) => ({
                ...prev,
                [folderType]: editValue
            }));
            
            setEditingFolder(null);
            setEditValue('');
        } catch (error: any) {
            console.error('Failed to update folder:', error);
            alert(`Failed to update folder: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFolderCancel = () => {
        setEditingFolder(null);
        setEditValue('');
    };

    const handleResetFolders = async () => {
        if (!confirm('Reset all known folders to default locations? This cannot be undone.')) {
            return;
        }

        try {
            setIsLoading(true);
            await window.electronAPI?.settings?.resetKnownFolders();
            await loadKnownFolders();
        } catch (error: any) {
            console.error('Failed to reset folders:', error);
            alert(`Failed to reset folders: ${error.message}`);
        } finally {
            setIsLoading(false);
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
                    optionLabels: ['Small', 'Medium', 'Large'],
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
                    min: 1,
                    max: 100,
                    key: 'maxPreviewFileSize'
                }
            ]
        },
        {
            id: 'knownFolders',
            name: 'Known Folders',
            icon: <FaHome />,
            settings: [] // Dynamic settings loaded from backend
        },
        {
            id: 'shortcuts',
            name: 'Shortcuts',
            icon: <FaKeyboard />,
            settings: [
                { id: 'ctrlT', name: 'Ctrl+T', type: 'text', value: 'New Tab', readonly: true },
                { id: 'ctrlW', name: 'Ctrl+W', type: 'text', value: 'Close Tab', readonly: true },
                { id: 'ctrlN', name: 'Ctrl+N', type: 'text', value: 'New Window', readonly: true },
                { id: 'f5', name: 'F5', type: 'text', value: 'Refresh', readonly: true },
            ]
        },
        {
            id: 'about',
            name: 'About',
            icon: <FaInfoCircle />,
            settings: [
                { id: 'version', name: 'Version', type: 'text', value: getVersionDisplayString(), readonly: true },
                { id: 'buildVersion', name: 'Build Version', type: 'text', value: BUILD_VERSION, readonly: true },
                { id: 'buildDate', name: 'Build Date', type: 'text', value: getBuildDateString(), readonly: true },
                { id: 'checkUpdates', name: 'Check for updates', type: 'button', value: 'Check Now' },
            ]
        }
    ];

    const currentCategory = settingsCategories.find(cat => cat.id === activeCategory);

    const renderSettingControl = (setting: any) => {
        switch (setting.type) {
            case 'toggle':
                return (
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={setting.value}
                            disabled={setting.readonly || isLoading}
                            onChange={(e) => {
                                if (setting.key && !setting.readonly) {
                                    updateSetting(setting.key, e.target.checked);
                                }
                            }}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                );
            
            case 'dropdown':
                return (
                    <select 
                        value={setting.value}
                        disabled={setting.readonly || isLoading}
                        className="setting-dropdown"
                        onChange={(e) => {
                            if (setting.key && !setting.readonly) {
                                updateSetting(setting.key, e.target.value);
                            }
                        }}
                    >
                        {setting.options?.map((option: string, index: number) => (
                            <option key={option} value={option}>
                                {setting.optionLabels ? setting.optionLabels[index] : option}
                            </option>
                        ))}
                    </select>
                );
            
            case 'number':
                return (
                    <input 
                        type="number" 
                        value={setting.value}
                        disabled={setting.readonly || isLoading}
                        min={setting.min}
                        max={setting.max}
                        className="setting-number"
                        onChange={(e) => {
                            if (setting.key && !setting.readonly) {
                                updateSetting(setting.key, parseInt(e.target.value, 10));
                            }
                        }}
                    />
                );
            
            case 'color':
                return (
                    <input 
                        type="color" 
                        value={setting.value}
                        disabled={setting.readonly || isLoading}
                        className="setting-color"
                        onChange={(e) => {
                            if (setting.key && !setting.readonly) {
                                updateSetting(setting.key, e.target.value);
                            }
                        }}
                    />
                );
            
            case 'button':
                return (
                    <button 
                        className="setting-button"
                        disabled={isLoading}
                        onClick={() => {
                            if (setting.onClick) {
                                setting.onClick();
                            }
                        }}
                    >
                        {setting.value}
                    </button>
                );
            
            default:
                return (
                    <input 
                        type="text" 
                        value={setting.value}
                        readOnly={setting.readonly}
                        disabled={isLoading}
                        className="setting-text"
                        onChange={(e) => {
                            if (setting.key && !setting.readonly) {
                                updateSetting(setting.key, e.target.value);
                            }
                        }}
                    />
                );
        }
    };

    return (
        <div className="settings-menu-overlay">
            <div className="settings-menu" ref={menuRef}>
                <div className="settings-header">
                    <div className="settings-title">
                        <FaCog />
                        Settings
                    </div>
                    <button className="settings-close" onClick={onClose}>×</button>
                </div>
                
                <div className="settings-content">
                    <div className="settings-sidebar">
                        {settingsCategories.map(category => (
                            <div 
                                key={category.id}
                                className={`settings-category ${activeCategory === category.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(category.id)}
                            >
                                <span className="category-icon">{category.icon}</span>
                                {category.name}
                            </div>
                        ))}
                    </div>
                    
                    <div className="settings-panel">
                        <div className="settings-panel-header">
                            <span className="panel-icon">{currentCategory?.icon}</span>
                            {currentCategory?.name}
                        </div>
                        
                        {activeCategory === 'knownFolders' ? (
                            <div className="known-folders-settings">
                                {isLoading && <div className="loading-indicator">Loading...</div>}
                                
                                <div className="settings-description">
                                    <p>Customize the paths for known folders used throughout the application. These paths will be used when navigating to common locations like Documents, Downloads, etc.</p>
                                </div>
                                
                                <div className="folder-list">
                                    {Object.entries(knownFolders).map(([folderType, folderPath]: [string, any]) => (
                                        <div key={folderType} className="folder-item">
                                            <div className="folder-label">
                                                <span className="folder-name">{folderType.charAt(0).toUpperCase() + folderType.slice(1)}</span>
                                            </div>
                                            <div className="folder-path-container">
                                                {editingFolder === folderType ? (
                                                    <div className="folder-edit-container">
                                                        <input 
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="folder-path-input"
                                                            disabled={isLoading}
                                                        />
                                                        <div className="folder-edit-actions">
                                                            <button 
                                                                className="folder-save-btn"
                                                                onClick={() => handleFolderSave(folderType)}
                                                                disabled={isLoading || !editValue.trim()}
                                                            >
                                                                <FaCheck />
                                                            </button>
                                                            <button 
                                                                className="folder-cancel-btn"
                                                                onClick={handleFolderCancel}
                                                                disabled={isLoading}
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="folder-display-container">
                                                        <span className="folder-path">{folderPath}</span>
                                                        <button 
                                                            className="folder-edit-btn"
                                                            onClick={() => handleFolderEdit(folderType)}
                                                            disabled={isLoading}
                                                        >
                                                            <FaEdit />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="folder-actions">
                                    <button 
                                        className="reset-folders-btn"
                                        onClick={handleResetFolders}
                                        disabled={isLoading}
                                    >
                                        <FaUndo /> Reset to Defaults
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="settings-list">
                                {currentCategory?.settings.map(setting => (
                                    <div key={setting.id} className="setting-item">
                                        <div className="setting-label">
                                            {setting.name}
                                        </div>
                                        <div className="setting-control">
                                            {renderSettingControl(setting)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
