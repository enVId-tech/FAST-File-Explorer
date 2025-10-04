import React, { useState, useEffect } from 'react';
import { FaThumbtack, FaTimes, FaArrowUp, FaArrowDown, FaPlus, FaTrash, FaFileExport, FaFileImport } from 'react-icons/fa';
import { quickAccessManager, QuickAccessItem } from '../../utils/QuickAccessManager';
import './QuickAccessEditor.scss';

interface QuickAccessEditorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const QuickAccessEditor: React.FC<QuickAccessEditorProps> = ({ isOpen, onClose }) => {
    const [items, setItems] = useState<QuickAccessItem[]>([]);
    const [newFolderPath, setNewFolderPath] = useState('');
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [stats, setStats] = useState(quickAccessManager.getStats());

    useEffect(() => {
        if (isOpen) {
            loadItems();
            const unsubscribe = quickAccessManager.onChange(loadItems);
            return unsubscribe;
        }
    }, [isOpen]);

    const loadItems = () => {
        setItems(quickAccessManager.getItems());
        setStats(quickAccessManager.getStats());
    };

    const handleAddFolder = () => {
        const path = prompt('Enter folder path to add to Quick Access:');
        if (path && path.trim()) {
            const name = path.split('\\').pop() || path;
            quickAccessManager.addFolder(path.trim(), name, '📁', false);
            setNewFolderPath('');
        }
    };

    const handleRemove = (id: string) => {
        if (window.confirm('Remove this folder from Quick Access?')) {
            quickAccessManager.removeFolder(id);
        }
    };

    const handleTogglePin = (id: string) => {
        quickAccessManager.togglePin(id);
    };

    const handleMoveUp = (id: string) => {
        quickAccessManager.moveUp(id);
    };

    const handleMoveDown = (id: string) => {
        quickAccessManager.moveDown(id);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItem(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === targetId) return;

        const fromIndex = items.findIndex(item => item.id === draggedItem);
        const toIndex = items.findIndex(item => item.id === targetId);

        if (fromIndex !== -1 && toIndex !== -1) {
            quickAccessManager.reorderItems(fromIndex, toIndex);
        }

        setDraggedItem(null);
    };

    const handleClearUnpinned = () => {
        if (window.confirm('Remove all unpinned items from Quick Access?')) {
            quickAccessManager.clearUnpinned();
        }
    };

    const handleExport = () => {
        const json = quickAccessManager.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quick-access-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const content = event.target?.result as string;
                        if (content && quickAccessManager.import(content)) {
                            alert('Quick Access settings imported successfully!');
                        } else {
                            alert('Failed to import settings. Please check the file format.');
                        }
                    } catch (error) {
                        console.error('Import error:', error);
                        alert('Failed to import settings.');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    if (!isOpen) return null;

    return (
        <div className="quick-access-editor-overlay">
            <div className="quick-access-editor">
                <div className="editor-header">
                    <h2>Customize Quick Access</h2>
                    <button onClick={onClose} className="close-button">
                        <FaTimes />
                    </button>
                </div>

                <div className="editor-stats">
                    <div className="stat-card">
                        <span className="stat-label">Total Items</span>
                        <span className="stat-value">{stats.totalItems}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Pinned</span>
                        <span className="stat-value">{stats.pinnedItems}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Unpinned</span>
                        <span className="stat-value">{stats.unpinnedItems}</span>
                    </div>
                </div>

                <div className="editor-toolbar">
                    <button onClick={handleAddFolder} className="toolbar-btn primary">
                        <FaPlus /> Add Folder
                    </button>
                    <button onClick={handleClearUnpinned} className="toolbar-btn">
                        <FaTrash /> Clear Unpinned
                    </button>
                    <button onClick={handleExport} className="toolbar-btn">
                        <FaFileExport /> Export
                    </button>
                    <button onClick={handleImport} className="toolbar-btn">
                        <FaFileImport /> Import
                    </button>
                </div>

                <div className="items-list">
                    {items.length === 0 ? (
                        <div className="empty-state">
                            <p>No Quick Access items yet.</p>
                            <p>Click "Add Folder" to get started!</p>
                        </div>
                    ) : (
                        items.map((item, index) => (
                            <div
                                key={item.id}
                                className={`qa-item ${item.isPinned ? 'pinned' : ''} ${draggedItem === item.id ? 'dragging' : ''}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, item.id)}
                            >
                                <div className="item-icon">{item.icon}</div>
                                <div className="item-info">
                                    <div className="item-name">{item.name}</div>
                                    <div className="item-path">{item.path}</div>
                                </div>
                                <div className="item-actions">
                                    <button
                                        onClick={() => handleTogglePin(item.id)}
                                        className={`action-btn ${item.isPinned ? 'pinned' : ''}`}
                                        title={item.isPinned ? 'Unpin' : 'Pin'}
                                    >
                                        <FaThumbtack />
                                    </button>
                                    <button
                                        onClick={() => handleMoveUp(item.id)}
                                        className="action-btn"
                                        disabled={index === 0}
                                        title="Move Up"
                                    >
                                        <FaArrowUp />
                                    </button>
                                    <button
                                        onClick={() => handleMoveDown(item.id)}
                                        className="action-btn"
                                        disabled={index === items.length - 1}
                                        title="Move Down"
                                    >
                                        <FaArrowDown />
                                    </button>
                                    <button
                                        onClick={() => handleRemove(item.id)}
                                        className="action-btn danger"
                                        title="Remove"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="editor-footer">
                    <p className="hint">💡 Tip: Drag items to reorder them</p>
                </div>
            </div>
        </div>
    );
};
