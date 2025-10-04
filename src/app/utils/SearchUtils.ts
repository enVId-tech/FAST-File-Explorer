/**
 * SearchUtils - Optimized search utilities with debouncing and binary search
 */

import { FileSystemItem } from 'shared/fs-items';

/**
 * Debounce function for search input
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return function (...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Binary search for sorted file list (O(log n))
 * Assumes items are sorted by name
 */
export function binarySearchFiles(
    items: FileSystemItem[],
    searchTerm: string,
    startIndex = 0,
    endIndex = items.length - 1
): number {
    if (startIndex > endIndex) return -1;

    const midIndex = Math.floor((startIndex + endIndex) / 2);
    const midItem = items[midIndex];
    const comparison = midItem.name.toLowerCase().localeCompare(searchTerm.toLowerCase());

    if (comparison === 0) {
        return midIndex;
    } else if (comparison > 0) {
        return binarySearchFiles(items, searchTerm, startIndex, midIndex - 1);
    } else {
        return binarySearchFiles(items, searchTerm, midIndex + 1, endIndex);
    }
}

/**
 * Find all files matching search term (prefix match)
 * Uses binary search to find starting position, then linear scan
 */
export function searchFilesByPrefix(
    items: FileSystemItem[],
    searchTerm: string
): FileSystemItem[] {
    if (!searchTerm) return items;
    
    const lowerSearch = searchTerm.toLowerCase();
    
    // If items aren't sorted, fall back to linear search
    if (!isSorted(items)) {
        return items.filter(item => 
            item.name.toLowerCase().includes(lowerSearch)
        );
    }

    // Find first matching item using binary search
    let start = 0;
    let end = items.length - 1;
    let firstMatch = -1;

    while (start <= end) {
        const mid = Math.floor((start + end) / 2);
        const itemName = items[mid].name.toLowerCase();
        
        if (itemName.startsWith(lowerSearch)) {
            firstMatch = mid;
            end = mid - 1; // Continue searching left for first match
        } else if (itemName < lowerSearch) {
            start = mid + 1;
        } else {
            end = mid - 1;
        }
    }

    if (firstMatch === -1) {
        // No exact prefix match, fall back to contains search
        return items.filter(item => 
            item.name.toLowerCase().includes(lowerSearch)
        );
    }

    // Collect all matching items from first match onward
    const results: FileSystemItem[] = [];
    for (let i = firstMatch; i < items.length; i++) {
        if (items[i].name.toLowerCase().startsWith(lowerSearch)) {
            results.push(items[i]);
        } else {
            break; // No more matches
        }
    }

    return results;
}

/**
 * Check if items are sorted by name
 */
function isSorted(items: FileSystemItem[]): boolean {
    for (let i = 1; i < items.length; i++) {
        if (items[i].name.toLowerCase() < items[i - 1].name.toLowerCase()) {
            return false;
        }
    }
    return true;
}

/**
 * Fuzzy search for files (matches characters in order)
 */
export function fuzzySearchFiles(
    items: FileSystemItem[],
    searchTerm: string
): FileSystemItem[] {
    if (!searchTerm) return items;
    
    const lowerSearch = searchTerm.toLowerCase();
    
    return items.filter(item => {
        const lowerName = item.name.toLowerCase();
        let searchIndex = 0;
        
        for (let i = 0; i < lowerName.length && searchIndex < lowerSearch.length; i++) {
            if (lowerName[i] === lowerSearch[searchIndex]) {
                searchIndex++;
            }
        }
        
        return searchIndex === lowerSearch.length;
    });
}

/**
 * Advanced search with scoring
 */
interface SearchResult {
    item: FileSystemItem;
    score: number;
}

export function advancedSearchFiles(
    items: FileSystemItem[],
    searchTerm: string
): FileSystemItem[] {
    if (!searchTerm) return items;
    
    const lowerSearch = searchTerm.toLowerCase();
    const results: SearchResult[] = [];
    
    for (const item of items) {
        const lowerName = item.name.toLowerCase();
        let score = 0;
        
        // Exact match: highest score
        if (lowerName === lowerSearch) {
            score = 1000;
        }
        // Starts with search term: high score
        else if (lowerName.startsWith(lowerSearch)) {
            score = 500;
        }
        // Contains search term: medium score
        else if (lowerName.includes(lowerSearch)) {
            score = 100;
            // Bonus for word boundary match
            const words = lowerName.split(/[\s\-_]/);
            for (const word of words) {
                if (word.startsWith(lowerSearch)) {
                    score += 200;
                    break;
                }
            }
        }
        // Fuzzy match: low score
        else {
            let searchIndex = 0;
            let consecutiveMatches = 0;
            
            for (let i = 0; i < lowerName.length && searchIndex < lowerSearch.length; i++) {
                if (lowerName[i] === lowerSearch[searchIndex]) {
                    searchIndex++;
                    consecutiveMatches++;
                } else {
                    consecutiveMatches = 0;
                }
            }
            
            if (searchIndex === lowerSearch.length) {
                score = 10 + consecutiveMatches * 5;
            }
        }
        
        if (score > 0) {
            results.push({ item, score });
        }
    }
    
    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    return results.map(r => r.item);
}

/**
 * Highlight matching text in search results
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Create debounced search function
 */
export function createDebouncedSearch<T>(
    searchFunction: (items: T[], term: string) => T[],
    delay = 300
): (items: T[], term: string, callback: (results: T[]) => void) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (items: T[], term: string, callback: (results: T[]) => void) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const results = searchFunction(items, term);
            callback(results);
        }, delay);
    };
}

/**
 * Search with caching
 */
export class SearchCache {
    private cache = new Map<string, FileSystemItem[]>();
    private maxSize = 50;
    
    get(term: string): FileSystemItem[] | undefined {
        return this.cache.get(term.toLowerCase());
    }
    
    set(term: string, results: FileSystemItem[]): void {
        const key = term.toLowerCase();
        
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry (first in map)
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        
        this.cache.set(key, results);
    }
    
    clear(): void {
        this.cache.clear();
    }
    
    has(term: string): boolean {
        return this.cache.has(term.toLowerCase());
    }
}
