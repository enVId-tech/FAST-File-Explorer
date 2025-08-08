import React, { useEffect, useRef, useState } from 'react';
import { FaTimes, FaPlus, FaWindowMinimize, FaWindowMaximize, FaRegFile, FaFolder } from 'react-icons/fa';
import { ThemeSelector, Theme } from './ThemeSelector';

interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
}

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string;
    isMaximized: boolean;
    currentTheme: Theme;
    onTabSelect: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onClose: () => void;
    onThemeChange: (theme: Theme) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
    tabs,
    activeTabId,
    isMaximized,
    currentTheme,
    onTabSelect,
    onTabClose,
    onNewTab,
    onMinimize,
    onMaximize,
    onClose,
    onThemeChange
}) => {
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const [tabSizeClass, setTabSizeClass] = useState<string>('');
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

    // Calculate tab sizes based on available space
    useEffect(() => {
        const calculateTabSizes = () => {
            if (!tabsContainerRef.current) return;

            const containerWidth = tabsContainerRef.current.offsetWidth;
            const newTabButtonWidth = 48; // Approximate width of new tab button + margin
            const scrollButtonsWidth = isOverflowing ? 64 : 0; // Account for scroll buttons
            const availableWidth = containerWidth - newTabButtonWidth - scrollButtonsWidth;
            const tabCount = tabs.length;
            
            if (tabCount === 0) return;

            // Calculate ideal width per tab (including margins)
            const tabMarginAndBorder = 2; // 1px margin-right + border
            const idealTabWidth = (availableWidth - (tabCount * tabMarginAndBorder)) / tabCount;

            // Define breakpoints
            const LARGE_TAB_WIDTH = 180;
            const MEDIUM_TAB_WIDTH = 120;
            const SMALL_TAB_WIDTH = 80;
            const VERY_SMALL_TAB_WIDTH = 56; // Updated to match new minimum (icon + padding + close button)

            if (idealTabWidth >= LARGE_TAB_WIDTH) {
                setTabSizeClass('');
            } else if (idealTabWidth >= MEDIUM_TAB_WIDTH) {
                setTabSizeClass('medium');
            } else if (idealTabWidth >= SMALL_TAB_WIDTH) {
                setTabSizeClass('small');
            } else if (idealTabWidth >= VERY_SMALL_TAB_WIDTH) {
                setTabSizeClass('very-small');
            } else {
                // When tabs would be smaller than minimum, allow overflow
                setTabSizeClass('overflow');
            }

            // Detect overflow - improved detection
            const el = tabsContainerRef.current;
            const hasOverflow = el.scrollWidth > el.clientWidth + 1;
            setIsOverflowing(hasOverflow);
            
            // Auto-scroll to active tab when overflow changes
            if (hasOverflow) {
                const activeTab = el.querySelector('.tab.active') as HTMLElement;
                if (activeTab) {
                    const containerRect = el.getBoundingClientRect();
                    const tabRect = activeTab.getBoundingClientRect();
                    
                    if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
                        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                    }
                }
            }
        };

        calculateTabSizes();
        
        // Use ResizeObserver for better performance if available
        if (window.ResizeObserver && tabsContainerRef.current) {
            const resizeObserver = new ResizeObserver(calculateTabSizes);
            resizeObserver.observe(tabsContainerRef.current);
            
            return () => resizeObserver.disconnect();
        } else {
            window.addEventListener('resize', calculateTabSizes);
            return () => window.removeEventListener('resize', calculateTabSizes);
        }
    }, [tabs.length, isOverflowing]);

    // Enhanced wheel horizontal scroll support (Shift+wheel, trackpad, or regular wheel)
    useEffect(() => {
        const el = tabsContainerRef.current;
        if (!el) return;
        
        const onWheel = (e: WheelEvent) => {
            // Allow horizontal scrolling with shift+wheel, trackpad horizontal, or when overflowing
            if (e.deltaX !== 0 || e.shiftKey || isOverflowing) {
                e.preventDefault();
                const scrollAmount = e.deltaX || (e.shiftKey ? e.deltaY : e.deltaY * 0.3);
                el.scrollLeft += scrollAmount;
            }
        };
        
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isOverflowing]);

    const scrollByAmount = (dir: 'left' | 'right') => {
        const el = tabsContainerRef.current;
        if (!el) return;
        
        // Calculate scroll amount based on container width for better UX
        const scrollAmount = Math.max(120, Math.floor(el.clientWidth * 0.6));
        const newScrollLeft = dir === 'left' 
            ? Math.max(0, el.scrollLeft - scrollAmount)
            : Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + scrollAmount);
            
        el.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    };

    // Auto-scroll to active tab when it changes
    useEffect(() => {
        if (!isOverflowing || !tabsContainerRef.current) return;
        
        const el = tabsContainerRef.current;
        const activeTab = el.querySelector('.tab.active') as HTMLElement;
        
        if (activeTab) {
            const containerRect = el.getBoundingClientRect();
            const tabRect = activeTab.getBoundingClientRect();
            
            // Check if active tab is fully visible
            const isFullyVisible = tabRect.left >= containerRect.left && tabRect.right <= containerRect.right;
            
            if (!isFullyVisible) {
                // Scroll to center the active tab
                const tabCenter = activeTab.offsetLeft + activeTab.offsetWidth / 2;
                const containerCenter = el.clientWidth / 2;
                el.scrollTo({ left: tabCenter - containerCenter, behavior: 'smooth' });
            }
        }
    }, [activeTabId, isOverflowing]);

    // Apply different styling based on tab count and available space
    const getTabClassName = (tab: Tab) => {
        const baseClass = `tab ${tab.id === activeTabId ? 'active' : ''}`;
        
        if (tabSizeClass === 'overflow') {
            return `${baseClass} very-small overflow`;
        }
        
        return `${baseClass} ${tabSizeClass}`;
    };

    return (
        <div className="tab-bar">
            {isOverflowing && (
                <button className="tabs-scroll-button left" onClick={() => scrollByAmount('left')} aria-label="Scroll tabs left">‹</button>
            )}
            <div 
                className={`tabs-container ${(tabSizeClass === 'overflow' || isOverflowing) ? 'overflowing' : ''}`} 
                ref={tabsContainerRef}
            >
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={getTabClassName(tab)}
                        onClick={() => onTabSelect(tab.id)}
                    >
                        {(tabSizeClass === 'small' || tabSizeClass === 'very-small' || tabSizeClass === 'overflow') ? (
                            <FaFolder className="tab-icon" />
                        ) : null}
                        <span className="tab-title">{tab.title}</span>
                        <button
                            className="tab-close-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                            }}
                        >
                            <FaTimes />
                        </button>
                    </div>
                ))}
                <button className="new-tab-button" onClick={onNewTab}>
                    <FaPlus />
                </button>
            </div>
            {isOverflowing && (
                <button className="tabs-scroll-button right" onClick={() => scrollByAmount('right')} aria-label="Scroll tabs right">›</button>
            )}
            
            <div className="window-controls">
                <ThemeSelector
                    currentTheme={currentTheme}
                    onThemeChange={onThemeChange}
                    isOpen={isThemeSelectorOpen}
                    onToggle={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
                />
                <button className="control-button minimize" onClick={onMinimize}>
                    <FaWindowMinimize />
                </button>
                <button className="control-button maximize" onClick={onMaximize}>
                    {isMaximized ? <FaRegFile /> : <FaWindowMaximize />}
                </button>
                <button className="control-button close" onClick={onClose}>
                    <FaTimes />
                </button>
            </div>
        </div>
    );
};
