import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { initializeIpcHandlers } from './ipc/main/ipcSetup';
import { getVersionDisplayString } from './version';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: `Fast File Explorer ${getVersionDisplayString()}`,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(app.getAppPath(), 'assets', 'icon.png'),
    // Enable window snapping and native Windows features
    thickFrame: true, // Enable thick frame on Windows for native snapping support
    resizable: true, // Ensure window is resizable for snapping
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, 'preload.js'), // IMPORTANT: Do not change from .js to .ts, breaks preloader
      // Performance optimizations
      backgroundThrottling: false, // Keep renderer active in background
      offscreen: false, // Disable offscreen rendering for better performance
    },
  });

  // and load the index.html of the app.
  // Note: NODE_ENV is not production in development mode
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Use the environment variable set by Electron Forge Vite plugin
    mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else if (isDevelopment) {
    // Fallback: Connect directly to the Vite dev server (port 5173 is the default)
    mainWindow.loadURL('http://localhost:5173/');
  } else {
    // Production: Load from the built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
  }

  // Open the DevTools in development only.
  if (process.env.NODE_ENV === 'development' || process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Enable native window snapping (Aero Snap) on Windows
  if (process.platform === 'win32') {
    // Enable window snapping by allowing native window management
    mainWindow.setResizable(true);
    mainWindow.setMaximizable(true);
    mainWindow.setMinimizable(true);
  }
};

app.whenReady().then(() => {
  createWindow();
  initializeIpcHandlers(mainWindow);

  // Log application startup with version info
  console.log(`Fast File Explorer ${getVersionDisplayString()} started successfully`);

  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost') && !url.startsWith('https://localhost')) {
      event.preventDefault();
    }
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});