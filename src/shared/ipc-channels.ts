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
    'system-open-file': (filePath: string) => Promise<boolean>;
    'system-open-file-fast': (filePath: string) => void; // Fire-and-forget version
    // File operations
    'file-copy': (sources: string[], destination: string) => Promise<boolean>;
    'file-cut': (sources: string[], destination: string) => Promise<boolean>;
    'file-delete': (paths: string[]) => Promise<boolean>;
    'file-rename': (oldPath: string, newName: string) => Promise<boolean>;
    'file-create-folder': (parentPath: string, name: string) => Promise<string>;
    'file-show-properties': (path: string) => Promise<void>;
    'file-show-in-explorer': (path: string) => Promise<void>;
    'clipboard-copy': (paths: string[]) => Promise<void>;
    'clipboard-cut': (paths: string[]) => Promise<void>;
    'clipboard-paste': (destinationPath: string) => Promise<boolean>;
    'clipboard-has-files': () => Promise<boolean>;
    'clipboard-get-state': () => Promise<{ operation: 'copy' | 'cut' | null; files: string[] }>;
    'clipboard-clear': () => Promise<void>;
}

// Define Tab interface
export interface Tab {
    id: string;
    url: string;
    title: string;
}