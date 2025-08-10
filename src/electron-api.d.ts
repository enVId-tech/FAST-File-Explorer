import { DirectoryContents, DirectoryListOptions } from './shared/ipc-channels';

export {};
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
        getBounds: () => Promise<{x: number, y: number, width: number, height: number}>;
        setBounds: (bounds: {x?: number, y?: number, width?: number, height?: number}) => Promise<void>;
      };
      // Tab management
      tab: {
        add: (url: string) => Promise<{id: string, title: string, url: string} | null>;
        switch: (tabId: string) => Promise<{id: string, title: string, url: string} | null>;
        close: (tabId: string) => Promise<{id: string, title: string, url: string}[]>;
        getActive: () => Promise<{id: string, title: string, url: string} | null>;
        getAll: () => Promise<{id: string, title: string, url: string}[]>;
        navigate: (tabId: string, url: string) => Promise<boolean>;
        reload: (tabId: string) => Promise<boolean>;
        goBack: (tabId: string) => Promise<boolean>;
        goForward: (tabId: string) => Promise<boolean>;
      },
      data: {
        create: (name: string) => Promise<string | null>;
        delete: (id: string) => Promise<boolean>;
        rename: (id: string, newName: string) => Promise<boolean>;
        getDirectory: (folderPath: string) => Promise<{folderName: string, name: string}[]>;
        getMetadata: (dataPath: string) => Promise<{folderName: string, name: string} | null>;
        getDrives: () => Promise<{name: string, path: string}[]>;
        getRecentFiles: () => Promise<{name: string, path: string, lastOpened: string, size?: string}[]>;
      },
      // Enhanced file system methods
      fs: {
        getDirectoryContents: (dirPath: string, options?: DirectoryListOptions) => Promise<DirectoryContents>;
        directoryExists: (dirPath: string) => Promise<boolean>;
        getParentDirectory: (dirPath: string) => Promise<string | null>;
        getKnownFolder: (folderType: string) => Promise<string>;
      },
      // System information
      system: {
        platform: string;
        pathSeparator: string;
      }
    };
  }
}