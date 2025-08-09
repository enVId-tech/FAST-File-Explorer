import React, { useState, useEffect } from 'react';
import './main.scss';
import './components/TabBar/TabBar.scss';
import './components/ThemeSelector/ThemeSelector.scss';
import { handleMinimize, handleMaximize, handleClose } from './components/window_handlers/handlers';
import { TabBar } from './components/TabBar';
import { TabContent } from './components/Views';
import { Theme } from './components/ThemeSelector/ThemeSelector';
import { CustomStyleManager } from './components/CustomStyleManager';
import { Drive } from 'shared/file-data';

interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
}

export default function Main(): React.JSX.Element {
    const [currentPath, setCurrentPath] = useState('This PC > Documents');
    
    // Initialize view mode from localStorage or default to list
    const [viewMode, setViewMode] = useState(() => {
        try {
            const savedViewMode = localStorage.getItem('fast-file-explorer-view-mode');
            return savedViewMode || 'list';
        } catch (error) {
            console.warn('Failed to load view mode from localStorage:', error);
            return 'list';
        }
    });
    
    const [isMaximized, setIsMaximized] = useState(false);
    
    // Initialize theme from localStorage or default to win11-light
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const saved = localStorage.getItem('fast-file-explorer-theme');
            return (saved as Theme) || 'win11-light';
        } catch (error) {
            console.warn('Failed to load theme from localStorage:', error);
            return 'win11-light';
        }
    });
    
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
    const [tabs, setTabs] = useState<Tab[]>([
        { id: 'tab-1', title: 'This PC', url: 'home', isActive: true },
    ]);
    const [activeTabId, setActiveTabId] = useState('tab-1');

    // Drive data
    const [drives, setDrives] = useState<Drive[]>([]);

    // Apply theme to document element and save to localStorage
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;

        // Clear any custom styles first
        CustomStyleManager.clearDocumentStyles();
        root.removeAttribute('data-custom-theme');

        // If theme id corresponds to a saved custom style, apply variables
        const possibleCustom = CustomStyleManager.getStyle(theme);
        if (possibleCustom) {
            CustomStyleManager.applyStyleToDocument(possibleCustom);
            root.setAttribute('data-theme', 'custom');
            root.setAttribute('data-custom-theme', possibleCustom.id);
            body.setAttribute('data-theme', 'custom');
        } else {
            // Built-in theme: set data-theme to the id
            root.setAttribute('data-theme', theme);
            body.setAttribute('data-theme', theme);
        }

        const rootElement = document.getElementById('root');
        if (rootElement) rootElement.setAttribute('data-theme', root.getAttribute('data-theme') || theme);

        try {
            localStorage.setItem('fast-file-explorer-theme', theme);
        } catch (error) {
            console.warn('Failed to save theme to localStorage:', error);
        }
    }, [theme]);

    // Removed: keyboard shortcut that cycled themes on Ctrl+T (themes must be changed manually)

    // Save view mode to localStorage when it changes
    useEffect(() => {
        try {
            localStorage.setItem('fast-file-explorer-view-mode', viewMode);
        } catch (error) {
            console.warn('Failed to save view mode to localStorage:', error);
        }
    }, [viewMode]);

    // Close theme selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isThemeSelectorOpen && !(event.target as Element)?.closest('.theme-selector')) {
                setIsThemeSelectorOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isThemeSelectorOpen]);

    const getThemeDisplayName = () => {
        switch (theme) {
            case 'win11-light': return 'Windows 11 Light';
            case 'win11-dark': return 'Windows 11 Dark';
            case 'win10-light': return 'Windows 10 Light';
            case 'win10-dark': return 'Windows 10 Dark';
            case 'cyberpunk': return 'Cyberpunk';
            case 'retro': return 'Retro';
            case 'futuristic': return 'Futuristic';
            case 'nature': return 'Nature';
            default: return 'Windows 11 Light';
        }
    };

    // Window control handlers
    const minimize = () => handleMinimize();
    const maximize = () => handleMaximize(isMaximized, setIsMaximized);
    const close = () => handleClose();

    // Theme change handler with debugging
    const handleThemeChange = (newTheme: Theme) => {
        console.log('Theme change requested from:', theme, 'to:', newTheme);
        console.log('ThemeSelector clicked, calling setTheme with:', newTheme);
        setTheme(newTheme);
        console.log('setTheme called successfully');
    };

    // Tab management handlers
    const handleTabSelect = async (tabId: string) => {
        setActiveTabId(tabId);
        setTabs(prev => prev.map(tab => ({ ...tab, isActive: tab.id === tabId })));

        // TODO: Re-enable when internal:home is implemented
        // try {
        //     await window.electronAPI?.tabSwitch(tabId);
        // } catch (error) {
        //     console.error('Failed to switch tab:', error);
        // }
    };

    const handleTabClose = async (tabId: string) => {
        if (tabs.length <= 1) {
            // If this is the last tab, close the application window
            close();
            return;
        }

        // TODO: Re-enable when internal:home is implemented
        // try {
        //     await window.electronAPI?.tabClose(tabId);
        // } catch (error) {
        //     console.error('Failed to close tab:', error);
        // }

        // Prev is the current active tab
        setActiveTabId(prev => {
            const currentIndex = tabs.findIndex(tab => tab.id === prev);
            if (currentIndex === -1) return prev; // If not found, return current active tab

            // If it was the first tab, switch to the next one
            if (currentIndex === 0) {
                return tabs[1].id;
            }

            // If it was the last tab, switch to the previous one
            if (currentIndex === tabs.length - 1) {
                return tabs[currentIndex - 1].id;
            }

            // If it neither first or last, switch to the next tab
            if (currentIndex < tabs.length - 1) {
                return tabs[currentIndex + 1].id;
            }

            // Always return prev as fallback
            return prev;
        });

        setTabs(prev => {
            return prev.filter(tab => tab.id !== tabId);
        });


    };

    const handleNewTab = async () => {
        // Create new tab locally for now (renders same Main component content)
        const newTabId = `tab-${Date.now()}`;
        const newTab: Tab = {
            id: newTabId,
            title: 'New Tab',
            url: 'home',
            isActive: true
        };
        
        setTabs(prev => [...prev.map(tab => ({ ...tab, isActive: false })), newTab]);
        setActiveTabId(newTabId);

        // TODO: Re-enable when internal:home is implemented
        // try {
        //     const newTab = await window.electronAPI?.tabAdd('internal:home');
        //     if (newTab) {
        //         const tab: Tab = {
        //             id: newTab.id,
        //             title: newTab.title || 'New Tab',
        //             url: newTab.url,
        //             isActive: false
        //         };
        //         setTabs(prev => [...prev, tab]);
        //     }
        // } catch (error) {
        //     console.error('Failed to create new tab:', error);
        // }
    };

    const getFolderMetadata = async (folderPath: string) => {
        try {
            const metadata = await window.electronAPI?.data.getMetadata(folderPath);
            return metadata;
        } catch (error) {
            console.error('Failed to get folder metadata:', error);
            return null;
        }
    };

    const getChildrenFolders = async (folderPath: string) => {
        try {
            const folders = await window.electronAPI?.data.getDirectory(folderPath);
            return folders;
        } catch (error) {
            console.error('Failed to get child folders:', error);
            return [];
        }
    };

    const getDrives = async () => {
        try {
            const drives = await window.electronAPI?.data.getDrives();
            return drives;
        } catch (error) {
            console.error("Failed to get drive assignments:", error)
            return [];
        }
    }

    useEffect(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 't' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                handleNewTab();
            }

            if (event.key === 'w' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                // Close the currently active tab
                handleTabClose(activeTabId);
            }
        };

        window.addEventListener('keydown', handleKeydown);

        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [activeTabId, tabs.length]); // Include dependencies to ensure current state is used

    useEffect(() => {
        // Use the documents folder as a placeholder path to test functionality
        getFolderMetadata('C:\\Users\\theli\\Documents').then(metadata => {
            console.log('Folder metadata:', metadata);
        });

        getChildrenFolders('C:\\Users\\theli\\Documents').then(folders => {
            console.log('Child folders:', folders);
        });

        getDrives().then((drives: any) => {
            console.log('Drive data:', drives);
            setDrives(drives.driveDetails);
        });
    }, []);

    return (
        <div className="file-explorer">
            {/* Tab Bar replaces Title Bar */}
            <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                isMaximized={isMaximized}
                currentTheme={theme}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                onMinimize={minimize}
                onMaximize={maximize}
                onClose={close}
                onThemeChange={handleThemeChange}
            />

            {/* Render content for each tab */}
            {tabs.map((tab) => (
                <TabContent
                    key={tab.id}
                    tabId={tab.id}
                    isActive={tab.id === activeTabId}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    drives={drives}
                />
            ))}
        </div>
    );
}