import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import './main.scss';
import './components/TabBar/TabBar.scss';
import './components/ThemeSelector/ThemeSelector.scss';
import './components/LazyComponents.scss';
import { handleMinimize, handleMaximize, handleClose } from './components/window_handlers/handlers';
import { TabBar } from './components/TabBar';
import { Theme } from './components/ThemeSelector/ThemeSelector';
import { CustomStyleManager } from './components/CustomStyleManager';
import { Drive } from 'shared/file-data';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { 
  LazyTabContent, 
  LazySettingsMenu, 
  LazySetupWizard, 
  LazyFileTransferUI, 
  ComponentLoader, 
  LazyComponentErrorBoundary 
} from './components/LazyComponents';

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

// Performance-optimized initialization hook with non-blocking loading
const useAsyncInitialization = () => {
    const [initStage, setInitStage] = useState<'loading' | 'ready'>('loading');
    const [drives, setDrives] = useState<Drive[]>([]);
    const [isLoadingDrives, setIsLoadingDrives] = useState(true);
    
    useEffect(() => {
        let mounted = true;
        
        // Immediately set app as ready, load drives in background
        const initializeApp = () => {
            if (mounted) {
                setInitStage('ready'); // App is usable immediately
                
                // Load drives in a completely separate background process
                loadDrivesInBackground();
            }
        };
        
        const loadDrivesInBackground = () => {
            // Use multiple strategies to avoid blocking
            const loadStrategies = [
                // Strategy 1: requestIdleCallback with very low timeout
                () => {
                    if ('requestIdleCallback' in window) {
                        (window as any).requestIdleCallback(async () => {
                            await loadDrives();
                        }, { timeout: 50 }); // Very short timeout
                    }
                },
                // Strategy 2: MessageChannel for truly async execution
                () => {
                    const channel = new MessageChannel();
                    channel.port1.onmessage = async () => {
                        await loadDrives();
                    };
                    channel.port2.postMessage(null);
                },
                // Strategy 3: setTimeout with immediate execution
                () => {
                    setTimeout(async () => {
                        await loadDrives();
                    }, 0);
                }
            ];
            
            // Try strategies in order of preference
            try {
                if ('requestIdleCallback' in window) {
                    loadStrategies[0]();
                } else if ('MessageChannel' in window) {
                    loadStrategies[1]();
                } else {
                    loadStrategies[2]();
                }
            } catch {
                // Final fallback
                loadStrategies[2]();
            }
        };
        
        const loadDrives = async () => {
            try {
                if (!mounted) return;
                
                // Break the drive loading into smaller chunks to prevent blocking
                const rawDriveData = await window.electronAPI.data.getDrives();
                
                // Process drives in small batches to avoid blocking UI
                if (mounted) {
                    const processedDrives = await processDrivesAsync(rawDriveData);
                    setDrives(processedDrives);
                    setIsLoadingDrives(false);
                }
            } catch (error) {
                console.error('Failed to load drives:', error);
                if (mounted) {
                    setDrives([]); // Empty drives, app still works
                    setIsLoadingDrives(false);
                }
            }
        };
        
        const processDrivesAsync = async (rawData: any[]): Promise<Drive[]> => {
            return new Promise((resolve) => {
                const process = () => {
                    try {
                        const drives: Drive[] = rawData.map((drive: any) => ({
                            name: drive.name || 'Unknown Drive',
                            path: drive.path || '',
                            driveName: drive.driveName || drive.name || 'Unknown Drive',
                            drivePath: drive.drivePath || drive.path || '',
                            available: drive.available || 0,
                            total: drive.total || 0,
                            used: drive.used || 0
                        }));
                        resolve(drives);
                    } catch {
                        resolve([]); // Return empty array on error
                    }
                };
                
                // Process drives without blocking UI
                setTimeout(process, 0);
            });
        };
        
        // Start initialization immediately - no delays
        initializeApp();
        
        return () => {
            mounted = false;
        };
    }, []);
    
    return { initStage, drives, isLoadingDrives };
};

// Memoized component for better performance  
const Main = React.memo(function Main(): React.JSX.Element {
    
    // Lazy initialization with non-blocking loading
    const { initStage, drives, isLoadingDrives } = useAsyncInitialization();
    
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

    // UI state for modal components - lazy loaded
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

    // Apply theme with performance optimization
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;

        // Clear any custom styles first
        CustomStyleManager.clearDocumentStyles();
        root.removeAttribute('data-custom-theme');

        // Batch DOM updates to reduce reflow
        const applyTheme = () => {
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
        };

        // Use requestAnimationFrame for smooth theme transitions
        requestAnimationFrame(applyTheme);

        try {
            localStorage.setItem('fast-file-explorer-theme', theme);
        } catch (error) {
            console.warn('Failed to save theme to localStorage:', error);
        }
    }, [theme]);

    // Debounced localStorage save for view mode
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            try {
                localStorage.setItem('fast-file-explorer-view-mode', viewMode);
            } catch (error) {
                console.warn('Failed to save view mode to localStorage:', error);
            }
        }, 300); // Debounce saves

        return () => clearTimeout(timeoutId);
    }, [viewMode]);

    // Optimized zoom handling with debounced window resize
    useEffect(() => {
        try {
            localStorage.setItem('fast-file-explorer-zoom-level', zoomLevel.toString());
            
            // Apply zoom immediately for instant response
            const rootElement = document.documentElement;
            rootElement.style.zoom = `${zoomLevel}%`;
            rootElement.style.minHeight = '100vh';
            rootElement.style.height = 'auto';
            
            document.body.style.minHeight = '100vh';
            document.body.style.height = 'auto';
            
            // Debounced window resize to avoid excessive API calls
            const adjustWindowSize = async () => {
                if (window.electronAPI?.window) {
                    try {
                        const bounds = await window.electronAPI.window.getBounds();
                        const zoomFactor = zoomLevel / 100;
                        
                        let newWidth = bounds.width;
                        let newHeight = bounds.height;
                        
                        if (zoomLevel < 100) {
                            const expansionFactor = 1 + (100 - zoomLevel) / 300;
                            newWidth = Math.min(Math.round(bounds.width * expansionFactor), 1400);
                            newHeight = Math.min(Math.round(bounds.height * expansionFactor), 1000);
                        } else if (zoomLevel >= 150) {
                            const contractionFactor = 1 - (zoomLevel - 100) / 600;
                            newWidth = Math.max(Math.round(bounds.width * contractionFactor), 900);
                            newHeight = Math.max(Math.round(bounds.height * contractionFactor), 700);
                        }
                        
                        const widthDiff = Math.abs(bounds.width - newWidth);
                        const heightDiff = Math.abs(bounds.height - newHeight);
                        
                        if (widthDiff > 30 || heightDiff > 30) {
                            const newX = bounds.x + Math.round((bounds.width - newWidth) / 2);
                            const newY = bounds.y + Math.round((bounds.height - newHeight) / 2);
                            
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
            
            // Debounce window resize
            const timeoutId = setTimeout(adjustWindowSize, 300);
            return () => clearTimeout(timeoutId);
            
        } catch (error) {
            console.warn('Failed to save or apply zoom level:', error);
        }
    }, [zoomLevel]);

    // Memoized event handlers to prevent unnecessary re-renders
    const handleZoomIn = useCallback(() => {
        setZoomLevel(prev => Math.min(prev + 10, 200));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoomLevel(prev => Math.max(prev - 10, 50));
    }, []);

    const handleResetZoom = useCallback(() => {
        setZoomLevel(100);
    }, []);

    // Keyboard shortcuts for zoom - memoized
    const keyboardHandlers = useMemo(() => ({
        handleKeyDown: (event: KeyboardEvent) => {
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
        },
        handleWheel: (event: WheelEvent) => {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                if (event.deltaY < 0) {
                    handleZoomIn();
                } else if (event.deltaY > 0) {
                    handleZoomOut();
                }
            }
        }
    }), [handleZoomIn, handleZoomOut, handleResetZoom]);

    useEffect(() => {
        const { handleKeyDown, handleWheel } = keyboardHandlers;
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('wheel', handleWheel);
        };
    }, [keyboardHandlers]);

    // Memoized handlers for better performance
    const modalHandlers = useMemo(() => ({
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        openSetup: () => setIsSetupOpen(true),
        closeSetup: () => setIsSetupOpen(false),
        openFileTransfer: () => setIsFileTransferOpen(true),
        closeFileTransfer: () => setIsFileTransferOpen(false),
    }), []);

    // Tab handlers - memoized
    const tabHandlers = useMemo(() => ({
        setActiveTab: (tabId: string) => setActiveTabId(tabId),
        addTab: useCallback((title: string, url: string) => {
            const newTab: Tab = {
                id: `tab-${Date.now()}`,
                title,
                url,
                isActive: false
            };
            setTabs(prev => [...prev, newTab]);
        }, []),
        closeTab: useCallback((tabId: string) => {
            setTabs(prev => prev.filter(tab => tab.id !== tabId));
        }, []),
    }), []);

    const activeTab = useMemo(() => 
        tabs.find(tab => tab.id === activeTabId), 
        [tabs, activeTabId]
    );

    // App is always ready now - no loading screen that blocks UI
    // Drives load in background without blocking the interface

    return (
        <SettingsProvider>
            <div className="app performance-optimized">
                <AnimationController />
                
                {/* Window controls */}
                <div className="titlebar">
                    <div className="titlebar-title">Fast File Explorer</div>
                    <div className="titlebar-controls">
                        <button className="titlebar-button" onClick={handleMinimize}>_</button>
                        <button className="titlebar-button" onClick={() => handleMaximize(isMaximized, setIsMaximized)}>
                            {isMaximized ? '⧉' : '□'}
                        </button>
                        <button className="titlebar-button close" onClick={handleClose}>×</button>
                    </div>
                </div>

                {/* Tab bar */}
                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    isMaximized={isMaximized}
                    currentTheme={theme}
                    zoomLevel={zoomLevel}
                    onTabSelect={tabHandlers.setActiveTab}
                    onTabClose={tabHandlers.closeTab}
                    onNewTab={() => tabHandlers.addTab("New Tab", "about:blank")}
                    onMinimize={handleMinimize}
                    onMaximize={() => handleMaximize(isMaximized, setIsMaximized)}
                    onClose={handleClose}
                    onThemeChange={setTheme}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onResetZoom={handleResetZoom}
                    onShowSettings={modalHandlers.openSettings}
                />

                {/* Main content with lazy loading */}
                <div className="main-content">
                    <Suspense fallback={<ComponentLoader message="Loading content..." />}>
                        <LazyComponentErrorBoundary>
                            <LazyTabContent
                                tabId={activeTab?.id || 'tab-1'}
                                isActive={true}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                drives={drives}
                            />
                        </LazyComponentErrorBoundary>
                    </Suspense>
                </div>

                {/* Lazy-loaded modal components */}
                {isSettingsOpen && (
                    <Suspense fallback={<ComponentLoader message="Loading settings..." />}>
                        <LazyComponentErrorBoundary>
                            <LazySettingsMenu
                                isOpen={isSettingsOpen}
                                onClose={modalHandlers.closeSettings}
                                onShowSetup={modalHandlers.openSetup}
                                onShowFileTransferUI={modalHandlers.openFileTransfer}
                            />
                        </LazyComponentErrorBoundary>
                    </Suspense>
                )}

                {isSetupOpen && (
                    <Suspense fallback={<ComponentLoader message="Loading setup wizard..." />}>
                        <LazyComponentErrorBoundary>
                            <LazySetupWizard
                                isOpen={isSetupOpen}
                                onSkip={modalHandlers.closeSetup}
                                onComplete={(settings) => {
                                    setHasCompletedSetup(true);
                                    setIsSetupOpen(false);
                                    // Here you could save the setup settings if needed
                                    localStorage.setItem('fast-file-explorer-setup-completed', 'true');
                                }}
                            />
                        </LazyComponentErrorBoundary>
                    </Suspense>
                )}

                {isFileTransferOpen && (
                    <Suspense fallback={<ComponentLoader message="Loading file transfer..." />}>
                        <LazyComponentErrorBoundary>
                            <LazyFileTransferUI
                                isVisible={isFileTransferOpen}
                                onClose={modalHandlers.closeFileTransfer}
                                fileSizeUnit="binary"
                            />
                        </LazyComponentErrorBoundary>
                    </Suspense>
                )}
            </div>
        </SettingsProvider>
    );
});

// Main component wrapper with Settings provider
const MainWithProvider: React.FC = () => {
    return (
        <SettingsProvider>
            <Main />
        </SettingsProvider>
    );
};

export default MainWithProvider;
