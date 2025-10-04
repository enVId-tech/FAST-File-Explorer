/**
 * KeyboardShortcuts - Standard keyboard shortcuts for file explorer
 * Implements F2 (rename), Ctrl+C/V/X (clipboard), Delete, etc.
 */

export interface KeyboardShortcutHandlers {
    onRename?: (selectedFiles: string[]) => void;
    onCopy?: (selectedFiles: string[]) => void;
    onCut?: (selectedFiles: string[]) => void;
    onPaste?: () => void;
    onDelete?: (selectedFiles: string[]) => void;
    onSelectAll?: () => void;
    onRefresh?: () => void;
    onNewFolder?: () => void;
    onNewFile?: () => void;
    onSearch?: () => void;
    onNavigateUp?: () => void;
    onNavigateBack?: () => void;
    onNavigateForward?: () => void;
    onOpenProperties?: (selectedFiles: string[]) => void;
    onViewToggle?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onZoomReset?: () => void;
}

export class KeyboardShortcutManager {
    private handlers: KeyboardShortcutHandlers = {};
    private isEnabled = true;
    private selectedFiles: string[] = [];

    constructor(handlers?: KeyboardShortcutHandlers) {
        if (handlers) {
            this.handlers = handlers;
        }
    }

    /**
     * Register keyboard shortcut handlers
     */
    setHandlers(handlers: KeyboardShortcutHandlers): void {
        this.handlers = { ...this.handlers, ...handlers };
    }

    /**
     * Update selected files (needed for context-dependent shortcuts)
     */
    setSelectedFiles(files: string[]): void {
        this.selectedFiles = files;
    }

    /**
     * Enable/disable all shortcuts
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Handle keyboard event
     * Returns true if the event was handled, false otherwise
     */
    handleKeyDown(event: KeyboardEvent): boolean {
        if (!this.isEnabled) return false;

        // Don't handle shortcuts when typing in inputs/textareas
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            // Allow some shortcuts even in inputs (like Ctrl+A, Ctrl+C, etc.)
            if (!event.ctrlKey && !event.metaKey) {
                return false;
            }
        }

        const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
        const cmdKey = ctrlKey || metaKey; // Support both Ctrl and Cmd (Mac)

        // F2 - Rename
        if (key === 'F2' && !cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onRename && this.selectedFiles.length > 0) {
                event.preventDefault();
                this.handlers.onRename(this.selectedFiles);
                return true;
            }
        }

        // Delete - Delete selected files
        if (key === 'Delete' && !cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onDelete && this.selectedFiles.length > 0) {
                event.preventDefault();
                this.handlers.onDelete(this.selectedFiles);
                return true;
            }
        }

        // Ctrl+C - Copy
        if (key === 'c' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onCopy && this.selectedFiles.length > 0) {
                event.preventDefault();
                this.handlers.onCopy(this.selectedFiles);
                return true;
            }
        }

        // Ctrl+X - Cut
        if (key === 'x' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onCut && this.selectedFiles.length > 0) {
                event.preventDefault();
                this.handlers.onCut(this.selectedFiles);
                return true;
            }
        }

        // Ctrl+V - Paste
        if (key === 'v' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onPaste) {
                event.preventDefault();
                this.handlers.onPaste();
                return true;
            }
        }

        // Ctrl+A - Select All
        if (key === 'a' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onSelectAll) {
                event.preventDefault();
                this.handlers.onSelectAll();
                return true;
            }
        }

        // F5 or Ctrl+R - Refresh
        if ((key === 'F5' || (key === 'r' && cmdKey)) && !shiftKey && !altKey) {
            if (this.handlers.onRefresh) {
                event.preventDefault();
                this.handlers.onRefresh();
                return true;
            }
        }

        // Ctrl+Shift+N - New Folder
        if (key === 'n' && cmdKey && shiftKey && !altKey) {
            if (this.handlers.onNewFolder) {
                event.preventDefault();
                this.handlers.onNewFolder();
                return true;
            }
        }

        // Ctrl+N - New File
        if (key === 'n' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onNewFile) {
                event.preventDefault();
                this.handlers.onNewFile();
                return true;
            }
        }

        // Ctrl+F - Search
        if (key === 'f' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onSearch) {
                event.preventDefault();
                this.handlers.onSearch();
                return true;
            }
        }

        // Alt+Up - Navigate up one directory
        if (key === 'ArrowUp' && !cmdKey && !shiftKey && altKey) {
            if (this.handlers.onNavigateUp) {
                event.preventDefault();
                this.handlers.onNavigateUp();
                return true;
            }
        }

        // Alt+Left - Navigate back
        if (key === 'ArrowLeft' && !cmdKey && !shiftKey && altKey) {
            if (this.handlers.onNavigateBack) {
                event.preventDefault();
                this.handlers.onNavigateBack();
                return true;
            }
        }

        // Alt+Right - Navigate forward
        if (key === 'ArrowRight' && !cmdKey && !shiftKey && altKey) {
            if (this.handlers.onNavigateForward) {
                event.preventDefault();
                this.handlers.onNavigateForward();
                return true;
            }
        }

        // Alt+Enter - Properties
        if (key === 'Enter' && !cmdKey && !shiftKey && altKey) {
            if (this.handlers.onOpenProperties && this.selectedFiles.length > 0) {
                event.preventDefault();
                this.handlers.onOpenProperties(this.selectedFiles);
                return true;
            }
        }

        // Ctrl+1/2/3/4 - View mode toggle (list/details/icons/tiles)
        if (key >= '1' && key <= '4' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onViewToggle) {
                event.preventDefault();
                this.handlers.onViewToggle();
                return true;
            }
        }

        // Ctrl+Plus/Equals - Zoom in
        if ((key === '+' || key === '=') && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onZoomIn) {
                event.preventDefault();
                this.handlers.onZoomIn();
                return true;
            }
        }

        // Ctrl+Minus - Zoom out
        if (key === '-' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onZoomOut) {
                event.preventDefault();
                this.handlers.onZoomOut();
                return true;
            }
        }

        // Ctrl+0 - Reset zoom
        if (key === '0' && cmdKey && !shiftKey && !altKey) {
            if (this.handlers.onZoomReset) {
                event.preventDefault();
                this.handlers.onZoomReset();
                return true;
            }
        }

        return false;
    }

    /**
     * Get list of all registered shortcuts
     */
    getShortcuts(): Array<{ keys: string; description: string; handler: string }> {
        return [
            { keys: 'F2', description: 'Rename selected file(s)', handler: 'onRename' },
            { keys: 'Delete', description: 'Delete selected file(s)', handler: 'onDelete' },
            { keys: 'Ctrl+C', description: 'Copy selected file(s)', handler: 'onCopy' },
            { keys: 'Ctrl+X', description: 'Cut selected file(s)', handler: 'onCut' },
            { keys: 'Ctrl+V', description: 'Paste file(s)', handler: 'onPaste' },
            { keys: 'Ctrl+A', description: 'Select all files', handler: 'onSelectAll' },
            { keys: 'F5', description: 'Refresh current folder', handler: 'onRefresh' },
            { keys: 'Ctrl+R', description: 'Refresh current folder', handler: 'onRefresh' },
            { keys: 'Ctrl+Shift+N', description: 'New folder', handler: 'onNewFolder' },
            { keys: 'Ctrl+N', description: 'New file', handler: 'onNewFile' },
            { keys: 'Ctrl+F', description: 'Focus search', handler: 'onSearch' },
            { keys: 'Alt+Up', description: 'Navigate up one directory', handler: 'onNavigateUp' },
            { keys: 'Alt+Left', description: 'Navigate back', handler: 'onNavigateBack' },
            { keys: 'Alt+Right', description: 'Navigate forward', handler: 'onNavigateForward' },
            { keys: 'Alt+Enter', description: 'Show properties', handler: 'onOpenProperties' },
            { keys: 'Ctrl+1-4', description: 'Change view mode', handler: 'onViewToggle' },
            { keys: 'Ctrl++', description: 'Zoom in', handler: 'onZoomIn' },
            { keys: 'Ctrl+-', description: 'Zoom out', handler: 'onZoomOut' },
            { keys: 'Ctrl+0', description: 'Reset zoom', handler: 'onZoomReset' },
        ];
    }

    /**
     * Dispose of the shortcut manager
     */
    dispose(): void {
        this.handlers = {};
        this.selectedFiles = [];
        this.isEnabled = false;
    }
}

// React hook for easy integration
export const useKeyboardShortcuts = (
    handlers: KeyboardShortcutHandlers,
    selectedFiles: string[] = [],
    enabled = true
): void => {
    React.useEffect(() => {
        const manager = new KeyboardShortcutManager(handlers);
        manager.setSelectedFiles(selectedFiles);
        manager.setEnabled(enabled);

        const handleKeyDown = (event: KeyboardEvent) => {
            manager.handleKeyDown(event);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            manager.dispose();
        };
    }, [handlers, selectedFiles, enabled]);
};

// Export React for the hook
import React from 'react';
