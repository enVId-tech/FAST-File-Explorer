import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import './main.scss';
import './components/TabBar/TabBar.scss';
import './components/ThemeSelector/ThemeSelector.scss';
import './components/LazyComponents.scss';
import './initialization.scss';
import { handleMinimize, handleMaximize, handleClose } from './components/window_handlers/handlers';
import { TabBar } from './components/TabBar';
import { Theme } from './components/ThemeSelector/ThemeSelector';
import { CustomStyleManager } from './components/CustomStyleManager';
import { SettingsMenu } from './components/SettingsMenu/SettingsMenu';
import { SetupWizard } from './components/SetupWizard/SetupWizard';
import { FileTransferUI } from './components/FileTransferUI/FileTransferUI';
import { Drive } from 'shared/file-data';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ComponentLoader, LazyComponentErrorBoundary } from './components/LazyComponents';

// Lazy load the heavy TabContent component
const LazyTabContent = React.lazy(() =>
    import('./components/Views/TabContent').then(module => ({ default: module.TabContent }))
);

// Component to handle animation control based on settings
const AnimationController: React.FC = () => {
    const { settings } = useSettings();

    useEffect(() => {
        // Set CSS custom property to control animations globally
        document.documentElement.style.setProperty(
            '--animation-duration',
            settings.enableAnimations ? '0.2s' : '0s'
        );
        document.documentElement.style.setProperty(
            '--transition-duration',
            settings.enableAnimations ? '0.2s' : '0s'
        );
    }, [settings.enableAnimations]);

    return null; // This component only manages CSS properties
};

interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
}

// Memoized component for better performance  
const Main = React.memo(function Main(): React.JSX.Element {

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

    // Initialize zoom level from localStorage or default to 100%
    const [zoomLevel, setZoomLevel] = useState(() => {
        try {
            const savedZoom = localStorage.getItem('fast-file-explorer-zoom-level');
            return savedZoom ? parseInt(savedZoom, 10) : 100;
        } catch (error) {
            console.warn('Failed to load zoom level from localStorage:', error);
            return 100;
        }
    });

    const [tabs, setTabs] = useState<Tab[]>([
        { id: 'tab-1', title: 'This PC', url: 'home', isActive: true },
    ]);
    const [activeTabId, setActiveTabId] = useState('tab-1');

    // Drive data
    const [drives, setDrives] = useState<Drive[]>([]);
    const [drivesLoading, setDrivesLoading] = useState(true);
    const [drivesError, setDrivesError] = useState<string | null>(null);

    // UI state for modal components
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const [isFileTransferOpen, setIsFileTransferOpen] = useState(false);
    const [hasCompletedSetup, setHasCompletedSetup] = useState(() => {
        try {
            return localStorage.getItem('fast-file-explorer-setup-completed') === 'true';
        } catch {
            return false;
        }
    });

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

    // Save zoom level to localStorage and apply to document - INSTANT with window resizing
    useEffect(() => {
        try {
            localStorage.setItem('fast-file-explorer-zoom-level', zoomLevel.toString());

            // Use the native CSS zoom property for instant, no-animation scaling
            const rootElement = document.documentElement;

            // Apply zoom immediately - this is instant with no animations
            rootElement.style.zoom = `${zoomLevel}%`;

            // Force immediate layout recalculation to prevent gaps
            rootElement.style.minHeight = '100vh';
            rootElement.style.height = 'auto';

            // Force the body to fill the available space
            document.body.style.minHeight = '100vh';
            document.body.style.height = 'auto';

            // INSTANT window resizing based on zoom level
            const adjustWindowSizeInstantly = async () => {
                if (window.electronAPI?.window) {
                    try {
                        const bounds = await window.electronAPI.window.getBounds();

                        // Calculate zoom factor
                        const zoomFactor = zoomLevel / 100;

                        // Define base comfortable dimensions at 100% zoom
                        const baseWidth = 1200;
                        const baseHeight = 800;

                        // Calculate new window size more intelligently
                        // The goal: maintain comfortable usable area regardless of zoom
                        let newWidth, newHeight;

                        if (zoomLevel < 100) {
                            // Zoomed out: increase window size moderately to maintain usability
                            const expansionFactor = 1 + (100 - zoomLevel) / 300; // More conservative expansion
                            newWidth = Math.min(Math.round(bounds.width * expansionFactor), 1400);
                            newHeight = Math.min(Math.round(bounds.height * expansionFactor), 1000);
                        } else if (zoomLevel > 100) {
                            // Zoomed in: only resize for significant zoom levels
                            if (zoomLevel >= 150) {
                                const contractionFactor = 1 - (zoomLevel - 100) / 600; // Very conservative contraction
                                newWidth = Math.max(Math.round(bounds.width * contractionFactor), 900);
                                newHeight = Math.max(Math.round(bounds.height * contractionFactor), 700);
                            } else {
                                // For moderate zoom (100-150%), don't resize much
                                newWidth = bounds.width;
                                newHeight = bounds.height;
                            }
                        } else {
                            // 100% zoom: keep current size
                            newWidth = bounds.width;
                            newHeight = bounds.height;
                        }

                        // Only resize if there's a meaningful difference (avoid micro-adjustments)
                        const widthDiff = Math.abs(bounds.width - newWidth);
                        const heightDiff = Math.abs(bounds.height - newHeight);

                        if (widthDiff > 30 || heightDiff > 30) {
                            // Center the window while resizing
                            const newX = bounds.x + Math.round((bounds.width - newWidth) / 2);
                            const newY = bounds.y + Math.round((bounds.height - newHeight) / 2);

                            // Apply resize INSTANTLY - no animation
                            await window.electronAPI.window.setBounds({
                                x: newX,
                                y: newY,
                                width: newWidth,
                                height: newHeight
                            });
                        }
                    } catch (error) {
                        console.warn('Failed to adjust window size:', error);
                    }
                }
            };

            // Execute window resize immediately - no setTimeout, no delays
            adjustWindowSizeInstantly();

        } catch (error) {
            console.warn('Failed to save or apply zoom level:', error);
        }
    }, [zoomLevel]);

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        setZoomLevel(prev => {
            const newLevel = Math.min(prev + 10, 200); // Max 200%
            // Show a temporary toast notification (optional)
            if (newLevel !== prev) {
                console.log(`Zoom: ${newLevel}%`);
            }
            return newLevel;
        });
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomLevel(prev => {
            const newLevel = Math.max(prev - 10, 50); // Min 50%
            // Show a temporary toast notification (optional)
            if (newLevel !== prev) {
                console.log(`Zoom: ${newLevel}%`);
            }
            return newLevel;
        });
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoomLevel(100);
        console.log('Zoom: 100% (Reset)');
    }, []);

    // Keyboard shortcuts for zoom
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case '+':
                    case '=':
                        event.preventDefault();
                        handleZoomIn();
                        break;
                    case '-':
                        event.preventDefault();
                        handleZoomOut();
                        break;
                    case '0':
                        event.preventDefault();
                        handleResetZoom();
                        break;
                }
            }
        };

        const handleWheel = (event: WheelEvent) => {
            // Ctrl/Cmd + wheel for zoom
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                if (event.deltaY < 0) {
                    handleZoomIn();
                } else if (event.deltaY > 0) {
                    handleZoomOut();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('wheel', handleWheel);
        };
    }, [handleZoomIn, handleZoomOut, handleResetZoom]);

    // Cleanup zoom styles on unmount
    useEffect(() => {
        return () => {
            const rootElement = document.documentElement;
            const bodyElement = document.body;
            // Reset zoom
            rootElement.style.zoom = '';
            // Reset layout styles
            rootElement.style.minHeight = '';
            rootElement.style.height = '';
            bodyElement.style.minHeight = '';
            bodyElement.style.height = '';
        };
    }, []);

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

    // Memoized theme display name getter
    const getThemeDisplayName = useCallback(() => {
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
    }, [theme]);

    // Memoized window control handlers
    const minimize = useCallback(() => handleMinimize(), []);
    const maximize = useCallback(() => handleMaximize(isMaximized, setIsMaximized), [isMaximized]);
    const close = useCallback(() => handleClose(), []);

    // Memoized theme change handler
    const handleThemeChange = useCallback((newTheme: Theme) => {
        console.log('Theme change requested from:', theme, 'to:', newTheme);
        console.log('ThemeSelector clicked, calling setTheme with:', newTheme);
        setTheme(newTheme);
        console.log('setTheme called successfully');
    }, [theme]);

    // Refresh drives function for manual refresh
    const refreshDrives = useCallback(async () => {
        setDrivesLoading(true);
        setDrivesError(null);
        let retryCount = 0;
        const maxRetries = 1; // Single retry for manual refresh

        while (retryCount <= maxRetries) {
            try {
                console.log('Manually refreshing drives...');
                
                let timeoutId: NodeJS.Timeout | undefined;
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error('Drive loading timeout')), 5000);
                });

                const drivePromise = window.electronAPI.data.getDrives();
                
                let driveData;
                try {
                    driveData = await Promise.race([drivePromise, timeoutPromise]);
                    if (timeoutId) clearTimeout(timeoutId); // Clear timeout on success
                } catch (error) {
                    if (timeoutId) clearTimeout(timeoutId); // Clear timeout on error
                    throw error; // Re-throw the error
                }

                if (!Array.isArray(driveData)) {
                    throw new Error('Invalid drive data format');
                }

                const mappedDrives: Drive[] = driveData.map((drive: any) => ({
                    driveName: drive.name || drive.driveName || 'Unknown Drive',
                    drivePath: drive.path || drive.drivePath || '',
                    available: drive.available || 0,
                    total: drive.total || 0,
                    used: drive.used || 0,
                    busType: drive.busType,
                    description: drive.description,
                    flags: drive.flags,
                    logicalBlockSize: drive.logicalBlockSize,
                    partitionType: drive.partitionType,
                    percentageUsed: drive.percentageUsed
                }));

                setDrives(mappedDrives);
                setDrivesLoading(false);
                setDrivesError(null);
                console.log(`Manually refreshed ${mappedDrives.length} drives`);
                return;

            } catch (error) {
                console.error(`Manual drive refresh failed (attempt ${retryCount + 1}):`, error);
                retryCount++;

                if (retryCount > maxRetries) {
                    setDrivesLoading(false);
                    setDrivesError('Failed to refresh drives');
                    return;
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }, []);

    // Memoized tab management handlers
    const handleTabSelect = useCallback(async (tabId: string) => {
        setActiveTabId(tabId);
        setTabs(prev => prev.map(tab => ({ ...tab, isActive: tab.id === tabId })));

        // If switching to a "This PC" tab and drives are empty, trigger a refresh
        const tab = tabs.find(t => t.id === tabId);
        if (tab && tab.url === 'internal:home' && drives.length === 0 && !drivesLoading) {
            console.log('Loading drives for This PC tab');
            refreshDrives();
        }

        // TODO: Re-enable when internal:home is implemented
        // try {
        //     await window.electronAPI?.tabSwitch(tabId);
        // } catch (error) {
        //     console.error('Failed to switch tab:', error);
        // }
    }, [tabs, drives, drivesLoading, refreshDrives]);

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

    // Listen for window maximize/unmaximize events from main process
    useEffect(() => {
        const handleWindowMaximized = (event: any, maximized: boolean) => {
            setIsMaximized(maximized);
        };

        let cleanup: (() => void) | undefined;

        // Add listener for window state changes
        if (window.electronAPI?.window) {
            cleanup = window.electronAPI.window.onMaximizeChange(handleWindowMaximized);
            window.electronAPI.window.addMaximizeListener();
        }

        return () => {
            // Cleanup listeners
            if (window.electronAPI?.window) {
                window.electronAPI.window.removeMaximizeListener();
            }
            if (cleanup) {
                cleanup();
            }
        };
    }, []);

    // Load drives once at startup with retries
    useEffect(() => {
        let mounted = true;
        let retryCount = 0;
        const maxRetries = 2; // Reduced to 2 retries instead of 3
        const retryDelay = 1500; // 1.5 seconds

        const loadDrivesWithRetry = async (isManualRefresh = false) => {
            if (mounted) {
                setDrivesLoading(true);
                setDrivesError(null);
            }

            while (mounted && retryCount <= maxRetries) {
                try {
                    if (isManualRefresh || retryCount === 0) {
                        console.log(`Loading drives (attempt ${retryCount + 1}/${maxRetries + 1})`);
                    }

                    // Add timeout to prevent hanging
                    let timeoutId: NodeJS.Timeout | undefined;
                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeoutId = setTimeout(() => reject(new Error('Drive loading timeout')), 5000);
                    });

                    const drivePromise = window.electronAPI.data.getDrives();
                    
                    let driveData;
                    try {
                        driveData = await Promise.race([drivePromise, timeoutPromise]);
                        if (timeoutId) clearTimeout(timeoutId); // Clear timeout on success
                    } catch (error) {
                        if (timeoutId) clearTimeout(timeoutId); // Clear timeout on error
                        throw error; // Re-throw the error
                    }
                    
                    // Validate that we got actual data
                    if (!Array.isArray(driveData)) {
                        throw new Error('Invalid drive data format');
                    }

                    // Map the drive data to match the Drive interface
                    const mappedDrives: Drive[] = driveData.map((drive: any) => ({
                        driveName: drive.name || drive.driveName || 'Unknown Drive',
                        drivePath: drive.path || drive.drivePath || '',
                        available: drive.available || 0,
                        total: drive.total || 0,
                        used: drive.used || 0,
                        busType: drive.busType,
                        description: drive.description,
                        flags: drive.flags,
                        logicalBlockSize: drive.logicalBlockSize,
                        partitionType: drive.partitionType,
                        percentageUsed: drive.percentageUsed
                    }));

                    if (mounted) {
                        setDrives(mappedDrives);
                        setDrivesLoading(false);
                        setDrivesError(null);
                        if (isManualRefresh || retryCount === 0) {
                            console.log(`Successfully loaded ${mappedDrives.length} drives`);
                        }
                    }

                    return; // Success, exit the retry loop

                } catch (error) {
                    console.error(`Failed to load drives (attempt ${retryCount + 1}):`, error);
                    retryCount++;

                    if (retryCount > maxRetries) {
                        console.warn('All drive loading attempts failed');
                        if (mounted) {
                            setDrives([]); // Set empty array so app still works
                            setDrivesLoading(false);
                            setDrivesError(`Failed to load drives after ${maxRetries + 1} attempts`);
                        }
                        return;
                    }

                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        };

        // Load drives only once at startup
        loadDrivesWithRetry();

        return () => {
            mounted = false;
        };
    }, []); // Empty dependency array - only run once at startup

    // Check if setup should be shown on first load
    useEffect(() => {
        if (!hasCompletedSetup) {
            setIsSetupOpen(true);
        }
    }, [hasCompletedSetup]);

    // Handler functions for UI components
    const handleShowSettings = useCallback(() => setIsSettingsOpen(true), []);
    const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);

    const handleShowSetup = useCallback(() => {
        setIsSetupOpen(true);
    }, []);
    const handleCloseSetup = useCallback(() => setIsSetupOpen(false), []);
    const handleCompleteSetup = useCallback((settings?: any) => {
        console.log('Setup completed with settings:', settings);
        setIsSetupOpen(false);
        setHasCompletedSetup(true);
        try {
            localStorage.setItem('fast-file-explorer-setup-completed', 'true');
            // Save settings if provided
            if (settings) {
                localStorage.setItem('fast-file-explorer-setup-settings', JSON.stringify(settings));
            }
        } catch (error) {
            console.warn('Failed to save setup completion status:', error);
        }
    }, []);

    const handleShowFileTransfer = useCallback(() => {
        console.log('handleShowFileTransfer called!');
        setIsFileTransferOpen(true);
    }, []);
    const handleCloseFileTransfer = useCallback(() => setIsFileTransferOpen(false), []);

    // Drive refresh handler
    const handleRefreshDrives = useCallback(async () => {
        console.log('Manual drive refresh triggered');
        await refreshDrives();
    }, [refreshDrives]);

    // UI is always ready immediately - drives load in background
    return (
        <SettingsProvider>
            <AnimationController />
            <div className="file-explorer">
                {/* Tab Bar replaces Title Bar */}
                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    isMaximized={isMaximized}
                    currentTheme={theme}
                    zoomLevel={zoomLevel}
                    onTabSelect={handleTabSelect}
                    onTabClose={handleTabClose}
                    onNewTab={handleNewTab}
                    onMinimize={minimize}
                    onMaximize={maximize}
                    onClose={close}
                    onThemeChange={handleThemeChange}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onResetZoom={handleResetZoom}
                    onShowSettings={handleShowSettings}
                />

                {/* Render content for each tab with lazy loading */}
                {tabs.map((tab) => (
                    <Suspense key={tab.id} fallback={<ComponentLoader message="Loading file explorer..." />}>
                        <LazyComponentErrorBoundary>
                            <LazyTabContent
                                key={tab.id}
                                tabId={tab.id}
                                isActive={tab.id === activeTabId}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                drives={drives}
                                drivesLoading={drivesLoading}
                                drivesError={drivesError}
                                onRefreshDrives={handleRefreshDrives}
                            />
                        </LazyComponentErrorBoundary>
                    </Suspense>
                ))}

                {/* Modal Components */}
                <SettingsMenu
                    isOpen={isSettingsOpen}
                    onClose={handleCloseSettings}
                    onShowSetup={handleShowSetup}
                    onShowFileTransferUI={handleShowFileTransfer}
                />

                <SetupWizard
                    isOpen={isSetupOpen}
                    onComplete={handleCompleteSetup}
                    onSkip={handleCloseSetup}
                />

                <FileTransferUI
                    isVisible={isFileTransferOpen}
                    onClose={handleCloseFileTransfer}
                    fileSizeUnit={'decimal'}
                />
            </div>
        </SettingsProvider>
    );
});

export default Main;