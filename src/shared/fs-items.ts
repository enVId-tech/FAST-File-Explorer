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

export interface DirectoryContents {
    items: FileSystemItem[];
    totalItems: number;
    path: string;
    parent?: string;
    error?: string;
}