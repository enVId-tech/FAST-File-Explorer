import React, { useEffect, useRef, useState } from 'react';
import { FaTimes, FaPlus, FaWindowMinimize, FaWindowMaximize, FaRegFile, FaFolder } from 'react-icons/fa';

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
    onTabSelect: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onClose: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
    tabs,
    activeTabId,
    isMaximized,
    onTabSelect,
    onTabClose,
    onNewTab,
    onMinimize,
    onMaximize,
    onClose
}) => {
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const [tabSizeClass, setTabSizeClass] = useState<string>('');

    // Calculate tab sizes based on available space
    useEffect(() => {
        const calculateTabSizes = () => {
            if (!tabsContainerRef.current) return;

            const containerWidth = tabsContainerRef.current.offsetWidth;
            const newTabButtonWidth = 48; // Approximate width of new tab button + margin
            const availableWidth = containerWidth - newTabButtonWidth;
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
        };

        calculateTabSizes();
        window.addEventListener('resize', calculateTabSizes);

        return () => {
            window.removeEventListener('resize', calculateTabSizes);
        };
    }, [tabs.length]);

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
            <div 
                className={`tabs-container ${tabSizeClass === 'overflow' ? 'overflowing' : ''}`} 
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
            
            <div className="window-controls">
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
