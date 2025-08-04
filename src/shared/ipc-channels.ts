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
}

// Define Tab interface
export interface Tab {
    id: string;
    url: string;
    title: string;
}