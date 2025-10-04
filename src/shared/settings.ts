export interface KnownFolderSettings {
    home: string;
    desktop: string;
    documents: string;
    downloads: string;
    pictures: string;
    music: string;
    videos: string;
    [key: string]: string;
}

export interface AppSettings {
    knownFolders: KnownFolderSettings;
    theme: string;
    viewMode: string;
    zoomLevel: number;
    version: string;
    // File system settings
    fileSizeUnit: 'decimal' | 'binary'; // GB/MB/TB vs GiB/MiB/TiB
    showHiddenFiles: boolean;
    showFileExtensions: boolean;
    defaultSortBy: 'name' | 'size' | 'modified' | 'type';
    defaultSortOrder: 'asc' | 'desc';
    // UI/UX settings
    enableAnimations: boolean;
    showThumbnails: boolean;
    thumbnailSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    doubleClickToOpen: boolean;
    // Performance settings
    enableFilePreview: boolean;
    maxPreviewFileSize: number; // in MB
    enableQuickSearch: boolean;
    enableVirtualScrolling: boolean;
    enableCaching: boolean;
    cacheMaxSize: number; // in MB
    cacheMaxAge: number; // in minutes
    enableLazyLoading: boolean;
    enableDebouncing: boolean;
    debounceDelay: number; // in ms
    // Navigation/history
    maxNavigationHistory: number;
    // Developer settings
    devFileTransferEnabled: boolean;
    devCustomContextMenu: boolean;
    devDebugMode: boolean;
}