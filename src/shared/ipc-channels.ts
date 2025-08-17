// Enhanced file system interfaces
export interface FileSystemItem {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size: number;
    modified: Date;
    created: Date;
    extension?: string;
    isHidden: boolean;
    isSystem: boolean;
    permissions: {
        read: boolean;
        write: boolean;
        execute: boolean;
    };
}

// Enhanced folder metadata interface
export interface FolderMetadata {
    totalSize: number;
    totalFiles: number;
    totalFolders: number;
    fileTypes: Record<string, number>; // extension -> count
    lastModified: Date;
    created: Date;
}

export interface DirectoryContents {
    items: FileSystemItem[];
    totalItems: number;
    path: string;
    parent?: string;
    error?: string;
    folderMetadata?: FolderMetadata;
}

export interface DirectoryListOptions {
    includeHidden?: boolean;
    sortBy?: 'name' | 'size' | 'modified';
    sortDirection?: 'asc' | 'desc';
    maxItems?: number;
    includeFolderAnalysis?: boolean; // For detailed folder metadata
}

// Define the shape of messages sent to the main process
export interface IpcMainToRenderer {
    'update-tabs': (tabs: string[]) => void;
    'switch-tab': (tabId: string) => void;
    'update-tab-title': (tabId: string, title: string) => void;
}

// Define the shape of messages sent from the renderer process
export interface IpcRendererToMain {
    'new-tab': (url: string) => void;
    'switch-tab': (tabId: string) => void;
    'close-tab': (tabId: string) => void;
    // Enhanced file system operations
    'fs-get-directory-contents': (dirPath: string, options?: DirectoryListOptions) => Promise<DirectoryContents>;
    'fs-directory-exists': (dirPath: string) => Promise<boolean>;
    'fs-get-parent-directory': (dirPath: string) => Promise<string | null>;
    'fs-get-known-folder': (folderType: string) => Promise<string>;
    'fs-get-folder-metadata': (folderPath: string) => Promise<FolderMetadata>;
}

// Define Tab interface
export interface Tab {
    id: string;
    url: string;
    title: string;
}