import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaPalette, FaDesktop, FaKeyboard, FaSync, FaFolderOpen, FaShieldAlt, FaInfoCircle, FaDownload } from 'react-icons/fa';
import './SettingsMenu.scss';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose }) => {
    const [activeCategory, setActiveCategory] = useState('general');
    const menuRef = useRef<HTMLDivElement>(null);

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
            id: 'folders',
            name: 'Folders',
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
                    </div>
                </div>
            </div>
        </div>
    );
};
