import React, { useState, useEffect } from 'react';
import './main.scss';
import './components/TabBar.scss';
import { handleMinimize, handleMaximize, handleClose } from './components/window_handlers/handlers';
import { TabBar } from './components/TabBar';
import { TabContent } from './components/TabContent';

interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
}

export default function Main(): React.JSX.Element {
    const [currentPath, setCurrentPath] = useState('This PC > Documents');
    const [viewMode, setViewMode] = useState('list');
    const [isMaximized, setIsMaximized] = useState(false);
    const [tabs, setTabs] = useState<Tab[]>([
        { id: 'tab-1', title: 'This PC', url: 'home', isActive: true },
        // { id: 'tab-1', title: 'This PC', url: 'internal:home', isActive: true },
        // { id: 'tab-2', title: 'Documents', url: 'C:\\Users\\Documents', isActive: false },
    ]);
    const [activeTabId, setActiveTabId] = useState('tab-1');

    // Window control handlers
    const minimize = () => handleMinimize();
    const maximize = () => handleMaximize(isMaximized, setIsMaximized);
    const close = () => handleClose();

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
        if (tabs.length <= 1) return; // Don't close the last tab
        
        // TODO: Re-enable when internal:home is implemented
        // try {
        //     await window.electronAPI?.tabClose(tabId);
        // } catch (error) {
        //     console.error('Failed to close tab:', error);
        // }
        
        setTabs(prev => {
            const newTabs = prev.filter(tab => tab.id !== tabId);
            if (tabId === activeTabId && newTabs.length > 0) {
                const newActiveTab = newTabs[0];
                setActiveTabId(newActiveTab.id);
                handleTabSelect(newActiveTab.id);
            }
            return newTabs;
        });
    };

    const handleNewTab = async () => {
        // Create new tab locally for now (renders same Main component content)
        const newTabId = `tab-${Date.now()}`;
        const newTab: Tab = {
            id: newTabId,
            title: 'New Tab',
            url: 'home',
            isActive: false
        };
        setTabs(prev => [...prev, newTab]);
        
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

    return (
        <div className="file-explorer">
            {/* Tab Bar replaces Title Bar */}
            <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                isMaximized={isMaximized}
                onTabSelect={handleTabSelect}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
                onMinimize={minimize}
                onMaximize={maximize}
                onClose={close}
            />

            {/* Render content for each tab */}
            {tabs.map((tab) => (
                <TabContent
                    key={tab.id}
                    tabId={tab.id}
                    isActive={tab.id === activeTabId}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />
            ))}
        </div>
    );
}