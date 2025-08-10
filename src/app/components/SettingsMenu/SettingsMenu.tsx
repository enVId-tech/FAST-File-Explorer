import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaPalette, FaDesktop, FaKeyboard, FaSync, FaFolderOpen, FaShieldAlt, FaInfoCircle, FaDownload, FaHome, FaEdit, FaCheck, FaTimes, FaUndo } from 'react-icons/fa';
import './SettingsMenu.scss';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
    const [activeCategory, setActiveCategory] = useState('general');
    const [knownFolders, setKnownFolders] = useState<any>({});
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Load known folders when settings menu opens
    useEffect(() => {
        if (isOpen && activeCategory === 'knownFolders') {
            loadKnownFolders();
        }
    }, [isOpen, activeCategory]);

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
                { id: 'startup', name: 'Open on startup', type: 'toggle', value: false },
                { id: 'notifications', name: 'Show notifications', type: 'toggle', value: true },
                { id: 'updates', name: 'Check for updates automatically', type: 'toggle', value: true },
                { id: 'language', name: 'Language', type: 'dropdown', value: 'English', options: ['English', 'Spanish', 'French', 'German'] },
            ]
        },
        {
            id: 'appearance',
            name: 'Appearance',
            icon: <FaPalette />,
            settings: [
                { id: 'theme', name: 'Theme', type: 'dropdown', value: 'Windows 11 Light', options: ['Windows 11 Light', 'Windows 11 Dark', 'Windows 10 Light', 'Windows 10 Dark', 'Cyberpunk', 'Retro', 'Futuristic', 'Nature'] },
                { id: 'accentColor', name: 'Accent color', type: 'color', value: '#2563eb' },
                { id: 'fontSize', name: 'Font size', type: 'dropdown', value: 'Medium', options: ['Small', 'Medium', 'Large'] },
                { id: 'iconSize', name: 'Icon size', type: 'dropdown', value: 'Medium', options: ['Small', 'Medium', 'Large'] },
            ]
        },
        {
            id: 'display',
            name: 'Display',
            icon: <FaDesktop />,
            settings: [
                { id: 'viewMode', name: 'Default view mode', type: 'dropdown', value: 'List', options: ['List', 'Grid', 'Tiles'] },
                { id: 'showHidden', name: 'Show hidden files', type: 'toggle', value: false },
                { id: 'showExtensions', name: 'Show file extensions', type: 'toggle', value: true },
                { id: 'detailsPanel', name: 'Show details panel', type: 'toggle', value: true },
            ]
        },
        {
            id: 'knownFolders',
            name: 'Known Folders',
            icon: <FaHome />,
            settings: [] // Dynamic settings loaded from backend
        },
        {
            id: 'folders',
            name: 'Folder Options',
            icon: <FaFolderOpen />,
            settings: [
                { id: 'defaultLocation', name: 'Default location', type: 'dropdown', value: 'This PC', options: ['This PC', 'Documents', 'Desktop', 'Downloads'] },
                { id: 'newTabLocation', name: 'New tab opens to', type: 'dropdown', value: 'This PC', options: ['This PC', 'Last location', 'Documents', 'Desktop'] },
                { id: 'folderOptions', name: 'Folder options in new window', type: 'toggle', value: false },
            ]
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
            id: 'privacy',
            name: 'Privacy',
            icon: <FaShieldAlt />,
            settings: [
                { id: 'recentFiles', name: 'Show recent files', type: 'toggle', value: true },
                { id: 'fileHistory', name: 'Save file access history', type: 'toggle', value: true },
                { id: 'analytics', name: 'Send usage analytics', type: 'toggle', value: false },
            ]
        },
        {
            id: 'about',
            name: 'About',
            icon: <FaInfoCircle />,
            settings: [
                { id: 'version', name: 'Version', type: 'text', value: '1.0.0', readonly: true },
                { id: 'build', name: 'Build', type: 'text', value: '2024.08.09', readonly: true },
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
                            defaultChecked={setting.value}
                            disabled={setting.readonly}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                );
            
            case 'dropdown':
                return (
                    <select 
                        defaultValue={setting.value}
                        disabled={setting.readonly}
                        className="setting-dropdown"
                    >
                        {setting.options?.map((option: string) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );
            
            case 'color':
                return (
                    <input 
                        type="color" 
                        defaultValue={setting.value}
                        disabled={setting.readonly}
                        className="setting-color"
                    />
                );
            
            case 'button':
                return (
                    <button className="setting-button">
                        {setting.value}
                    </button>
                );
            
            default:
                return (
                    <input 
                        type="text" 
                        defaultValue={setting.value}
                        readOnly={setting.readonly}
                        className="setting-text"
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
