/**
 * SortPreferencesManager - Manages folder-specific and global sort preferences
 * 
 * Features:
 * - Save sort preferences per folder
 * - Global default sort preferences
 * - Multiple sort criteria (primary, secondary)
 * - Custom sort algorithms (natural, alphabetical, case-sensitive)
 * - Import/Export preferences
 * - Preset sort profiles
 * 
 * @module SortPreferencesManager
 */

import { SortField, SortDirection } from '../components/FileUtils/fileUtils';

export type SortAlgorithm = 'natural' | 'alphabetical' | 'case-sensitive' | 'case-insensitive';

export interface SortCriteria {
    field: SortField;
    direction: SortDirection;
    algorithm?: SortAlgorithm;
}

export interface SortPreference {
    id: string;
    folderPath: string; // Empty string for global default
    primary: SortCriteria;
    secondary?: SortCriteria; // Optional secondary sort
    isGlobal: boolean;
    dateCreated: number;
    dateModified: number;
}

export interface SortProfile {
    id: string;
    name: string;
    description: string;
    primary: SortCriteria;
    secondary?: SortCriteria;
    isBuiltIn: boolean;
}

class SortPreferencesManagerClass {
    private preferences: Map<string, SortPreference> = new Map();
    private globalDefault: SortPreference | null = null;
    private profiles: SortProfile[] = [];
    private changeCallbacks: Array<(preferences: SortPreference[]) => void> = [];

    constructor() {
        this.initializeBuiltInProfiles();
        this.loadFromStorage();
    }

    /**
     * Initialize built-in sort profiles
     */
    private initializeBuiltInProfiles(): void {
        this.profiles = [
            {
                id: 'windows-default',
                name: 'Windows Default',
                description: 'Standard Windows Explorer sorting (natural sort by name)',
                primary: { field: 'name', direction: 'asc', algorithm: 'natural' },
                isBuiltIn: true
            },
            {
                id: 'newest-first',
                name: 'Newest First',
                description: 'Most recently modified files at the top',
                primary: { field: 'modified', direction: 'desc' },
                secondary: { field: 'name', direction: 'asc', algorithm: 'natural' },
                isBuiltIn: true
            },
            {
                id: 'oldest-first',
                name: 'Oldest First',
                description: 'Oldest files at the top',
                primary: { field: 'modified', direction: 'asc' },
                secondary: { field: 'name', direction: 'asc', algorithm: 'natural' },
                isBuiltIn: true
            },
            {
                id: 'largest-first',
                name: 'Largest First',
                description: 'Largest files at the top',
                primary: { field: 'size', direction: 'desc' },
                secondary: { field: 'name', direction: 'asc', algorithm: 'natural' },
                isBuiltIn: true
            },
            {
                id: 'smallest-first',
                name: 'Smallest First',
                description: 'Smallest files at the top',
                primary: { field: 'size', direction: 'asc' },
                secondary: { field: 'name', direction: 'asc', algorithm: 'natural' },
                isBuiltIn: true
            },
            {
                id: 'type-grouped',
                name: 'Group by Type',
                description: 'Files grouped by extension, then sorted by name',
                primary: { field: 'type', direction: 'asc' },
                secondary: { field: 'name', direction: 'asc', algorithm: 'natural' },
                isBuiltIn: true
            },
            {
                id: 'alphabetical-strict',
                name: 'Alphabetical (Strict)',
                description: 'Pure alphabetical sorting (case-sensitive)',
                primary: { field: 'name', direction: 'asc', algorithm: 'case-sensitive' },
                isBuiltIn: true
            },
            {
                id: 'reverse-alphabetical',
                name: 'Reverse Alphabetical',
                description: 'Z to A sorting',
                primary: { field: 'name', direction: 'desc', algorithm: 'natural' },
                isBuiltIn: true
            }
        ];
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem('sortPreferences');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Load preferences
                if (data.preferences && Array.isArray(data.preferences)) {
                    this.preferences.clear();
                    data.preferences.forEach((pref: SortPreference) => {
                        this.preferences.set(pref.folderPath, pref);
                        if (pref.isGlobal) {
                            this.globalDefault = pref;
                        }
                    });
                }

                // Load custom profiles
                if (data.customProfiles && Array.isArray(data.customProfiles)) {
                    this.profiles = [
                        ...this.profiles.filter(p => p.isBuiltIn),
                        ...data.customProfiles
                    ];
                }
            }

            // Set default global preference if not exists
            if (!this.globalDefault) {
                this.setGlobalDefault({
                    field: 'name',
                    direction: 'asc',
                    algorithm: 'natural'
                });
            }
        } catch (error) {
            console.error('Failed to load sort preferences:', error);
            // Initialize with default
            this.setGlobalDefault({
                field: 'name',
                direction: 'asc',
                algorithm: 'natural'
            });
        }
    }

    /**
     * Save to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = {
                preferences: Array.from(this.preferences.values()),
                customProfiles: this.profiles.filter(p => !p.isBuiltIn),
                lastSaved: Date.now()
            };
            localStorage.setItem('sortPreferences', JSON.stringify(data));
            this.notifyChanges();
        } catch (error) {
            console.error('Failed to save sort preferences:', error);
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `sort_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Normalize folder path for consistent key usage
     */
    private normalizePath(path: string): string {
        return path.toLowerCase().replace(/\\/g, '/').replace(/\/$/, '');
    }

    /**
     * Register change callback
     */
    public onChange(callback: (preferences: SortPreference[]) => void): () => void {
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
        const allPreferences = Array.from(this.preferences.values());
        this.changeCallbacks.forEach(callback => callback(allPreferences));
    }

    /**
     * Set global default sort preference
     */
    public setGlobalDefault(primary: SortCriteria, secondary?: SortCriteria): void {
        this.globalDefault = {
            id: this.generateId(),
            folderPath: '',
            primary,
            secondary,
            isGlobal: true,
            dateCreated: Date.now(),
            dateModified: Date.now()
        };
        this.preferences.set('', this.globalDefault);
        this.saveToStorage();
    }

    /**
     * Get global default preference
     */
    public getGlobalDefault(): SortPreference {
        return this.globalDefault || {
            id: 'default',
            folderPath: '',
            primary: { field: 'name', direction: 'asc', algorithm: 'natural' },
            isGlobal: true,
            dateCreated: Date.now(),
            dateModified: Date.now()
        };
    }

    /**
     * Set folder-specific sort preference
     */
    public setFolderPreference(
        folderPath: string,
        primary: SortCriteria,
        secondary?: SortCriteria
    ): SortPreference {
        const normalizedPath = this.normalizePath(folderPath);
        
        const existing = this.preferences.get(normalizedPath);
        const preference: SortPreference = {
            id: existing?.id || this.generateId(),
            folderPath: normalizedPath,
            primary,
            secondary,
            isGlobal: false,
            dateCreated: existing?.dateCreated || Date.now(),
            dateModified: Date.now()
        };

        this.preferences.set(normalizedPath, preference);
        this.saveToStorage();
        return preference;
    }

    /**
     * Get preference for a specific folder
     * Falls back to global default if no folder-specific preference exists
     */
    public getPreference(folderPath: string): SortPreference {
        const normalizedPath = this.normalizePath(folderPath);
        return this.preferences.get(normalizedPath) || this.getGlobalDefault();
    }

    /**
     * Check if folder has specific preference
     */
    public hasFolderPreference(folderPath: string): boolean {
        const normalizedPath = this.normalizePath(folderPath);
        const pref = this.preferences.get(normalizedPath);
        return pref !== undefined && !pref.isGlobal;
    }

    /**
     * Remove folder-specific preference
     */
    public removeFolderPreference(folderPath: string): boolean {
        const normalizedPath = this.normalizePath(folderPath);
        const pref = this.preferences.get(normalizedPath);
        
        if (pref && !pref.isGlobal) {
            this.preferences.delete(normalizedPath);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Get all folder-specific preferences
     */
    public getAllFolderPreferences(): SortPreference[] {
        return Array.from(this.preferences.values()).filter(p => !p.isGlobal);
    }

    /**
     * Clear all folder-specific preferences
     */
    public clearAllFolderPreferences(): void {
        if (confirm('Clear all folder-specific sort preferences? The global default will be kept.')) {
            const global = this.globalDefault;
            this.preferences.clear();
            if (global) {
                this.preferences.set('', global);
            }
            this.saveToStorage();
        }
    }

    /**
     * Get all profiles (built-in + custom)
     */
    public getProfiles(): SortProfile[] {
        return [...this.profiles];
    }

    /**
     * Get built-in profiles only
     */
    public getBuiltInProfiles(): SortProfile[] {
        return this.profiles.filter(p => p.isBuiltIn);
    }

    /**
     * Get custom profiles only
     */
    public getCustomProfiles(): SortProfile[] {
        return this.profiles.filter(p => !p.isBuiltIn);
    }

    /**
     * Get profile by ID
     */
    public getProfile(id: string): SortProfile | undefined {
        return this.profiles.find(p => p.id === id);
    }

    /**
     * Create custom profile
     */
    public createProfile(
        name: string,
        description: string,
        primary: SortCriteria,
        secondary?: SortCriteria
    ): SortProfile {
        const profile: SortProfile = {
            id: this.generateId(),
            name,
            description,
            primary,
            secondary,
            isBuiltIn: false
        };

        this.profiles.push(profile);
        this.saveToStorage();
        return profile;
    }

    /**
     * Update custom profile
     */
    public updateProfile(
        id: string,
        updates: Partial<Omit<SortProfile, 'id' | 'isBuiltIn'>>
    ): boolean {
        const profile = this.profiles.find(p => p.id === id && !p.isBuiltIn);
        if (!profile) return false;

        Object.assign(profile, updates);
        this.saveToStorage();
        return true;
    }

    /**
     * Delete custom profile
     */
    public deleteProfile(id: string): boolean {
        const index = this.profiles.findIndex(p => p.id === id && !p.isBuiltIn);
        if (index === -1) return false;

        this.profiles.splice(index, 1);
        this.saveToStorage();
        return true;
    }

    /**
     * Apply profile to folder
     */
    public applyProfileToFolder(profileId: string, folderPath: string): boolean {
        const profile = this.getProfile(profileId);
        if (!profile) return false;

        this.setFolderPreference(folderPath, profile.primary, profile.secondary);
        return true;
    }

    /**
     * Apply profile as global default
     */
    public applyProfileAsGlobal(profileId: string): boolean {
        const profile = this.getProfile(profileId);
        if (!profile) return false;

        this.setGlobalDefault(profile.primary, profile.secondary);
        return true;
    }

    /**
     * Get statistics
     */
    public getStats() {
        const allPrefs = Array.from(this.preferences.values());
        const folderPrefs = allPrefs.filter(p => !p.isGlobal);

        const fieldCounts: Record<string, number> = {};
        folderPrefs.forEach(pref => {
            const field = pref.primary.field;
            fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        });

        const algorithmCounts: Record<string, number> = {};
        folderPrefs.forEach(pref => {
            const algo = pref.primary.algorithm || 'natural';
            algorithmCounts[algo] = (algorithmCounts[algo] || 0) + 1;
        });

        return {
            totalPreferences: folderPrefs.length,
            totalProfiles: this.profiles.length,
            customProfiles: this.getCustomProfiles().length,
            builtInProfiles: this.getBuiltInProfiles().length,
            mostUsedField: Object.keys(fieldCounts).reduce((a, b) => 
                fieldCounts[a] > fieldCounts[b] ? a : b, 'name'
            ),
            mostUsedAlgorithm: Object.keys(algorithmCounts).reduce((a, b) => 
                algorithmCounts[a] > algorithmCounts[b] ? a : b, 'natural'
            ),
            fieldBreakdown: fieldCounts,
            algorithmBreakdown: algorithmCounts,
            hasGlobalDefault: this.globalDefault !== null
        };
    }

    /**
     * Export to JSON
     */
    public export(): string {
        return JSON.stringify({
            preferences: Array.from(this.preferences.values()),
            customProfiles: this.profiles.filter(p => !p.isBuiltIn),
            stats: this.getStats(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        }, null, 2);
    }

    /**
     * Import from JSON
     */
    public import(json: string): boolean {
        try {
            const data = JSON.parse(json);
            
            if (!data.preferences || !Array.isArray(data.preferences)) {
                throw new Error('Invalid data format');
            }

            // Import preferences
            this.preferences.clear();
            data.preferences.forEach((pref: SortPreference) => {
                this.preferences.set(pref.folderPath, pref);
                if (pref.isGlobal) {
                    this.globalDefault = pref;
                }
            });

            // Import custom profiles
            if (data.customProfiles && Array.isArray(data.customProfiles)) {
                this.profiles = [
                    ...this.profiles.filter(p => p.isBuiltIn),
                    ...data.customProfiles.filter((p: SortProfile) => !p.isBuiltIn)
                ];
            }

            this.saveToStorage();
            return true;
        } catch (error) {
            console.error('Failed to import sort preferences:', error);
            return false;
        }
    }

    /**
     * Reset to defaults
     */
    public resetToDefaults(): void {
        if (confirm('Reset all sort preferences to defaults? This cannot be undone.')) {
            this.preferences.clear();
            this.profiles = this.profiles.filter(p => p.isBuiltIn);
            this.setGlobalDefault({
                field: 'name',
                direction: 'asc',
                algorithm: 'natural'
            });
            this.saveToStorage();
        }
    }

    /**
     * Compare two sort criteria
     */
    public compareCriteria(a: SortCriteria, b: SortCriteria): boolean {
        return a.field === b.field &&
               a.direction === b.direction &&
               (a.algorithm || 'natural') === (b.algorithm || 'natural');
    }

    /**
     * Compare two preferences
     */
    public comparePreferences(a: SortPreference, b: SortPreference): boolean {
        if (!this.compareCriteria(a.primary, b.primary)) return false;
        
        if (a.secondary && b.secondary) {
            return this.compareCriteria(a.secondary, b.secondary);
        }
        
        return !a.secondary && !b.secondary;
    }

    /**
     * Find matching profile for criteria
     */
    public findMatchingProfile(primary: SortCriteria, secondary?: SortCriteria): SortProfile | undefined {
        return this.profiles.find(profile => {
            if (!this.compareCriteria(profile.primary, primary)) return false;
            
            if (secondary && profile.secondary) {
                return this.compareCriteria(profile.secondary, secondary);
            }
            
            return !secondary && !profile.secondary;
        });
    }
}

// Export singleton instance
export const sortPreferencesManager = new SortPreferencesManagerClass();
