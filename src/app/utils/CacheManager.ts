/**
 * CacheManager - Comprehensive caching system for FAST File Explorer
 * Handles file metadata, folder contents, drive info, and recent files
 * Features: LRU eviction, size limits, TTL, persistence
 */

import { FileSystemItem } from 'shared/fs-items';
import { Drive } from 'shared/file-data';

// Cache configuration
export interface CacheConfig {
    maxSize: number; // Maximum cache size in MB
    maxEntries: number; // Maximum number of entries per cache type
    defaultTTL: number; // Default time-to-live in milliseconds
    persistToLocalStorage: boolean; // Whether to persist cache to localStorage
}

// Default configuration
const DEFAULT_CONFIG: CacheConfig = {
    maxSize: 100, // 100 MB
    maxEntries: 10000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    persistToLocalStorage: true,
};

// Cache entry interface
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    size: number; // Size in bytes
    accessCount: number;
    lastAccess: number;
}

// Cache statistics
export interface CacheStats {
    totalEntries: number;
    totalSize: number; // in bytes
    hitRate: number;
    missRate: number;
    oldestEntry: number | null;
    newestEntry: number | null;
}

type CacheType = 'file' | 'folder' | 'drive' | 'recent' | 'metadata';

class CacheManager {
    private config: CacheConfig;
    
    // Separate caches for different data types
    private fileCache: Map<string, CacheEntry<FileSystemItem>> = new Map();
    private folderCache: Map<string, CacheEntry<FileSystemItem[]>> = new Map();
    private driveCache: Map<string, CacheEntry<Drive>> = new Map();
    private recentCache: Map<string, CacheEntry<FileSystemItem[]>> = new Map();
    private metadataCache: Map<string, CacheEntry<any>> = new Map();
    
    // Statistics
    private hits = 0;
    private misses = 0;
    
    constructor(config: Partial<CacheConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.loadFromLocalStorage();
    }

    /**
     * Get cached file metadata
     */
    getFile(path: string): FileSystemItem | null {
        return this.get('file', path, this.fileCache);
    }

    /**
     * Set file metadata in cache
     */
    setFile(path: string, data: FileSystemItem, ttl?: number): void {
        this.set('file', path, data, this.fileCache, ttl);
    }

    /**
     * Get cached folder contents
     */
    getFolder(path: string): FileSystemItem[] | null {
        return this.get('folder', path, this.folderCache);
    }

    /**
     * Set folder contents in cache
     */
    setFolder(path: string, data: FileSystemItem[], ttl?: number): void {
        this.set('folder', path, data, this.folderCache, ttl);
    }

    /**
     * Get cached drive info
     */
    getDrive(driveLetter: string): Drive | null {
        return this.get('drive', driveLetter, this.driveCache);
    }

    /**
     * Set drive info in cache
     */
    setDrive(driveLetter: string, data: Drive, ttl?: number): void {
        this.set('drive', driveLetter, data, this.driveCache, ttl);
    }

    /**
     * Get cached recent files
     */
    getRecentFiles(): FileSystemItem[] | null {
        return this.get('recent', 'recent-files', this.recentCache);
    }

    /**
     * Set recent files in cache
     */
    setRecentFiles(data: FileSystemItem[], ttl?: number): void {
        this.set('recent', 'recent-files', data, this.recentCache, ttl);
    }

    /**
     * Get custom metadata from cache
     */
    getMetadata(key: string): any | null {
        return this.get('metadata', key, this.metadataCache);
    }

    /**
     * Set custom metadata in cache
     */
    setMetadata(key: string, data: any, ttl?: number): void {
        this.set('metadata', key, data, this.metadataCache, ttl);
    }

    /**
     * Generic get method with LRU tracking
     */
    private get<T>(
        cacheType: CacheType,
        key: string,
        cache: Map<string, CacheEntry<T>>
    ): T | null {
        const entry = cache.get(key);
        
        if (!entry) {
            this.misses++;
            return null;
        }

        // Check if entry is expired
        const now = Date.now();
        const age = now - entry.timestamp;
        
        if (age > this.config.defaultTTL) {
            cache.delete(key);
            this.misses++;
            return null;
        }

        // Update access statistics (LRU)
        entry.accessCount++;
        entry.lastAccess = now;
        this.hits++;

        return entry.data;
    }

    /**
     * Generic set method with size management
     */
    private set<T>(
        cacheType: CacheType,
        key: string,
        data: T,
        cache: Map<string, CacheEntry<T>>,
        ttl?: number
    ): void {
        const size = this.estimateSize(data);
        const now = Date.now();

        const entry: CacheEntry<T> = {
            data,
            timestamp: now,
            size,
            accessCount: 1,
            lastAccess: now,
        };

        // Check if we need to evict entries
        this.evictIfNeeded(cache, size);

        cache.set(key, entry);

        // Persist to localStorage if enabled
        if (this.config.persistToLocalStorage) {
            this.persistToLocalStorage();
        }
    }

    /**
     * Evict least recently used entries if cache is full
     */
    private evictIfNeeded<T>(cache: Map<string, CacheEntry<T>>, newEntrySize: number): void {
        const currentSize = this.getCacheSize(cache);
        const maxSizeBytes = this.config.maxSize * 1024 * 1024;

        // Evict if we're over size limit or entry limit
        while (
            (currentSize + newEntrySize > maxSizeBytes || cache.size >= this.config.maxEntries) &&
            cache.size > 0
        ) {
            const lruKey = this.findLRU(cache);
            if (lruKey) {
                cache.delete(lruKey);
            } else {
                break;
            }
        }
    }

    /**
     * Find least recently used entry
     */
    private findLRU<T>(cache: Map<string, CacheEntry<T>>): string | null {
        let lruKey: string | null = null;
        let oldestAccess = Infinity;

        for (const [key, entry] of cache.entries()) {
            if (entry.lastAccess < oldestAccess) {
                oldestAccess = entry.lastAccess;
                lruKey = key;
            }
        }

        return lruKey;
    }

    /**
     * Calculate total size of a cache
     */
    private getCacheSize<T>(cache: Map<string, CacheEntry<T>>): number {
        let total = 0;
        for (const entry of cache.values()) {
            total += entry.size;
        }
        return total;
    }

    /**
     * Estimate size of data in bytes
     */
    private estimateSize(data: any): number {
        try {
            const json = JSON.stringify(data);
            return new Blob([json]).size;
        } catch {
            // Fallback estimation
            return 1024; // 1 KB default
        }
    }

    /**
     * Get cache statistics
     */
    getStats(cacheType?: CacheType): CacheStats {
        const cache = cacheType ? this.getCacheByType(cacheType) : null;
        const caches = cache ? [cache] : [
            this.fileCache,
            this.folderCache,
            this.driveCache,
            this.recentCache,
            this.metadataCache,
        ];

        let totalEntries = 0;
        let totalSize = 0;
        let oldest: number | null = null;
        let newest: number | null = null;

        for (const c of caches) {
            totalEntries += c.size;
            totalSize += this.getCacheSize(c);

            for (const entry of c.values()) {
                if (oldest === null || entry.timestamp < oldest) {
                    oldest = entry.timestamp;
                }
                if (newest === null || entry.timestamp > newest) {
                    newest = entry.timestamp;
                }
            }
        }

        const total = this.hits + this.misses;
        const hitRate = total > 0 ? this.hits / total : 0;
        const missRate = total > 0 ? this.misses / total : 0;

        return {
            totalEntries,
            totalSize,
            hitRate,
            missRate,
            oldestEntry: oldest,
            newestEntry: newest,
        };
    }

    /**
     * Get cache by type
     */
    private getCacheByType(type: CacheType): Map<string, CacheEntry<any>> {
        switch (type) {
            case 'file':
                return this.fileCache;
            case 'folder':
                return this.folderCache;
            case 'drive':
                return this.driveCache;
            case 'recent':
                return this.recentCache;
            case 'metadata':
                return this.metadataCache;
        }
    }

    /**
     * Clear specific cache type
     */
    clearCache(type: CacheType): void {
        const cache = this.getCacheByType(type);
        cache.clear();
        
        if (this.config.persistToLocalStorage) {
            this.persistToLocalStorage();
        }
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        this.fileCache.clear();
        this.folderCache.clear();
        this.driveCache.clear();
        this.recentCache.clear();
        this.metadataCache.clear();
        this.hits = 0;
        this.misses = 0;

        if (this.config.persistToLocalStorage) {
            this.removeFromLocalStorage();
        }
    }

    /**
     * Invalidate entries older than specified time
     */
    invalidateOld(maxAge: number): void {
        const now = Date.now();
        const caches = [
            this.fileCache,
            this.folderCache,
            this.driveCache,
            this.recentCache,
            this.metadataCache,
        ];

        for (const cache of caches) {
            for (const [key, entry] of cache.entries()) {
                if (now - entry.timestamp > maxAge) {
                    cache.delete(key);
                }
            }
        }

        if (this.config.persistToLocalStorage) {
            this.persistToLocalStorage();
        }
    }

    /**
     * Invalidate specific path (for file/folder updates)
     */
    invalidatePath(path: string): void {
        this.fileCache.delete(path);
        this.folderCache.delete(path);

        // Also invalidate parent folder
        const parentPath = path.substring(0, path.lastIndexOf('\\'));
        if (parentPath) {
            this.folderCache.delete(parentPath);
        }

        if (this.config.persistToLocalStorage) {
            this.persistToLocalStorage();
        }
    }

    /**
     * Update cache configuration
     */
    updateConfig(config: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...config };
        
        // Re-evaluate cache size limits
        this.evictIfNeeded(this.fileCache, 0);
        this.evictIfNeeded(this.folderCache, 0);
        this.evictIfNeeded(this.driveCache, 0);
        this.evictIfNeeded(this.recentCache, 0);
        this.evictIfNeeded(this.metadataCache, 0);
    }

    /**
     * Get current configuration
     */
    getConfig(): CacheConfig {
        return { ...this.config };
    }

    /**
     * Persist cache to localStorage
     */
    private persistToLocalStorage(): void {
        try {
            const data = {
                config: this.config,
                stats: { hits: this.hits, misses: this.misses },
                timestamp: Date.now(),
            };

            localStorage.setItem('fast-file-explorer-cache-config', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to persist cache to localStorage:', error);
        }
    }

    /**
     * Load cache from localStorage
     */
    private loadFromLocalStorage(): void {
        try {
            const stored = localStorage.getItem('fast-file-explorer-cache-config');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.config) {
                    this.config = { ...this.config, ...data.config };
                }
                if (data.stats) {
                    this.hits = data.stats.hits || 0;
                    this.misses = data.stats.misses || 0;
                }
            }
        } catch (error) {
            console.warn('Failed to load cache from localStorage:', error);
        }
    }

    /**
     * Remove cache from localStorage
     */
    private removeFromLocalStorage(): void {
        try {
            localStorage.removeItem('fast-file-explorer-cache-config');
        } catch (error) {
            console.warn('Failed to remove cache from localStorage:', error);
        }
    }

    /**
     * Pre-warm cache with commonly accessed paths
     */
    async prewarm(paths: string[]): Promise<void> {
        // This would be called with common paths to load them into cache
        // Implementation depends on having access to file system API
        console.log('Cache prewarm requested for:', paths);
    }

    /**
     * Export cache statistics for monitoring
     */
    exportStats(): string {
        const stats = this.getStats();
        return JSON.stringify({
            ...stats,
            config: this.config,
            cacheDetails: {
                files: this.fileCache.size,
                folders: this.folderCache.size,
                drives: this.driveCache.size,
                recent: this.recentCache.size,
                metadata: this.metadataCache.size,
            },
        }, null, 2);
    }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export class for testing/custom instances
export default CacheManager;
