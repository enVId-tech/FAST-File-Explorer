export {};
declare global {
  interface Window {
    electronAPI: {
      testAPI: () => Promise<string>;
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        unmaximize: () => Promise<void>;
        close: () => Promise<void>;
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
      }
    };
  }
}