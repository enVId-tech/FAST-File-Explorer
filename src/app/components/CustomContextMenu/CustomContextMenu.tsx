import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    FaCopy, FaCut, FaPaste, FaTrash, FaEdit, FaShare, FaDownload, 
    FaCompress, FaInfoCircle, FaLock, FaEye, FaStar, FaLink,
    FaFolder, FaFolderPlus, FaFile, FaImage, FaCode, FaMusic,
    FaVideo, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint
} from 'react-icons/fa';
import { FileSystemItem } from '../../../shared/ipc-channels';
import './CustomContextMenu.scss';

interface ContextMenuItem {
    id: string;
    label: string;
    icon: React.ReactElement;
    action: () => void;
    disabled?: boolean;
    separator?: boolean;
    submenu?: ContextMenuItem[];
}

interface CustomContextMenuProps {
    isVisible: boolean;
    position: { x: number; y: number };
    selectedItems: FileSystemItem[];
    onClose: () => void;
    onAction: (action: string, items: FileSystemItem[]) => void;
}

export const CustomContextMenu: React.FC<CustomContextMenuProps> = ({
    isVisible,
    position,
    selectedItems,
    onClose,
    onAction
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const [submenuPosition, setSubmenuPosition] = useState({ x: 0, y: 0 });

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('contextmenu', (e) => e.preventDefault());
        };
    }, [isVisible, onClose]);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isVisible, onClose]);

    const handleAction = useCallback((action: string) => {
        onAction(action, selectedItems);
        onClose();
    }, [onAction, selectedItems, onClose]);

    const handleSubmenuEnter = useCallback((itemId: string, event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        setActiveSubmenu(itemId);
        setSubmenuPosition({
            x: rect.right,
            y: rect.top
        });
    }, []);

    const handleSubmenuLeave = useCallback(() => {
        setActiveSubmenu(null);
    }, []);

    if (!isVisible) return null;

    const isMultipleSelection = selectedItems.length > 1;
    const hasDirectories = selectedItems.some(item => item.type === 'directory');
    const hasFiles = selectedItems.some(item => item.type === 'file');
    const allFiles = selectedItems.every(item => item.type === 'file');
    const allDirectories = selectedItems.every(item => item.type === 'directory');

    const menuItems: ContextMenuItem[] = [
        // Basic operations
        {
            id: 'open',
            label: hasDirectories ? 'Open' : 'Open',
            icon: <FaFolder />,
            action: () => handleAction('open'),
            disabled: isMultipleSelection && !allDirectories
        },
        {
            id: 'open-with',
            label: 'Open with',
            icon: <FaEye />,
            action: () => handleAction('open-with'),
            disabled: !allFiles,
            submenu: [
                {
                    id: 'open-notepad',
                    label: 'Notepad',
                    icon: <FaFile />,
                    action: () => handleAction('open-notepad')
                },
                {
                    id: 'open-code',
                    label: 'VS Code',
                    icon: <FaCode />,
                    action: () => handleAction('open-code')
                },
                {
                    id: 'open-default',
                    label: 'Default Program',
                    icon: <FaEye />,
                    action: () => handleAction('open-default')
                }
            ]
        },
        {
            id: 'separator-1',
            label: '',
            icon: <></>,
            action: () => {},
            separator: true
        },
        // Clipboard operations
        {
            id: 'cut',
            label: `Cut${isMultipleSelection ? ` (${selectedItems.length} items)` : ''}`,
            icon: <FaCut />,
            action: () => handleAction('cut')
        },
        {
            id: 'copy',
            label: `Copy${isMultipleSelection ? ` (${selectedItems.length} items)` : ''}`,
            icon: <FaCopy />,
            action: () => handleAction('copy')
        },
        {
            id: 'paste',
            label: 'Paste',
            icon: <FaPaste />,
            action: () => handleAction('paste'),
            disabled: false // Would check clipboard state in real implementation
        },
        {
            id: 'separator-2',
            label: '',
            icon: <></>,
            action: () => {},
            separator: true
        },
        // File operations
        {
            id: 'rename',
            label: 'Rename',
            icon: <FaEdit />,
            action: () => handleAction('rename'),
            disabled: isMultipleSelection
        },
        {
            id: 'delete',
            label: `Delete${isMultipleSelection ? ` (${selectedItems.length} items)` : ''}`,
            icon: <FaTrash />,
            action: () => handleAction('delete')
        },
        {
            id: 'separator-3',
            label: '',
            icon: <></>,
            action: () => {},
            separator: true
        },
        // Advanced operations
        {
            id: 'compress',
            label: 'Add to archive',
            icon: <FaCompress />,
            action: () => handleAction('compress'),
            submenu: [
                {
                    id: 'zip',
                    label: 'Create ZIP archive',
                    icon: <FaCompress />,
                    action: () => handleAction('create-zip')
                },
                {
                    id: '7z',
                    label: 'Create 7Z archive',
                    icon: <FaCompress />,
                    action: () => handleAction('create-7z')
                },
                {
                    id: 'rar',
                    label: 'Create RAR archive',
                    icon: <FaCompress />,
                    action: () => handleAction('create-rar')
                }
            ]
        },
        {
            id: 'share',
            label: 'Share',
            icon: <FaShare />,
            action: () => handleAction('share'),
            submenu: [
                {
                    id: 'share-email',
                    label: 'Email',
                    icon: <FaShare />,
                    action: () => handleAction('share-email')
                },
                {
                    id: 'share-link',
                    label: 'Copy link',
                    icon: <FaLink />,
                    action: () => handleAction('share-link')
                },
                {
                    id: 'share-nearby',
                    label: 'Nearby sharing',
                    icon: <FaShare />,
                    action: () => handleAction('share-nearby')
                }
            ]
        },
        {
            id: 'download',
            label: 'Download',
            icon: <FaDownload />,
            action: () => handleAction('download'),
            disabled: !hasFiles
        },
        {
            id: 'separator-4',
            label: '',
            icon: <></>,
            action: () => {},
            separator: true
        },
        // Organization
        {
            id: 'favorite',
            label: 'Add to favorites',
            icon: <FaStar />,
            action: () => handleAction('add-favorite')
        },
        {
            id: 'new',
            label: 'New',
            icon: <FaFolderPlus />,
            action: () => handleAction('new'),
            submenu: [
                {
                    id: 'new-folder',
                    label: 'Folder',
                    icon: <FaFolder />,
                    action: () => handleAction('new-folder')
                },
                {
                    id: 'new-text',
                    label: 'Text Document',
                    icon: <FaFile />,
                    action: () => handleAction('new-text')
                },
                {
                    id: 'new-word',
                    label: 'Word Document',
                    icon: <FaFileWord />,
                    action: () => handleAction('new-word')
                },
                {
                    id: 'new-excel',
                    label: 'Excel Workbook',
                    icon: <FaFileExcel />,
                    action: () => handleAction('new-excel')
                },
                {
                    id: 'new-powerpoint',
                    label: 'PowerPoint Presentation',
                    icon: <FaFilePowerpoint />,
                    action: () => handleAction('new-powerpoint')
                }
            ]
        },
        {
            id: 'separator-5',
            label: '',
            icon: <></>,
            action: () => {},
            separator: true
        },
        // Properties
        {
            id: 'properties',
            label: 'Properties',
            icon: <FaInfoCircle />,
            action: () => handleAction('properties')
        }
    ];

    // Calculate menu position to keep it on screen
    const getMenuStyle = () => {
        if (!menuRef.current) return { left: position.x, top: position.y };
        
        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = position.x;
        let top = position.y;
        
        // Adjust horizontal position
        if (left + rect.width > viewportWidth) {
            left = viewportWidth - rect.width - 10;
        }
        
        // Adjust vertical position
        if (top + rect.height > viewportHeight) {
            top = viewportHeight - rect.height - 10;
        }
        
        return { left: Math.max(10, left), top: Math.max(10, top) };
    };

    return (
        <div
            ref={menuRef}
            className="custom-context-menu"
            style={getMenuStyle()}
            onContextMenu={(e) => e.preventDefault()}
        >
            {menuItems.map((item, index) => {
                if (item.separator) {
                    return <div key={`separator-${index}`} className="menu-separator" />;
                }
                
                return (
                    <div
                        key={item.id}
                        className={`menu-item ${item.disabled ? 'disabled' : ''} ${item.submenu ? 'has-submenu' : ''}`}
                        onClick={item.disabled ? undefined : item.action}
                        onMouseEnter={item.submenu ? (e) => handleSubmenuEnter(item.id, e) : undefined}
                        onMouseLeave={item.submenu ? handleSubmenuLeave : undefined}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-label">{item.label}</span>
                        {item.submenu && <span className="submenu-arrow">▶</span>}
                        
                        {item.submenu && activeSubmenu === item.id && (
                            <div 
                                className="submenu"
                                style={{
                                    left: submenuPosition.x,
                                    top: submenuPosition.y
                                }}
                            >
                                {item.submenu.map((subItem) => (
                                    <div
                                        key={subItem.id}
                                        className={`menu-item ${subItem.disabled ? 'disabled' : ''}`}
                                        onClick={subItem.disabled ? undefined : subItem.action}
                                    >
                                        <span className="menu-icon">{subItem.icon}</span>
                                        <span className="menu-label">{subItem.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
