import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaCog, FaDesktop, FaSync, FaFolderOpen, FaInfoCircle, FaEdit, FaCheck, FaTimes, FaUndo, FaRocket, FaWrench, FaTerminal, FaTrash, FaDatabase } from 'react-icons/fa';
import './SettingsMenu.scss';
import { getProjectVersion, getVersionInfo } from 'npm-version-lib';
import { useSettings, AppSettings } from '../../contexts/SettingsContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { DeveloperConsole } from '../DeveloperConsole/DeveloperConsole';
import { cacheManager } from '../../utils/CacheManager';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onShowSetup?: () => void;
    onShowFileTransferUI?: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, onShowSetup, onShowFileTransferUI }) => {
    const { settings, updateSetting, updateKnownFolder, loadSettings, isLoading } = useSettings();
    const navigation = useNavigation();
    const [activeCategory, setActiveCategory] = useState<'general' | 'performance' | 'folders' | 'setup' | 'developer' | 'about'>('general');
    const [editingFolder, setEditingFolder] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [showDeveloperConsole, setShowDeveloperConsole] = useState(false);
    const [devFileTransferEnabled, setDevFileTransferEnabled] = useState(false);
    const [cacheStats, setCacheStats] = useState<any>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const consoleRef = useRef<HTMLDivElement | null>(null);

    // Get version info safely
    const versionInfo = useMemo(() => {
        try {
            return getVersionInfo();
        } catch (error) {
            console.warn('Failed to get version info:', error);
            return null;
        }
    }, []);

    // Load cache statistics
    useEffect(() => {
        if (activeCategory === 'performance') {
            const stats = cacheManager.getStats();
            setCacheStats(stats);
        }
    }, [activeCategory]);

    // Handle cache clear
    const handleClearCache = () => {
        if (window.confirm('Are you sure you want to clear all cached data? This will temporarily slow down navigation until the cache is rebuilt.')) {
            try {
                cacheManager.clearAll();
                setCacheStats(cacheManager.getStats());
                console.log('Cache cleared successfully');
                alert('Cache cleared successfully!');
            } catch (error: any) {
                console.error('Failed to clear cache:', error);
                alert(`Failed to clear cache: ${error.message}`);
            }
        }
    };

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

    // Close menu when clicking outside and reset developer console state
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Don't close if clicking inside the menu or inside the developer console
            const isInsideMenu = menuRef.current && menuRef.current.contains(target);
            const isInsideConsole = consoleRef.current && consoleRef.current.contains(target);
            
            if (!isInsideMenu && !isInsideConsole) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            // Reset developer console when settings menu closes
            setShowDeveloperConsole(false);
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
            subsections: [
                {
                    id: 'general-settings',
                    name: 'General Settings',
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
                    id: 'history-settings',
                    name: 'Navigation History',
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
                    id: 'display-settings',
                    name: 'Display Settings',
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
                }
            ]
        },
        {
            id: 'performance',
            name: 'Performance',
            icon: <FaSync />,
            settings: [
                {
                    category: 'UI Performance',
                    items: [
                        {
                            id: 'enableAnimations',
                            name: 'Enable animations',
                            description: 'Smooth transitions and animations throughout the app',
                            type: 'toggle',
                            value: settings.enableAnimations ?? true,
                            key: 'enableAnimations'
                        },
                        {
                            id: 'enableVirtualScrolling',
                            name: 'Virtual scrolling',
                            description: 'Render only visible items for better performance with large folders',
                            type: 'toggle',
                            value: settings.enableVirtualScrolling ?? true,
                            key: 'enableVirtualScrolling'
                        },
                        {
                            id: 'enableLazyLoading',
                            name: 'Lazy loading',
                            description: 'Load components on-demand for faster initial startup',
                            type: 'toggle',
                            value: settings.enableLazyLoading ?? true,
                            key: 'enableLazyLoading'
                        }
                    ]
                },
                {
                    category: 'Caching',
                    items: [
                        {
                            id: 'enableCaching',
                            name: 'Enable caching',
                            description: 'Cache file/folder data for faster navigation',
                            type: 'toggle',
                            value: settings.enableCaching ?? true,
                            key: 'enableCaching'
                        },
                        {
                            id: 'cacheMaxSize',
                            name: 'Cache size limit (MB)',
                            description: 'Maximum memory used for caching',
                            type: 'slider',
                            value: settings.cacheMaxSize || 100,
                            min: 10,
                            max: 500,
                            step: 10,
                            key: 'cacheMaxSize'
                        },
                        {
                            id: 'cacheMaxAge',
                            name: 'Cache expiration (minutes)',
                            description: 'How long to keep cached data',
                            type: 'slider',
                            value: settings.cacheMaxAge || 5,
                            min: 1,
                            max: 60,
                            step: 1,
                            key: 'cacheMaxAge'
                        }
                    ]
                },
                {
                    category: 'Search & Input',
                    items: [
                        {
                            id: 'enableDebouncing',
                            name: 'Debounce user input',
                            description: 'Delay search/filter operations to reduce system load',
                            type: 'toggle',
                            value: settings.enableDebouncing ?? true,
                            key: 'enableDebouncing'
                        },
                        {
                            id: 'debounceDelay',
                            name: 'Debounce delay (ms)',
                            description: 'Time to wait before processing input',
                            type: 'slider',
                            value: settings.debounceDelay || 300,
                            min: 100,
                            max: 1000,
                            step: 50,
                            key: 'debounceDelay'
                        },
                        {
                            id: 'enableQuickSearch',
                            name: 'Quick search',
                            description: 'Enable fast in-memory search',
                            type: 'toggle',
                            value: settings.enableQuickSearch ?? true,
                            key: 'enableQuickSearch'
                        }
                    ]
                },
                {
                    category: 'File Preview',
                    items: [
                        {
                            id: 'enableFilePreview',
                            name: 'Enable file preview',
                            description: 'Show file contents in details panel',
                            type: 'toggle',
                            value: settings.enableFilePreview ?? true,
                            key: 'enableFilePreview'
                        },
                        {
                            id: 'maxPreviewFileSize',
                            name: 'Max preview file size (MB)',
                            description: 'Maximum file size to preview',
                            type: 'slider',
                            value: settings.maxPreviewFileSize || 10,
                            min: 1,
                            max: 100,
                            step: 1,
                            key: 'maxPreviewFileSize'
                        }
                    ]
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

            case 'slider':
                return (
                    <div className="slider-control">
                        <input
                            type="range"
                            value={setting.value}
                            onChange={(e) => handleSettingUpdate(setting.key, Number(e.target.value))}
                            disabled={isLoading}
                            className="setting-slider"
                            min={setting.min || 0}
                            max={setting.max || 100}
                            step={setting.step || 1}
                        />
                        <span className="slider-value">{setting.value}{setting.unit || ''}</span>
                    </div>
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
                        {activeCategory === 'general' && (
                            <>
                                <div className="settings-panel-header">
                                    <div className="panel-icon"><FaCog /></div>
                                    <h2>General Settings</h2>
                                </div>
                                {settingsCategories
                                    .find(cat => cat.id === 'general')
                                    ?.subsections?.map((subsection) => (
                                        <div key={subsection.id} className="settings-subsection">
                                            <h3 className="subsection-title">{subsection.name}</h3>
                                            <div className="settings-list">
                                                {subsection.settings.map((setting) => (
                                                    <div key={setting.id} className="setting-item">
                                                        <label className="setting-label">{setting.name}</label>
                                                        <div className="setting-control">
                                                            {renderSetting(setting)}
                                                        </div>
                                                    </div>
                                                ))}
                                                {subsection.id === 'history-settings' && (
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
                                        </div>
                                    ))}
                            </>
                        )}

                        {activeCategory === 'performance' && (
                            <>
                                <div className="settings-panel-header">
                                    <div className="panel-icon"><FaSync /></div>
                                    <h2>Performance Settings</h2>
                                </div>
                                <div className="settings-description">
                                    <p>Configure performance options to optimize FAST File Explorer for your system.</p>
                                </div>
                                <div className="settings-list">
                                    {settingsCategories
                                        .find(cat => cat.id === 'performance')
                                        ?.settings?.map((settingGroup: any) => (
                                            <div key={settingGroup.category} className="settings-subsection">
                                                <h3 className="subsection-title">{settingGroup.category}</h3>
                                                <div className="subsection-items">
                                                    {settingGroup.items?.map((setting: any) => (
                                                        <div key={setting.id} className="setting-item">
                                                            <div className="setting-info">
                                                                <label className="setting-label">{setting.name}</label>
                                                                {setting.description && (
                                                                    <p className="setting-description">{setting.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="setting-control">
                                                                {renderSetting(setting)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )) || []}

                                        {/* Cache Management Section */}
                                        {settings.enableCaching && cacheStats && (
                                            <div className="cache-management">
                                                <h3 className="subsection-title">
                                                    <FaDatabase /> Cache Management
                                                </h3>
                                                <div className="cache-stats">
                                                    <div className="cache-stat-card">
                                                        <div className="stat-label">Hit Rate</div>
                                                        <div className="stat-value">
                                                            {((cacheStats.hits / (cacheStats.hits + cacheStats.misses || 1)) * 100).toFixed(1)}%
                                                        </div>
                                                        <div className="stat-detail">
                                                            {cacheStats.hits} hits / {cacheStats.misses} misses
                                                        </div>
                                                    </div>
                                                    <div className="cache-stat-card">
                                                        <div className="stat-label">Total Size</div>
                                                        <div className="stat-value">
                                                            {(cacheStats.totalSize / (1024 * 1024)).toFixed(2)} MB
                                                        </div>
                                                        <div className="stat-detail">
                                                            {cacheStats.totalEntries} entries
                                                        </div>
                                                    </div>
                                                    <div className="cache-stat-card">
                                                        <div className="stat-label">Files Cached</div>
                                                        <div className="stat-value">
                                                            {cacheStats.fileCache?.size || 0}
                                                        </div>
                                                        <div className="stat-detail">
                                                            File entries
                                                        </div>
                                                    </div>
                                                    <div className="cache-stat-card">
                                                        <div className="stat-label">Folders Cached</div>
                                                        <div className="stat-value">
                                                            {cacheStats.folderCache?.size || 0}
                                                        </div>
                                                        <div className="stat-detail">
                                                            Folder entries
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="cache-actions">
                                                    <button 
                                                        onClick={handleClearCache} 
                                                        className="modern-button danger"
                                                        disabled={isLoading}
                                                    >
                                                        <FaTrash /> Clear All Cache
                                                    </button>
                                                    <button 
                                                        onClick={() => setCacheStats(cacheManager.getStats())} 
                                                        className="modern-button secondary"
                                                        disabled={isLoading}
                                                    >
                                                        <FaSync /> Refresh Stats
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
                                                <h4>Developer Console</h4>
                                                <p>Access the developer console with IPC, renderer, and combined process tabs</p>
                                            </div>
                                            <button
                                                className="modern-button primary dev-action-button"
                                                onClick={() => {
                                                    setShowDeveloperConsole(true);
                                                    // Trigger some test console messages
                                                    setTimeout(() => {
                                                        console.log('Developer Console opened');
                                                        console.info('Application version:', getProjectVersion());
                                                        console.log('Settings:', settings);
                                                        console.warn('This is a test warning message');
                                                    }, 100);
                                                }}
                                            >
                                                <FaTerminal />
                                                Open Console
                                            </button>
                                        </div>
                                    </div>

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
                                                    checked={settings.devCustomContextMenu}
                                                    onChange={(e) => handleSettingUpdate('devCustomContextMenu', e.target.checked)}
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
                                                    checked={settings.devDebugMode}
                                                    onChange={(e) => handleSettingUpdate('devDebugMode', e.target.checked)}
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
                                        <p><strong>Version:</strong><span>{getProjectVersion() || 'Unknown'}</span></p>
                                        <p><strong>Build:</strong><span>#{versionInfo?.buildNumber || 'N/A'}</span></p>
                                        <p><strong>Built:</strong><span>{versionInfo?.timestamp ? new Date(versionInfo.timestamp).toLocaleString() : 'Unknown'}</span></p>
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

            <DeveloperConsole
                isOpen={showDeveloperConsole}
                onClose={() => setShowDeveloperConsole(false)}
                consoleRef={consoleRef}
            />
        </div>
    );
};
