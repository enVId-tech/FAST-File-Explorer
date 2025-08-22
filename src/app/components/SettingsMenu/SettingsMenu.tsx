import React, { useState, useRef, useEffect } from 'react';
import { FaCog, FaDesktop, FaSync, FaFolderOpen, FaInfoCircle, FaEdit, FaCheck, FaTimes, FaUndo, FaRocket, FaWrench } from 'react-icons/fa';
import './SettingsMenu.scss';
import { BUILD_VERSION, getBuildDateString, getVersionDisplayString } from '../../../version';
import { useSettings, AppSettings } from '../../contexts/SettingsContext';
import { useNavigation } from '../../contexts/NavigationContext';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onShowSetup?: () => void;
    onShowFileTransferUI?: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, onShowSetup, onShowFileTransferUI }) => {
    const { settings, updateSetting, updateKnownFolder, loadSettings, isLoading } = useSettings();
    const navigation = useNavigation();
    const [activeCategory, setActiveCategory] = useState<'general' | 'appearance' | 'performance' | 'history' | 'security' | 'folders' | 'setup' | 'developer' | 'about'>('general');
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [devFileTransferEnabled, setDevFileTransferEnabled] = useState(false);
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

            // Update the folder using SettingsContext
            await updateKnownFolder(folderType, editValue);

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

    const handleSetupWizard = () => {
        onClose(); // Close settings menu first
        setTimeout(() => {
            onShowSetup?.(); // Then show setup wizard
        }, 100); // Small delay to ensure smooth transition
    };

    const handleShowFileTransferUI = () => {
        onClose(); // Close settings menu first
        setTimeout(() => {
            onShowFileTransferUI?.(); // Then show file transfer UI
        }, 100); // Small delay to ensure smooth transition
    };

    const handleToggleChange = async (settingKey: string) => {
        try {
            const currentValue = (settings as any)[settingKey];
            await updateSetting(settingKey as keyof AppSettings, !currentValue);
            console.log(`Toggle ${settingKey} changed to:`, !currentValue);
        } catch (error: any) {
            console.error(`Failed to update toggle ${settingKey}:`, error);
            alert(`Failed to update setting: ${error.message}`);
        }
    };

    const resetKnownFolders = async () => {
        if (window.confirm('Are you sure you want to reset all known folders to their default locations?')) {
            try {
                await window.electronAPI?.settings?.resetKnownFolders();
                // Reload settings to reflect the reset
                await loadSettings();
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
            id: 'history',
            name: 'History',
            icon: <FaSync />,
            settings: [
                {
                    id: 'maxNavigationHistory',
                    name: 'Max navigation history',
                    type: 'number',
                    value: settings.maxNavigationHistory || 50,
                    key: 'maxNavigationHistory'
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
                    <div className="toggle-switch">
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
                        className="modern-dropdown"
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
                        className="setting-number"
                        min="0"
                        max="100"
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="settings-menu-overlay">
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
                                onClick={() => setActiveCategory(category.id as typeof activeCategory)}
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
                            className={`settings-category ${activeCategory === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('history')}
                        >
                            <FaSync />
                            <span>History</span>
                        </button>
                        <button
                            className={`settings-category ${activeCategory === 'setup' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('setup')}
                        >
                            <FaRocket />
                            <span>Setup</span>
                        </button>
                        <button
                            className={`settings-category ${activeCategory === 'developer' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('developer')}
                        >
                            <FaWrench />
                            <span>Developer</span>
                        </button>
                        <button
                            className={`settings-category ${activeCategory === 'about' ? 'active' : ''}`}
                            onClick={() => setActiveCategory('about')}
                        >
                            <FaInfoCircle />
                            <span>About</span>
                        </button>
                    </div>

                    <div className="settings-panel">
                        {activeCategory !== 'folders' && activeCategory !== 'about' && activeCategory !== 'setup' && activeCategory !== 'developer' && (
                            <>
                                <div className="settings-panel-header">
                                    <div className="panel-icon">{settingsCategories.find(cat => cat.id === activeCategory)?.icon}</div>
                                    <h2>{settingsCategories.find(cat => cat.id === activeCategory)?.name}</h2>
                                </div>
                                <div className="settings-list">
                                    {settingsCategories
                                        .find(cat => cat.id === activeCategory)
                                        ?.settings.map((setting) => (
                                            <div key={setting.id} className="setting-item">
                                                <label className="setting-label">{setting.name}</label>
                                                <div className="setting-control">
                                                    {renderSetting(setting)}
                                                </div>
                                            </div>
                                        ))}
                                    {activeCategory === 'history' && (
                                        <div className="setting-item">
                                            <label className="setting-label">Clear navigation history</label>
                                            <div className="setting-control">
                                                <button
                                                    className="modern-button danger"
                                                    onClick={() => navigation.clearHistory()}
                                                    disabled={isLoading}
                                                >
                                                    <FaUndo />
                                                    Clear History
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {activeCategory === 'folders' && (
                            <div className="known-folders-settings">
                                <div className="settings-panel-header">
                                    <div className="panel-icon"><FaFolderOpen /></div>
                                    <h2>Known Folders</h2>
                                </div>
                                <div className="settings-description">
                                    <p>Configure the default locations for common folder types.</p>
                                </div>
                                <div className="folder-list">
                                    {Object.entries(settings.knownFolders).map(([folderType, folderPath]: [string, any]) => (
                                        <div key={folderType} className="folder-item">
                                            <div className="folder-label">
                                                <div className="folder-name">{folderType.charAt(0).toUpperCase() + folderType.slice(1)}</div>
                                            </div>
                                            <div className="folder-path-container">
                                                {editingFolder !== folderType ? (
                                                    <div className="folder-display-container">
                                                        <div className="folder-path">{folderPath}</div>
                                                        <button
                                                            onClick={() => handleFolderEdit(folderType)}
                                                            className="modern-button secondary"
                                                            title="Edit folder path"
                                                        >
                                                            <FaEdit />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="folder-edit-container">
                                                        <input
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="folder-path-input"
                                                            placeholder="Enter folder path..."
                                                        />
                                                        <div className="folder-edit-actions">
                                                            <button
                                                                onClick={() => handleFolderSave(folderType)}
                                                                className="modern-button primary"
                                                                title="Save"
                                                            >
                                                                <FaCheck />
                                                            </button>
                                                            <button
                                                                onClick={handleFolderCancel}
                                                                className="modern-button secondary"
                                                                title="Cancel"
                                                            >
                                                                <FaTimes />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="folder-actions">
                                    <button onClick={resetKnownFolders} className="modern-button danger">
                                        <FaUndo />
                                        Reset to Defaults
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'setup' && (
                            <div className="setup-settings">
                                <div className="settings-panel-header">
                                    <div className="panel-icon"><FaRocket /></div>
                                    <h2>Setup & Configuration</h2>
                                </div>
                                <div className="settings-description">
                                    <p>Configure FAST File Explorer with initial setup options and advanced features.</p>
                                </div>
                                <div className="setup-actions">
                                    <button className="modern-button primary setup-action-button" onClick={handleSetupWizard}>
                                        <FaRocket />
                                        <div>
                                            <h4>Run Setup Wizard</h4>
                                            <p>Configure explorer mode, performance options, and features</p>
                                        </div>
                                    </button>
                                </div>
                                <div className="setup-info">
                                    <h4>Current Configuration</h4>
                                    <div className="config-item">
                                        <strong>Theme:</strong><span>{settings?.theme || 'Default'}</span>
                                    </div>
                                    <div className="config-item">
                                        <strong>View Mode:</strong><span>{settings?.viewMode || 'List'}</span>
                                    </div>
                                    <div className="config-item">
                                        <strong>File Size Format:</strong><span>{settings?.fileSizeUnit === 'binary' ? 'Binary (1024)' : 'Decimal (1000)'}</span>
                                    </div>
                                    <div className="config-item">
                                        <strong>Hidden Files:</strong><span>{settings?.showHiddenFiles ? 'Visible' : 'Hidden'}</span>
                                    </div>
                                    <div className="config-item">
                                        <strong>Animations:</strong><span>{settings?.enableAnimations ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                    <div className="config-item">
                                        <strong>File Extensions:</strong><span>{settings?.showFileExtensions ? 'Shown' : 'Hidden'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'developer' && (
                            <div className="developer-settings">
                                <div className="settings-panel-header">
                                    <div className="panel-icon"><FaWrench /></div>
                                    <h2>Developer Options</h2>
                                </div>
                                <div className="settings-description">
                                    <p>Experimental features and developer tools. Use with caution.</p>
                                </div>
                                <div className="developer-options">
                                    <div className="developer-option">
                                        <div className="option-header">
                                            <div>
                                                <h4>File Transfer UI Demo</h4>
                                                <p>Show the experimental file transfer monitoring interface</p>
                                            </div>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={devFileTransferEnabled}
                                                    onChange={(e) => setDevFileTransferEnabled(e.target.checked)}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                        {devFileTransferEnabled && (
                                            <div className="option-actions">
                                                <button
                                                    className="modern-button primary dev-action-button"
                                                    onClick={handleShowFileTransferUI}
                                                >
                                                    Show File Transfer UI
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="developer-option">
                                        <div className="option-header">
                                            <div>
                                                <h4>Custom Context Menu</h4>
                                                <p>Enable the new right-click context menu (demo)</p>
                                            </div>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={false}
                                                    disabled
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                        <p className="dev-note">Coming soon - integrated with file list</p>
                                    </div>

                                    <div className="developer-option">
                                        <div className="option-header">
                                            <div>
                                                <h4>Debug Mode</h4>
                                                <p>Enable additional logging and debug information</p>
                                            </div>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={false}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeCategory === 'about' && (
                            <div className="about-settings">
                                <div className="settings-panel-header">
                                    <div className="panel-icon"><FaInfoCircle /></div>
                                    <h2>About FAST File Explorer</h2>
                                </div>
                                <div className="settings-description">
                                    <p>A next-generation file manager designed for speed, efficiency, and modern workflows.</p>
                                </div>
                                <div className="about-content">
                                    <div className="version-info">
                                        <h4>Version Information</h4>
                                        <p><strong>Version:</strong><span>{getVersionDisplayString()}</span></p>
                                        <p><strong>Build:</strong><span>{BUILD_VERSION}</span></p>
                                        <p><strong>Built:</strong><span>{getBuildDateString()}</span></p>
                                        <p><strong>Platform:</strong><span>Windows (Electron)</span></p>
                                        <p><strong>Architecture:</strong><span>x64</span></p>
                                        <p><strong>Developer:</strong><span>enVId Tech</span></p>
                                    </div>
                                    <div className="app-info">
                                        <h4>Technology Stack</h4>
                                        <p><strong>Frontend:</strong><span>React 19 + TypeScript</span></p>
                                        <p><strong>Desktop:</strong><span>Electron 37</span></p>
                                        <p><strong>Build Tool:</strong><span>Vite + ESBuild</span></p>
                                        <p><strong>Styling:</strong><span>SCSS with CSS Variables</span></p>
                                    </div>
                                    <div className="app-features">
                                        <h4>Key Features</h4>
                                        <div className="feature-list">
                                            <div className="feature-item">High-performance virtualized lists</div>
                                            <div className="feature-item">Modern tabbed interface</div>
                                            <div className="feature-item">Customizable themes & styling</div>
                                            <div className="feature-item">Advanced file operations</div>
                                            <div className="feature-item">WSL integration support</div>
                                            <div className="feature-item">Developer-friendly tools</div>
                                            <div className="feature-item">Keyboard shortcuts</div>
                                            <div className="feature-item">File transfer monitoring</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {isLoading && (
                    <div className="loading-indicator">
                        <div className="loading-spinner">Loading...</div>
                    </div>
                )}
            </div>
        </div>
    );
};
