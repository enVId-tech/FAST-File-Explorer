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
    };
  }
}