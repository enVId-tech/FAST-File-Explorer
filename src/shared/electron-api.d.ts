import { DirectoryContents, DirectoryListOptions, FolderMetadata } from './ipc-channels';
import { TransferProgress, TransferOptions, TransferResult, TransferInfo } from './transfer-types';

export { };
declare global {
  interface Window {
    electronAPI: {
      // Generic IPC invoke method
      invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>;

      testAPI: () => Promise<string>;
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        unmaximize: () => Promise<void>;
        close: () => Promise<void>;
        getBounds: () => Promise<{ x: number, y: number, width: number, height: number }>;
        setBounds: (bounds: { x?: number, y?: number, width?: number, height?: number }) => Promise<void>;
        addMaximizeListener: () => Promise<boolean>;
        removeMaximizeListener: () => Promise<boolean>;
        onMaximizeChange: (callback: (event: any, maximized: boolean) => void) => () => void;
      };
      // Tab management
      tab: {
        add: (url: string) => Promise<{ id: string, title: string, url: string } | null>;
        switch: (tabId: string) => Promise<{ id: string, title: string, url: string } | null>;
        close: (tabId: string) => Promise<{ id: string, title: string, url: string }[]>;
        getActive: () => Promise<{ id: string, title: string, url: string } | null>;
        getAll: () => Promise<{ id: string, title: string, url: string }[]>;
        navigate: (tabId: string, url: string) => Promise<boolean>;
        reload: (tabId: string) => Promise<boolean>;
        goBack: (tabId: string) => Promise<boolean>;
        goForward: (tabId: string) => Promise<boolean>;
      },
      data: {
        create: (name: string) => Promise<string | null>;
        delete: (id: string) => Promise<boolean>;
        rename: (id: string, newName: string) => Promise<boolean>;
        getDirectory: (folderPath: string) => Promise<{ folderName: string, name: string }[]>;
        getMetadata: (dataPath: string) => Promise<{ folderName: string, name: string } | null>;
        getDrives: () => Promise<{ name: string, path: string }[]>;
        renameDrive: (drivePath: string, newLabel: string) => Promise<{ success: boolean; needsElevation?: boolean; error?: string }>;
        getRecentFiles: () => Promise<{ name: string, path: string, lastOpened: string, size?: string }[]>;
      },
      // Enhanced file system methods
      fs: {
        getDirectoryContents: (dirPath: string, options?: DirectoryListOptions) => Promise<DirectoryContents>;
        directoryExists: (dirPath: string) => Promise<boolean>;
        getParentDirectory: (dirPath: string) => Promise<string | null>;
        getFolderMetadata: (folderPath: string) => Promise<FolderMetadata>;
      },
      // Navigation utilities
      navigation: {
        navigateToPath: (path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        navigateToKnownFolder: (folderType: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        navigateUp: (currentPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        validatePath: (path: string) => Promise<boolean>;
        generateBreadcrumbs: (path: string) => Promise<{ name: string; path: string }[]>;
      },
      // System operations
      system: {
        platform: string;
        pathSeparator: string;
        openFile: (filePath: string) => Promise<boolean>;
        openFileFast: (filePath: string) => void; // Fire-and-forget for maximum speed
        isAdmin: () => Promise<boolean>;
        requestElevation: (reason: string) => Promise<boolean>;
      },
      // File operations
      files: {
        copy: (sources: string[], destination: string) => Promise<boolean>;
        cut: (sources: string[], destination: string) => Promise<boolean>;
        delete: (paths: string[]) => Promise<boolean>;
        rename: (oldPath: string, newName: string) => Promise<boolean>;
        createFolder: (parentPath: string, name: string) => Promise<string>;
        showProperties: (path: string) => Promise<void>;
        showInExplorer: (path: string) => Promise<void>;
      },
      // Advanced file operations
      fileOperations: {
        calculateFileHash: (filePath: string, algorithm: 'MD5' | 'SHA-1' | 'SHA-256') => Promise<string>;
        compareFiles: (file1: string, file2: string, mode: 'binary' | 'text') => Promise<{ identical: boolean; differences: any[]; similarity: number }>;
        mergeFiles: (options: { files: string[]; outputPath: string; separator: string; addHeaders: boolean }) => Promise<void>;
        splitFilePart: (filePath: string, partPath: string, offset: number, length: number) => Promise<void>;
        reconstructFile: (parts: string[], outputPath: string) => Promise<void>;
        getFileStats: (filePath: string) => Promise<{ size: number; modified: number; created: number }>;
        fileExists: (filePath: string) => Promise<boolean>;
        readFile: (filePath: string) => Promise<string>;
        writeFile: (filePath: string, content: string) => Promise<void>;
        listFiles: (directory: string, recursive: boolean) => Promise<string[]>;
      },
      // Clipboard operations
      clipboard: {
        copyFiles: (paths: string[]) => Promise<void>;
        cutFiles: (paths: string[]) => Promise<void>;
        pasteFiles: (destinationPath: string) => Promise<boolean>;
        hasFiles: () => Promise<boolean>;
        getState: () => Promise<{ operation: 'copy' | 'cut' | null; files: string[] }>;
        clear: () => Promise<void>;
      },
      // Settings management
      settings: {
        getAll: () => Promise<AppSettings>;
        getKnownFolders: () => Promise<KnownFolderSettings>;
        getKnownFolder: (folderType: string) => Promise<string>;
        updateKnownFolder: (folderType: string, newPath: string) => Promise<{ success: boolean }>;
        updateKnownFolders: (folders: Partial<KnownFolderSettings>) => Promise<{ success: boolean }>;
        resetKnownFolders: () => Promise<{ success: boolean }>;
        validateFolder: (folderPath: string) => Promise<{ valid: boolean, error?: string }>;
        update: (key: keyof AppSettings, value: any) => Promise<{ success: boolean }>;
        getPath: () => Promise<string>;
      },
      // Advanced transfer operations using fast-transferlib
      transfer: {
        initialize: () => Promise<{ success: boolean; rsyncAvailable?: boolean; availableProviders?: string[]; error?: string }>;
        start: (transferId: string, sources: string[], destination: string, options?: TransferOptions) => Promise<{ success: boolean; results: TransferResult[]; totalBytesTransferred: number; duration: number }>;
        copy: (transferId: string, sources: string[], destination: string, options?: TransferOptions) => Promise<{ success: boolean; results: TransferResult[] }>;
        move: (transferId: string, sources: string[], destination: string, options?: TransferOptions) => Promise<{ success: boolean; results: TransferResult[]; totalBytesTransferred: number }>;
        sync: (transferId: string, source: string, destination: string, options?: TransferOptions) => Promise<{ success: boolean; result: TransferResult }>;
        cancel: (transferId: string) => Promise<{ success: boolean; error?: string }>;
        getActive: () => Promise<Array<{ id: string; source: string; destination: string; startTime: number }>>;
        onProgress: (callback: (transferId: string, progress: TransferProgress) => void) => () => void;
      };
      // Archive operations
      archives: {
        create: (options: any) => Promise<{ success: boolean; message?: string; archivePath?: string }>;
        extract: (options: any) => Promise<{ success: boolean; message?: string; extractedFiles?: number }>;
        getInfo: (options: any) => Promise<{ success: boolean; info?: any }>;
        test: (options: any) => Promise<{ success: boolean; message?: string; errors?: string[] }>;
        preview: (options: any) => Promise<{ success: boolean; preview?: any }>;
        addFiles: (options: any) => Promise<{ success: boolean; message?: string }>;
        removeFiles: (options: any) => Promise<{ success: boolean; message?: string }>;
      };
      // Cloud integration operations (mock implementation)
      cloud: {
        connect: (provider: string, config?: any) => Promise<{ success: boolean; message: string; account?: any }>;
        disconnect: (accountId: string) => Promise<{ success: boolean; message: string }>;
        listFiles: (accountId: string, folderPath: string) => Promise<any[]>;
        uploadFile: (accountId: string, localPath: string, remotePath: string) => Promise<{ success: boolean; message: string; file?: any }>;
        downloadFile: (accountId: string, fileId: string, localPath: string) => Promise<{ success: boolean; message: string }>;
        syncFolder: (accountId: string, localFolder: string, remoteFolder: string) => Promise<{ success: boolean; message: string; stats?: any }>;
      };
    };
  }
}

// Settings interfaces for type safety
interface KnownFolderSettings {
  home: string;
  desktop: string;
  documents: string;
  downloads: string;
  pictures: string;
  music: string;
  videos: string;
  [key: string]: string;
}

interface AppSettings {
  knownFolders: KnownFolderSettings;
  theme: string;
  viewMode: string;
  zoomLevel: number;
  version: string;
  // File system settings
  fileSizeUnit: 'decimal' | 'binary';
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
  maxPreviewFileSize: number;
  enableQuickSearch: boolean;
  enableVirtualScrolling: boolean;
  enableCaching: boolean;
  cacheMaxSize: number;
  cacheMaxAge: number;
  enableLazyLoading: boolean;
  enableDebouncing: boolean;
  debounceDelay: number;
  // Navigation/history
  maxNavigationHistory: number;
  // Developer settings
  devFileTransferEnabled: boolean;
  devCustomContextMenu: boolean;
  devDebugMode: boolean;
}