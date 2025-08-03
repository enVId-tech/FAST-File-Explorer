export {};

declare global {
  interface Window {
    electronAPI: {
      testAPI: () => Promise<string>;
    };
  }
}