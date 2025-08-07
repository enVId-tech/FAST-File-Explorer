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
      folders: {
        create: (name: string) => Promise<string | null>;
        delete: (id: string) => Promise<boolean>;
        rename: (id: string, newName: string) => Promise<boolean>;
        getAll: (folderPath: string) => Promise<{folderName: string, name: string}[]>;
        get: (folderName: string) => Promise<{folderName: string, name: string} | null>;
      }
      files: {
        create: (name: string, content: string) => Promise<string | null>;
        delete: (id: string) => Promise<boolean>;
        rename: (id: string, newName: string) => Promise<boolean>;
        getAll: () => Promise<{id: string, name: string}[]>;
        get: (id: string) => Promise<{id: string, name: string} | null>;
      }
    };
  }
}