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
    // Navigation/history
    maxNavigationHistory: number;
}