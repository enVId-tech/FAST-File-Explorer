/**
 * AdvancedSearchManager - Manages advanced file search operations
 * 
 * Features:
 * - Content search (search inside files)
 * - Regex pattern matching
 * - Multiple criteria search
 * - Save/load search queries
 * - Search history
 * - Export results
 * - Advanced filtering
 * 
 * @module AdvancedSearchManager
 */

import { FileSystemItem } from '../../shared/ipc-channels';

export type SearchCriteria = 'name' | 'content' | 'size' | 'date' | 'type' | 'all';
export type DateRange = { start: Date; end: Date } | null;
export type SizeRange = { min: number; max: number } | null;

export interface SearchQuery {
    id: string;
    name: string;
    criteria: {
        name?: string;
        content?: string;
        useRegex?: boolean;
        caseSensitive?: boolean;
        fileTypes?: string[];
        sizeRange?: SizeRange;
        dateRange?: DateRange;
        dateField?: 'modified' | 'created' | 'accessed';
    };
    scope: 'current' | 'global';
    scopePath?: string;
    timestamp: number;
}

export interface SearchResult {
    item: FileSystemItem;
    matches: SearchMatch[];
    score: number;
}

export interface SearchMatch {
    type: 'name' | 'content' | 'metadata';
    field: string;
    value: string;
    context?: string; // For content matches
    line?: number; // For content matches
}

export interface SearchHistory {
    query: SearchQuery;
    results: number;
    timestamp: number;
}

class AdvancedSearchManagerClass {
    private static instance: AdvancedSearchManagerClass;
    private savedQueries: SearchQuery[] = [];
    private searchHistory: SearchHistory[] = [];
    private maxHistory: number = 100;
    private maxSavedQueries: number = 50;

    private readonly STORAGE_KEY = 'advancedSearch';
    private readonly HISTORY_KEY = 'searchHistory';

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): AdvancedSearchManagerClass {
        if (!AdvancedSearchManagerClass.instance) {
            AdvancedSearchManagerClass.instance = new AdvancedSearchManagerClass();
        }
        return AdvancedSearchManagerClass.instance;
    }

    /**
     * Load data from localStorage
     */
    private loadFromStorage(): void {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                this.savedQueries = data.queries || [];
            }

            const history = localStorage.getItem(this.HISTORY_KEY);
            if (history) {
                this.searchHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Failed to load search data:', error);
        }
    }

    /**
     * Save data to localStorage
     */
    private saveToStorage(): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                queries: this.savedQueries
            }));
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Failed to save search data:', error);
        }
    }

    /**
     * Execute search query
     */
    public async executeSearch(
        query: SearchQuery,
        items: FileSystemItem[]
    ): Promise<SearchResult[]> {
        const results: SearchResult[] = [];

        for (const item of items) {
            const matches = await this.matchItem(item, query);
            if (matches.length > 0) {
                const score = this.calculateScore(matches);
                results.push({ item, matches, score });
            }
        }

        // Sort by score (highest first)
        results.sort((a, b) => b.score - a.score);

        // Add to history
        this.addToHistory(query, results.length);

        return results;
    }

    /**
     * Match item against query criteria
     */
    private async matchItem(
        item: FileSystemItem,
        query: SearchQuery
    ): Promise<SearchMatch[]> {
        const matches: SearchMatch[] = [];
        const criteria = query.criteria;

        // Name matching
        if (criteria.name) {
            const nameMatch = this.matchName(item.name, criteria.name, criteria.useRegex, criteria.caseSensitive);
            if (nameMatch) {
                matches.push(nameMatch);
            }
        }

        // Content matching (for files only)
        if (criteria.content && item.type === 'file') {
            const contentMatches = await this.matchContent(item, criteria.content, criteria.useRegex, criteria.caseSensitive);
            matches.push(...contentMatches);
        }

        // File type matching
        if (criteria.fileTypes && criteria.fileTypes.length > 0) {
            const extension = this.getExtension(item.name);
            if (criteria.fileTypes.includes(extension)) {
                matches.push({
                    type: 'metadata',
                    field: 'type',
                    value: extension
                });
            }
        }

        // Size matching
        if (criteria.sizeRange && item.type === 'file') {
            const size = item.size || 0;
            const range = criteria.sizeRange;
            if (size >= range.min && size <= range.max) {
                matches.push({
                    type: 'metadata',
                    field: 'size',
                    value: `${size} bytes`
                });
            }
        }

        // Date matching
        if (criteria.dateRange) {
            const dateField = criteria.dateField || 'modified';
            const itemDate = this.getItemDate(item, dateField);
            if (itemDate && this.isInDateRange(itemDate, criteria.dateRange)) {
                matches.push({
                    type: 'metadata',
                    field: dateField,
                    value: itemDate.toISOString()
                });
            }
        }

        return matches;
    }

    /**
     * Match item name
     */
    private matchName(
        name: string,
        pattern: string,
        useRegex: boolean = false,
        caseSensitive: boolean = false
    ): SearchMatch | null {
        let isMatch = false;
        
        if (useRegex) {
            try {
                const flags = caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(pattern, flags);
                isMatch = regex.test(name);
            } catch (error) {
                // Invalid regex, fallback to plain text
                isMatch = caseSensitive 
                    ? name.includes(pattern)
                    : name.toLowerCase().includes(pattern.toLowerCase());
            }
        } else {
            isMatch = caseSensitive 
                ? name.includes(pattern)
                : name.toLowerCase().includes(pattern.toLowerCase());
        }

        if (isMatch) {
            return {
                type: 'name',
                field: 'name',
                value: name
            };
        }

        return null;
    }

    /**
     * Match file content (simplified - would need backend support for real implementation)
     */
    private async matchContent(
        item: FileSystemItem,
        pattern: string,
        useRegex: boolean = false,
        caseSensitive: boolean = false
    ): Promise<SearchMatch[]> {
        // Note: Real implementation would use electronAPI to read file contents
        // This is a placeholder that would be implemented with backend support
        
        // For now, only search in text files
        const textExtensions = ['.txt', '.md', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.html', '.json', '.xml', '.csv'];
        const extension = this.getExtension(item.name);
        
        if (!textExtensions.includes(extension)) {
            return [];
        }

        // TODO: Implement with electronAPI.files.readContent(path)
        // For now, return empty array
        return [];
    }

    /**
     * Calculate relevance score
     */
    private calculateScore(matches: SearchMatch[]): number {
        let score = 0;

        for (const match of matches) {
            switch (match.type) {
                case 'name':
                    score += 10; // Name matches are highly relevant
                    break;
                case 'content':
                    score += 5; // Content matches are relevant
                    break;
                case 'metadata':
                    score += 2; // Metadata matches are less relevant
                    break;
            }
        }

        return score;
    }

    /**
     * Get file extension
     */
    private getExtension(filename: string): string {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot).toLowerCase() : '';
    }

    /**
     * Get item date based on field
     */
    private getItemDate(item: FileSystemItem, field: 'modified' | 'created' | 'accessed'): Date | null {
        // Note: FileSystemItem has modified and created fields
        if (field === 'modified' && item.modified) {
            return new Date(item.modified);
        }
        if (field === 'created' && item.created) {
            return new Date(item.created);
        }
        return null;
    }

    /**
     * Check if date is in range
     */
    private isInDateRange(date: Date, range: DateRange): boolean {
        if (!range) return true;
        return date >= range.start && date <= range.end;
    }

    /**
     * Save query
     */
    public saveQuery(query: Omit<SearchQuery, 'id' | 'timestamp'>): SearchQuery {
        const newQuery: SearchQuery = {
            ...query,
            id: this.generateId(),
            timestamp: Date.now()
        };

        this.savedQueries.unshift(newQuery);

        // Limit saved queries
        if (this.savedQueries.length > this.maxSavedQueries) {
            this.savedQueries = this.savedQueries.slice(0, this.maxSavedQueries);
        }

        this.saveToStorage();
        return newQuery;
    }

    /**
     * Delete saved query
     */
    public deleteQuery(id: string): void {
        this.savedQueries = this.savedQueries.filter(q => q.id !== id);
        this.saveToStorage();
    }

    /**
     * Get saved queries
     */
    public getSavedQueries(): SearchQuery[] {
        return [...this.savedQueries];
    }

    /**
     * Get query by ID
     */
    public getQuery(id: string): SearchQuery | undefined {
        return this.savedQueries.find(q => q.id === id);
    }

    /**
     * Add search to history
     */
    private addToHistory(query: SearchQuery, resultCount: number): void {
        const entry: SearchHistory = {
            query,
            results: resultCount,
            timestamp: Date.now()
        };

        this.searchHistory.unshift(entry);

        // Limit history
        if (this.searchHistory.length > this.maxHistory) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistory);
        }

        this.saveToStorage();
    }

    /**
     * Get search history
     */
    public getSearchHistory(limit?: number): SearchHistory[] {
        const history = [...this.searchHistory];
        return limit ? history.slice(0, limit) : history;
    }

    /**
     * Clear search history
     */
    public clearHistory(): void {
        this.searchHistory = [];
        this.saveToStorage();
    }

    /**
     * Export results to CSV
     */
    public exportToCSV(results: SearchResult[]): string {
        const headers = ['Name', 'Path', 'Type', 'Size', 'Modified', 'Score', 'Matches'];
        const rows: string[][] = [headers];

        for (const result of results) {
            const item = result.item;
            const matchTypes = result.matches.map(m => m.type).join(', ');
            
            rows.push([
                item.name,
                item.path,
                item.type === 'directory' ? 'Folder' : 'File',
                item.size ? `${item.size}` : '0',
                item.modified ? new Date(item.modified).toLocaleString() : '',
                `${result.score}`,
                matchTypes
            ]);
        }

        return rows.map(row => 
            row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    /**
     * Get search suggestions based on history
     */
    public getSuggestions(): SearchQuery[] {
        // Get most recent unique queries
        const seen = new Set<string>();
        const suggestions: SearchQuery[] = [];

        for (const entry of this.searchHistory) {
            const key = JSON.stringify(entry.query.criteria);
            if (!seen.has(key) && suggestions.length < 5) {
                seen.add(key);
                suggestions.push(entry.query);
            }
        }

        return suggestions;
    }

    /**
     * Create quick search query
     */
    public createQuickQuery(
        searchText: string,
        scope: 'current' | 'global' = 'current',
        scopePath?: string
    ): SearchQuery {
        return {
            id: this.generateId(),
            name: `Quick: ${searchText}`,
            criteria: {
                name: searchText,
                caseSensitive: false,
                useRegex: false
            },
            scope,
            scopePath,
            timestamp: Date.now()
        };
    }

    /**
     * Validate regex pattern
     */
    public validateRegex(pattern: string): { valid: boolean; error?: string } {
        try {
            new RegExp(pattern);
            return { valid: true };
        } catch (error) {
            return { 
                valid: false, 
                error: error instanceof Error ? error.message : 'Invalid regex pattern'
            };
        }
    }

    /**
     * Get file type categories
     */
    public getFileTypeCategories(): { [category: string]: string[] } {
        return {
            'Documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
            'Images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp'],
            'Videos': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
            'Audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
            'Archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
            'Code': ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go'],
            'Web': ['.html', '.htm', '.css', '.scss', '.sass', '.less', '.xml', '.json'],
            'Data': ['.csv', '.xlsx', '.xls', '.db', '.sql', '.json', '.xml']
        };
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Import queries from JSON
     */
    public importQueries(json: string): { success: boolean; imported: number; error?: string } {
        try {
            const data = JSON.parse(json);
            if (!Array.isArray(data)) {
                return { success: false, imported: 0, error: 'Invalid format' };
            }

            let imported = 0;
            for (const query of data) {
                if (query.name && query.criteria) {
                    this.savedQueries.unshift({
                        ...query,
                        id: this.generateId(),
                        timestamp: Date.now()
                    });
                    imported++;
                }
            }

            this.saveToStorage();
            return { success: true, imported };
        } catch (error) {
            return { 
                success: false, 
                imported: 0, 
                error: error instanceof Error ? error.message : 'Import failed'
            };
        }
    }

    /**
     * Export queries to JSON
     */
    public exportQueries(): string {
        return JSON.stringify(this.savedQueries, null, 2);
    }

    /**
     * Clear all saved queries
     */
    public clearSavedQueries(): void {
        this.savedQueries = [];
        this.saveToStorage();
    }
}

// Export singleton instance
export const advancedSearchManager = AdvancedSearchManagerClass.getInstance();
