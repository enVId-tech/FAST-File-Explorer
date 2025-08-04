import React from 'react';
import { FaTimes, FaPlus, FaWindowMinimize, FaWindowMaximize, FaRegFile } from 'react-icons/fa';

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
    return (
        <div className="tab-bar">
            <div className="tabs-container">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                        onClick={() => onTabSelect(tab.id)}
                    >
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
