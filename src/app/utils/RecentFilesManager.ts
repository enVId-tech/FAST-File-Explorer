/**
 * RecentFilesManager - Tracks and manages recently accessed files
 * 
 * Features:
 * - Track file access history (open, edit, view)
 * - Filter by file type
 * - Sort by multiple criteria
 * - Clear history
 * - Configurable max entries
 * - Auto-cleanup old entries
 * - Export/Import history
 * 
 * @module RecentFilesManager
 */

import { FileSystemItem } from '../../shared/ipc-channels';

export interface RecentFileEntry {
    id: string;
    path: string;
    name: string;
    type: 'file' | 'directory';
    extension: string;
    lastAccessed: number;
    accessCount: number;
    thumbnail?: string;
    size?: number;
    parentPath: string;
}

export interface RecentFilesSettings {
    maxEntries: number;
    maxAgeDays: number;
    trackDirectories: boolean;
    autoCleanup: boolean;
    groupByType: boolean;
}

export type SortField = 'date' | 'name' | 'type' | 'count' | 'size';
export type SortDirection = 'asc' | 'desc';

class RecentFilesManagerClass {
    private entries: RecentFileEntry[] = [];
    private maxEntries: number = 50;
    private maxAgeDays: number = 30;
    private trackDirectories: boolean = true;
    private autoCleanup: boolean = true;
    private changeCallbacks: Array<(entries: RecentFileEntry[]) => void> = [];

    constructor() {
        this.loadFromStorage();
        if (this.autoCleanup) {
            this.cleanupOldEntries();
        }
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem('recentFiles');
            if (saved) {
                const data = JSON.parse(saved);
                this.entries = data.entries || [];
                this.maxEntries = data.maxEntries || 50;
                this.maxAgeDays = data.maxAgeDays || 30;
                this.trackDirectories = data.trackDirectories ?? true;
                this.autoCleanup = data.autoCleanup ?? true;
            }
        } catch (error) {
            console.error('Failed to load recent files:', error);
            this.entries = [];
        }
    }

    /**
     * Save to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = {
                entries: this.entries,
                maxEntries: this.maxEntries,
                maxAgeDays: this.maxAgeDays,
                trackDirectories: this.trackDirectories,
                autoCleanup: this.autoCleanup,
                lastSaved: Date.now()
            };
            localStorage.setItem('recentFiles', JSON.stringify(data));
            this.notifyChanges();
        } catch (error) {
            console.error('Failed to save recent files:', error);
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `rf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Register change callback
     */
    public onChange(callback: (entries: RecentFileEntry[]) => void): () => void {
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
        this.changeCallbacks.forEach(callback => callback(this.getRecentFiles()));
    }

    /**
     * Add or update file entry
     */
    public addEntry(file: FileSystemItem): RecentFileEntry {
        // Don't track directories if disabled
        if (file.type === 'directory' && !this.trackDirectories) {
            return null as any;
        }

        // Check if entry already exists
        const existingIndex = this.entries.findIndex(entry => entry.path === file.path);

        if (existingIndex > -1) {
            // Update existing entry
            const existing = this.entries[existingIndex];
            existing.lastAccessed = Date.now();
            existing.accessCount++;
            
            // Move to front (most recent)
            this.entries.splice(existingIndex, 1);
            this.entries.unshift(existing);
            
            this.saveToStorage();
            return existing;
        } else {
            // Create new entry
            const entry: RecentFileEntry = {
                id: this.generateId(),
                path: file.path,
                name: file.name,
                type: file.type,
                extension: file.extension || '',
                lastAccessed: Date.now(),
                accessCount: 1,
                size: file.size,
                parentPath: this.getParentPath(file.path)
            };

            // Add to front
            this.entries.unshift(entry);

            // Enforce max entries limit
            if (this.entries.length > this.maxEntries) {
                this.entries = this.entries.slice(0, this.maxEntries);
            }

            this.saveToStorage();
            return entry;
        }
    }

    /**
     * Get parent path from file path
     */
    private getParentPath(filePath: string): string {
        const parts = filePath.split(/[\\/]/);
        parts.pop();
        return parts.join('\\');
    }

    /**
     * Remove entry by ID
     */
    public removeEntry(id: string): boolean {
        const index = this.entries.findIndex(entry => entry.id === id);
        if (index === -1) return false;

        this.entries.splice(index, 1);
        this.saveToStorage();
        return true;
    }

    /**
     * Remove entry by path
     */
    public removeByPath(path: string): boolean {
        const index = this.entries.findIndex(entry => entry.path === path);
        if (index === -1) return false;

        this.entries.splice(index, 1);
        this.saveToStorage();
        return true;
    }

    /**
     * Clear all history
     */
    public clearHistory(): void {
        if (confirm('Are you sure you want to clear all recent files history?')) {
            this.entries = [];
            this.saveToStorage();
        }
    }

    /**
     * Clear all history without confirmation (for programmatic use)
     */
    public clearHistoryForce(): void {
        this.entries = [];
        this.saveToStorage();
    }

    /**
     * Get all recent files
     */
    public getRecentFiles(limit?: number): RecentFileEntry[] {
        const files = [...this.entries];
        return limit ? files.slice(0, limit) : files;
    }

    /**
     * Get recent files by type
     */
    public getByType(type: string): RecentFileEntry[] {
        return this.entries.filter(entry => {
            if (type === 'folders') return entry.type === 'directory';
            if (type === 'images') return this.isImageFile(entry.extension);
            if (type === 'documents') return this.isDocumentFile(entry.extension);
            if (type === 'videos') return this.isVideoFile(entry.extension);
            if (type === 'audio') return this.isAudioFile(entry.extension);
            if (type === 'archives') return this.isArchiveFile(entry.extension);
            if (type === 'code') return this.isCodeFile(entry.extension);
            return true;
        });
    }

    /**
     * File type checkers
     */
    private isImageFile(ext: string): boolean {
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.ico'].includes(ext.toLowerCase());
    }

    private isDocumentFile(ext: string): boolean {
        return ['.doc', '.docx', '.pdf', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext.toLowerCase());
    }

    private isVideoFile(ext: string): boolean {
        return ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'].includes(ext.toLowerCase());
    }

    private isAudioFile(ext: string): boolean {
        return ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'].includes(ext.toLowerCase());
    }

    private isArchiveFile(ext: string): boolean {
        return ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'].includes(ext.toLowerCase());
    }

    private isCodeFile(ext: string): boolean {
        return ['.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.json', '.xml', '.sql', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.php'].includes(ext.toLowerCase());
    }

    /**
     * Get file type category
     */
    public getFileTypeCategory(entry: RecentFileEntry): string {
        if (entry.type === 'directory') return 'folder';
        if (this.isImageFile(entry.extension)) return 'image';
        if (this.isDocumentFile(entry.extension)) return 'document';
        if (this.isVideoFile(entry.extension)) return 'video';
        if (this.isAudioFile(entry.extension)) return 'audio';
        if (this.isArchiveFile(entry.extension)) return 'archive';
        if (this.isCodeFile(entry.extension)) return 'code';
        return 'other';
    }

    /**
     * Sort entries
     */
    public sortBy(field: SortField, direction: SortDirection = 'desc'): RecentFileEntry[] {
        const sorted = [...this.entries].sort((a, b) => {
            let comparison = 0;

            switch (field) {
                case 'date':
                    comparison = a.lastAccessed - b.lastAccessed;
                    break;
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'type':
                    const typeA = this.getFileTypeCategory(a);
                    const typeB = this.getFileTypeCategory(b);
                    comparison = typeA.localeCompare(typeB);
                    break;
                case 'count':
                    comparison = a.accessCount - b.accessCount;
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
            }

            return direction === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }

    /**
     * Get grouped by type
     */
    public getGroupedByType(): Record<string, RecentFileEntry[]> {
        const grouped: Record<string, RecentFileEntry[]> = {};

        this.entries.forEach(entry => {
            const category = this.getFileTypeCategory(entry);
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(entry);
        });

        return grouped;
    }

    /**
     * Search recent files
     */
    public search(query: string): RecentFileEntry[] {
        const lowerQuery = query.toLowerCase();
        return this.entries.filter(entry =>
            entry.name.toLowerCase().includes(lowerQuery) ||
            entry.path.toLowerCase().includes(lowerQuery) ||
            entry.extension.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Clean up old entries
     */
    public cleanupOldEntries(): number {
        const maxAge = this.maxAgeDays * 24 * 60 * 60 * 1000; // Convert days to ms
        const cutoffDate = Date.now() - maxAge;

        const originalLength = this.entries.length;
        this.entries = this.entries.filter(entry => entry.lastAccessed > cutoffDate);

        const removed = originalLength - this.entries.length;
        if (removed > 0) {
            this.saveToStorage();
        }

        return removed;
    }

    /**
     * Get statistics
     */
    public getStats() {
        const totalFiles = this.entries.filter(e => e.type === 'file').length;
        const totalFolders = this.entries.filter(e => e.type === 'directory').length;
        const totalAccesses = this.entries.reduce((sum, e) => sum + e.accessCount, 0);
        const mostAccessed = this.entries.length > 0 
            ? this.entries.reduce((max, e) => e.accessCount > max.accessCount ? e : max, this.entries[0])
            : null;
        const recentlyAccessed = this.entries.length > 0
            ? this.entries.reduce((latest, e) => e.lastAccessed > latest.lastAccessed ? e : latest, this.entries[0])
            : null;

        const typeBreakdown = this.getGroupedByType();
        const typeCounts: Record<string, number> = {};
        Object.keys(typeBreakdown).forEach(type => {
            typeCounts[type] = typeBreakdown[type].length;
        });

        return {
            totalEntries: this.entries.length,
            totalFiles,
            totalFolders,
            totalAccesses,
            averageAccessCount: this.entries.length > 0 ? totalAccesses / this.entries.length : 0,
            mostAccessed: mostAccessed ? {
                name: mostAccessed.name,
                path: mostAccessed.path,
                count: mostAccessed.accessCount
            } : null,
            recentlyAccessed: recentlyAccessed ? {
                name: recentlyAccessed.name,
                path: recentlyAccessed.path,
                date: new Date(recentlyAccessed.lastAccessed)
            } : null,
            typeBreakdown: typeCounts,
            oldestEntry: this.entries.length > 0
                ? new Date(Math.min(...this.entries.map(e => e.lastAccessed)))
                : null,
            newestEntry: this.entries.length > 0
                ? new Date(Math.max(...this.entries.map(e => e.lastAccessed)))
                : null
        };
    }

    /**
     * Export to JSON
     */
    public export(): string {
        return JSON.stringify({
            entries: this.entries,
            settings: {
                maxEntries: this.maxEntries,
                maxAgeDays: this.maxAgeDays,
                trackDirectories: this.trackDirectories,
                autoCleanup: this.autoCleanup
            },
            stats: this.getStats(),
            exportDate: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import from JSON
     */
    public import(json: string): boolean {
        try {
            const data = JSON.parse(json);
            if (!data.entries || !Array.isArray(data.entries)) {
                throw new Error('Invalid data format');
            }

            this.entries = data.entries;
            if (data.settings) {
                this.maxEntries = data.settings.maxEntries || 50;
                this.maxAgeDays = data.settings.maxAgeDays || 30;
                this.trackDirectories = data.settings.trackDirectories ?? true;
                this.autoCleanup = data.settings.autoCleanup ?? true;
            }

            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Failed to import recent files:', error);
            return false;
        }
    }

    /**
     * Update settings
     */
    public updateSettings(settings: Partial<RecentFilesSettings>): void {
        if (settings.maxEntries !== undefined) {
            this.maxEntries = settings.maxEntries;
            // Trim entries if new max is lower
            if (this.entries.length > this.maxEntries) {
                this.entries = this.entries.slice(0, this.maxEntries);
            }
        }
        if (settings.maxAgeDays !== undefined) {
            this.maxAgeDays = settings.maxAgeDays;
        }
        if (settings.trackDirectories !== undefined) {
            this.trackDirectories = settings.trackDirectories;
        }
        if (settings.autoCleanup !== undefined) {
            this.autoCleanup = settings.autoCleanup;
        }
        this.saveToStorage();
    }

    /**
     * Get current settings
     */
    public getSettings(): RecentFilesSettings {
        return {
            maxEntries: this.maxEntries,
            maxAgeDays: this.maxAgeDays,
            trackDirectories: this.trackDirectories,
            autoCleanup: this.autoCleanup,
            groupByType: false // UI preference, not stored
        };
    }

    /**
     * Check if path exists in recent files
     */
    public hasPath(path: string): boolean {
        return this.entries.some(entry => entry.path === path);
    }

    /**
     * Get entry by path
     */
    public getByPath(path: string): RecentFileEntry | undefined {
        return this.entries.find(entry => entry.path === path);
    }
}

// Export singleton instance
export const recentFilesManager = new RecentFilesManagerClass();
