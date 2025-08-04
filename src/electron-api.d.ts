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
      tabAdd: (url: string) => Promise<{id: string, title: string, url: string} | null>;
      tabSwitch: (tabId: string) => Promise<{id: string, title: string, url: string} | null>;
      tabClose: (tabId: string) => Promise<{id: string, title: string, url: string}[]>;
      tabGetActive: () => Promise<{id: string, title: string, url: string} | null>;
      tabGetAll: () => Promise<{id: string, title: string, url: string}[]>;
      tabNavigate: (tabId: string, url: string) => Promise<boolean>;
      tabReload: (tabId: string) => Promise<boolean>;
      tabGoBack: (tabId: string) => Promise<boolean>;
      tabGoForward: (tabId: string) => Promise<boolean>;
    };
  }
}