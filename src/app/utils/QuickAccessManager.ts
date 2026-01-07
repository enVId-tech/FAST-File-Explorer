/**
 * QuickAccessManager - Manages Quick Access items (pinned folders, recent locations)
 * 
 * Features:
 * - Add/remove custom folders
 * - Reorder items via drag & drop
 * - Pin/unpin folders
 * - Persist changes to settings
 * - Auto-cleanup of invalid paths
 * 
 * @module QuickAccessManager
 */

import { FileSystemItem } from '../../shared/ipc-channels';

export interface QuickAccessItem {
    id: string;
    name: string;
    path: string;
    icon: string;
    isPinned: boolean;
    order: number;
    dateAdded: number;
    lastAccessed?: number;
}

export interface QuickAccessSettings {
    items: QuickAccessItem[];
    maxItems: number;
    showUnpinnedRecents: boolean;
    autoCleanupInvalidPaths: boolean;
}

class QuickAccessManagerClass {
    private items: QuickAccessItem[] = [];
    private maxItems: number = 20;
    private showUnpinnedRecents: boolean = true;
    private autoCleanupInvalidPaths: boolean = true;
    private changeCallbacks: Array<(items: QuickAccessItem[]) => void> = [];

    constructor() {
        // Don't call loadFromSettings here - it will be called by initialize()
        this.items = [];
    }

    /**
     * Initialize the manager - must be called after construction
     */
    async initialize(): Promise<void> {
        await this.loadFromSettings();
    }

    /**
     * Initialize from settings
     */
    private async loadFromSettings(): Promise<void> {
        try {
            const saved = localStorage.getItem('quickAccessItems');
            if (saved) {
                const data: QuickAccessSettings = JSON.parse(saved);
                this.items = data.items || [];
                this.maxItems = data.maxItems || 20;
                this.showUnpinnedRecents = data.showUnpinnedRecents ?? true;
                this.autoCleanupInvalidPaths = data.autoCleanupInvalidPaths ?? true;
            } else {
                // Initialize with default Quick Access items
                await this.initializeDefaults();
            }
        } catch (error) {
            console.error('Failed to load Quick Access settings:', error);
            await this.initializeDefaults();
        }
    }

    /**
     * Initialize with default Quick Access folders
     */
    private async initializeDefaults(): Promise<void> {
        // Get user home directory from electron API
        let userProfile = 'C:\\Users\\Default';
        
        try {
            // Try to get home directory from known folders
            if (window.electronAPI?.settings?.getKnownFolder) {
                userProfile = await window.electronAPI.settings.getKnownFolder('home');
            }
        } catch (error) {
            console.warn('Failed to get user profile, using default:', error);
        }
        
        const defaults: Omit<QuickAccessItem, 'id' | 'dateAdded'>[] = [
            {
                name: 'Desktop',
                path: `${userProfile}\\Desktop`,
                icon: '🖥️',
                isPinned: true,
                order: 0
            },
            {
                name: 'Documents',
                path: `${userProfile}\\Documents`,
                icon: '📄',
                isPinned: true,
                order: 1
            },
            {
                name: 'Downloads',
                path: `${userProfile}\\Downloads`,
                icon: '📥',
                isPinned: true,
                order: 2
            },
            {
                name: 'Pictures',
                path: `${userProfile}\\Pictures`,
                icon: '🖼️',
                isPinned: true,
                order: 3
            },
            {
                name: 'Music',
                path: `${userProfile}\\Music`,
                icon: '🎵',
                isPinned: true,
                order: 4
            },
            {
                name: 'Videos',
                path: `${userProfile}\\Videos`,
                icon: '🎬',
                isPinned: true,
                order: 5
            }
        ];

        this.items = defaults.map((item, index) => ({
            ...item,
            id: this.generateId(),
            dateAdded: Date.now() - (defaults.length - index) * 86400000 // Stagger dates
        }));

        this.saveToSettings();
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save to settings
     */
    private saveToSettings(): void {
        try {
            const data: QuickAccessSettings = {
                items: this.items,
                maxItems: this.maxItems,
                showUnpinnedRecents: this.showUnpinnedRecents,
                autoCleanupInvalidPaths: this.autoCleanupInvalidPaths
            };
            localStorage.setItem('quickAccessItems', JSON.stringify(data));
            this.notifyChanges();
        } catch (error) {
            console.error('Failed to save Quick Access settings:', error);
        }
    }

    /**
     * Register change callback
     */
    public onChange(callback: (items: QuickAccessItem[]) => void): () => void {
        this.changeCallbacks.push(callback);
        return () => {
            const index = this.changeCallbacks.indexOf(callback);
            if (index > -1) {
                this.changeCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of changes
     */
    private notifyChanges(): void {
        this.changeCallbacks.forEach(callback => callback(this.getItems()));
    }

    /**
     * Add a folder to Quick Access
     */
    public addFolder(path: string, name?: string, icon?: string, pinned: boolean = false): QuickAccessItem | null {
        // Check if already exists
        if (this.items.some(item => item.path === path)) {
            console.warn('Folder already in Quick Access:', path);
            return null;
        }

        // Check max items limit
        const unpinnedItems = this.items.filter(item => !item.isPinned);
        if (!pinned && unpinnedItems.length >= this.maxItems) {
            // Remove oldest unpinned item
            const oldest = unpinnedItems.sort((a, b) => (a.lastAccessed || a.dateAdded) - (b.lastAccessed || b.dateAdded))[0];
            if (oldest) {
                this.removeFolder(oldest.id);
            }
        }

        const item: QuickAccessItem = {
            id: this.generateId(),
            name: name || path.split('\\').pop() || path,
            path,
            icon: icon || '📁',
            isPinned: pinned,
            order: this.items.length,
            dateAdded: Date.now()
        };

        this.items.push(item);
        this.saveToSettings();
        return item;
    }

    /**
     * Remove a folder from Quick Access
     */
    public removeFolder(id: string): boolean {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1) {
            return false;
        }

        this.items.splice(index, 1);
        this.reorderItemsAfterRemoval();
        this.saveToSettings();
        return true;
    }

    /**
     * Reorder items (for drag & drop)
     */
    public reorderItems(fromIndex: number, toIndex: number): boolean {
        if (fromIndex < 0 || fromIndex >= this.items.length ||
            toIndex < 0 || toIndex >= this.items.length) {
            return false;
        }

        const [movedItem] = this.items.splice(fromIndex, 1);
        this.items.splice(toIndex, 0, movedItem);

        // Update order values
        this.items.forEach((item, index) => {
            item.order = index;
        });

        this.saveToSettings();
        return true;
    }

    /**
     * Move item up in the list
     */
    public moveUp(id: string): boolean {
        const index = this.items.findIndex(item => item.id === id);
        if (index <= 0) return false;
        return this.reorderItems(index, index - 1);
    }

    /**
     * Move item down in the list
     */
    public moveDown(id: string): boolean {
        const index = this.items.findIndex(item => item.id === id);
        if (index === -1 || index >= this.items.length - 1) return false;
        return this.reorderItems(index, index + 1);
    }

    /**
     * Toggle pin status
     */
    public togglePin(id: string): boolean {
        const item = this.items.find(item => item.id === id);
        if (!item) return false;

        item.isPinned = !item.isPinned;
        this.saveToSettings();
        return true;
    }

    /**
     * Update last accessed time
     */
    public updateLastAccessed(path: string): void {
        const item = this.items.find(item => item.path === path);
        if (item) {
            item.lastAccessed = Date.now();
            this.saveToSettings();
        }
    }

    /**
     * Get all items (sorted by order)
     */
    public getItems(): QuickAccessItem[] {
        return [...this.items].sort((a, b) => a.order - b.order);
    }

    /**
     * Get pinned items only
     */
    public getPinnedItems(): QuickAccessItem[] {
        return this.getItems().filter(item => item.isPinned);
    }

    /**
     * Get unpinned items only
     */
    public getUnpinnedItems(): QuickAccessItem[] {
        return this.getItems().filter(item => !item.isPinned);
    }

    /**
     * Get item by ID
     */
    public getItem(id: string): QuickAccessItem | undefined {
        return this.items.find(item => item.id === id);
    }

    /**
     * Get item by path
     */
    public getItemByPath(path: string): QuickAccessItem | undefined {
        return this.items.find(item => item.path === path);
    }

    /**
     * Check if path is in Quick Access
     */
    public hasPath(path: string): boolean {
        return this.items.some(item => item.path === path);
    }

    /**
     * Clear all unpinned items
     */
    public clearUnpinned(): void {
        this.items = this.items.filter(item => item.isPinned);
        this.reorderItemsAfterRemoval();
        this.saveToSettings();
    }

    /**
     * Clear all items
     */
    public clearAll(): void {
        this.items = [];
        this.saveToSettings();
    }

    /**
     * Reorder items after removal to maintain sequential order values
     */
    private reorderItemsAfterRemoval(): void {
        this.items.forEach((item, index) => {
            item.order = index;
        });
    }

    /**
     * Validate and clean up invalid paths
     */
    public async cleanupInvalidPaths(): Promise<number> {
        if (!this.autoCleanupInvalidPaths) return 0;

        const invalidItems: string[] = [];

        for (const item of this.items) {
            try {
                // Check if path exists using electronAPI
                const exists = await window.electronAPI?.fs?.directoryExists?.(item.path);
                if (!exists) {
                    invalidItems.push(item.id);
                }
            } catch (error) {
                console.error('Error checking path:', item.path, error);
                invalidItems.push(item.id);
            }
        }

        invalidItems.forEach(id => this.removeFolder(id));
        return invalidItems.length;
    }

    /**
     * Export items as JSON
     */
    public export(): string {
        return JSON.stringify({
            items: this.items,
            maxItems: this.maxItems,
            showUnpinnedRecents: this.showUnpinnedRecents,
            autoCleanupInvalidPaths: this.autoCleanupInvalidPaths,
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import items from JSON
     */
    public import(json: string): boolean {
        try {
            const data = JSON.parse(json);
            if (!data.items || !Array.isArray(data.items)) {
                throw new Error('Invalid data format');
            }

            this.items = data.items;
            this.maxItems = data.maxItems || 20;
            this.showUnpinnedRecents = data.showUnpinnedRecents ?? true;
            this.autoCleanupInvalidPaths = data.autoCleanupInvalidPaths ?? true;
            this.saveToSettings();
            return true;
        } catch (error) {
            console.error('Failed to import Quick Access items:', error);
            return false;
        }
    }

    /**
     * Get statistics
     */
    public getStats() {
        return {
            totalItems: this.items.length,
            pinnedItems: this.items.filter(item => item.isPinned).length,
            unpinnedItems: this.items.filter(item => !item.isPinned).length,
            maxItems: this.maxItems,
            oldestItem: this.items.length > 0 
                ? new Date(Math.min(...this.items.map(item => item.dateAdded)))
                : null,
            newestItem: this.items.length > 0
                ? new Date(Math.max(...this.items.map(item => item.dateAdded)))
                : null
        };
    }

    /**
     * Update settings
     */
    public updateSettings(settings: Partial<QuickAccessSettings>): void {
        if (settings.maxItems !== undefined) {
            this.maxItems = settings.maxItems;
        }
        if (settings.showUnpinnedRecents !== undefined) {
            this.showUnpinnedRecents = settings.showUnpinnedRecents;
        }
        if (settings.autoCleanupInvalidPaths !== undefined) {
            this.autoCleanupInvalidPaths = settings.autoCleanupInvalidPaths;
        }
        this.saveToSettings();
    }

    /**
     * Get current settings
     */
    public getSettings(): QuickAccessSettings {
        return {
            items: this.items,
            maxItems: this.maxItems,
            showUnpinnedRecents: this.showUnpinnedRecents,
            autoCleanupInvalidPaths: this.autoCleanupInvalidPaths
        };
    }
}

// Export singleton instance
export const quickAccessManager = new QuickAccessManagerClass();
