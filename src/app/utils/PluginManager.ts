/**
 * Plugin Manager
 * Handles plugin loading, API exposure, event system
 */

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  icon?: string;
  enabled: boolean;
  loaded: boolean;
  entryPoint: string;
  permissions: PluginPermission[];
  api?: any;
  installDate: Date;
  lastUpdate?: Date;
}

export type PluginPermission =
  | 'filesystem.read'
  | 'filesystem.write'
  | 'filesystem.delete'
  | 'settings.read'
  | 'settings.write'
  | 'ui.toolbar'
  | 'ui.contextmenu'
  | 'ui.sidebar'
  | 'network.request'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'notifications';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  icon?: string;
  entryPoint: string;
  permissions: PluginPermission[];
  dependencies?: Record<string, string>;
}

export interface PluginAPI {
  // File system access
  fs: {
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
    listDirectory: (path: string) => Promise<any[]>;
    deleteFile: (path: string) => Promise<void>;
  };
  // Settings access
  settings: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
  };
  // UI integration
  ui: {
    addToolbarButton: (button: ToolbarButton) => void;
    addContextMenuItem: (item: ContextMenuItem) => void;
    addSidebarItem: (item: SidebarItem) => void;
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  };
  // Event system
  events: {
    on: (event: string, handler: Function) => void;
    off: (event: string, handler: Function) => void;
    emit: (event: string, ...args: any[]) => void;
  };
  // Utilities
  utils: {
    formatSize: (bytes: number) => string;
    formatDate: (date: Date) => string;
    showDialog: (options: DialogOptions) => Promise<any>;
  };
}

interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  onClick: () => void;
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: (context: any) => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  component: any;
}

interface DialogOptions {
  title: string;
  message: string;
  buttons: string[];
  defaultId?: number;
}

class PluginManagerClass {
  private static instance: PluginManagerClass;
  private plugins: Map<string, Plugin> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private pluginAPIs: Map<string, PluginAPI> = new Map();

  private constructor() {
    this.initializeManager();
  }

  public static getInstance(): PluginManagerClass {
    if (!PluginManagerClass.instance) {
      PluginManagerClass.instance = new PluginManagerClass();
    }
    return PluginManagerClass.instance;
  }

  private initializeManager(): void {
    this.loadPlugins();
    this.loadEnabledPlugins();
    console.log('[PluginManager] Initialized with', this.plugins.size, 'plugins');
  }

  /**
   * Load plugins from storage
   */
  private loadPlugins(): void {
    try {
      const stored = localStorage.getItem('plugins');
      if (stored) {
        const plugins = JSON.parse(stored);
        plugins.forEach((plugin: Plugin) => {
          if (plugin.installDate) plugin.installDate = new Date(plugin.installDate);
          if (plugin.lastUpdate) plugin.lastUpdate = new Date(plugin.lastUpdate);
          plugin.loaded = false; // Reset loaded status
          this.plugins.set(plugin.id, plugin);
        });
      }
    } catch (error) {
      console.error('[PluginManager] Error loading plugins:', error);
    }
  }

  /**
   * Save plugins to storage
   */
  private savePlugins(): void {
    try {
      const plugins = Array.from(this.plugins.values());
      localStorage.setItem('plugins', JSON.stringify(plugins));
    } catch (error) {
      console.error('[PluginManager] Error saving plugins:', error);
    }
  }

  /**
   * Load enabled plugins
   */
  private loadEnabledPlugins(): void {
    this.plugins.forEach(plugin => {
      if (plugin.enabled) {
        this.loadPlugin(plugin.id);
      }
    });
  }

  /**
   * Install plugin
   */
  public async installPlugin(manifest: PluginManifest): Promise<{
    success: boolean;
    message: string;
    plugin?: Plugin;
  }> {
    try {
      // Check if plugin already exists
      if (this.plugins.has(manifest.id)) {
        return { success: false, message: 'Plugin already installed' };
      }

      // Validate manifest
      if (!manifest.id || !manifest.name || !manifest.version || !manifest.entryPoint) {
        return { success: false, message: 'Invalid plugin manifest' };
      }

      // Create plugin
      const plugin: Plugin = {
        ...manifest,
        enabled: false,
        loaded: false,
        installDate: new Date(),
      };

      this.plugins.set(plugin.id, plugin);
      this.savePlugins();

      console.log('[PluginManager] Plugin installed:', plugin.name);

      return {
        success: true,
        message: 'Plugin installed successfully',
        plugin,
      };
    } catch (error) {
      console.error('[PluginManager] Error installing plugin:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Installation failed',
      };
    }
  }

  /**
   * Uninstall plugin
   */
  public async uninstallPlugin(pluginId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return { success: false, message: 'Plugin not found' };
      }

      // Unload if loaded
      if (plugin.loaded) {
        await this.unloadPlugin(pluginId);
      }

      // Remove plugin
      this.plugins.delete(pluginId);
      this.pluginAPIs.delete(pluginId);
      this.savePlugins();

      console.log('[PluginManager] Plugin uninstalled:', plugin.name);

      return {
        success: true,
        message: 'Plugin uninstalled successfully',
      };
    } catch (error) {
      console.error('[PluginManager] Error uninstalling plugin:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Uninstall failed',
      };
    }
  }

  /**
   * Enable plugin
   */
  public async enablePlugin(pluginId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return { success: false, message: 'Plugin not found' };
      }

      if (plugin.enabled) {
        return { success: false, message: 'Plugin already enabled' };
      }

      plugin.enabled = true;
      this.savePlugins();

      // Load plugin
      const result = await this.loadPlugin(pluginId);
      if (!result.success) {
        plugin.enabled = false;
        this.savePlugins();
        return result;
      }

      return {
        success: true,
        message: 'Plugin enabled successfully',
      };
    } catch (error) {
      console.error('[PluginManager] Error enabling plugin:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Enable failed',
      };
    }
  }

  /**
   * Disable plugin
   */
  public async disablePlugin(pluginId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return { success: false, message: 'Plugin not found' };
      }

      if (!plugin.enabled) {
        return { success: false, message: 'Plugin already disabled' };
      }

      plugin.enabled = false;
      this.savePlugins();

      // Unload plugin
      await this.unloadPlugin(pluginId);

      return {
        success: true,
        message: 'Plugin disabled successfully',
      };
    } catch (error) {
      console.error('[PluginManager] Error disabling plugin:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Disable failed',
      };
    }
  }

  /**
   * Load plugin
   */
  private async loadPlugin(pluginId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return { success: false, message: 'Plugin not found' };
      }

      if (plugin.loaded) {
        return { success: false, message: 'Plugin already loaded' };
      }

      console.log('[PluginManager] Loading plugin:', plugin.name);

      // Check permissions
      const hasPermissions = this.checkPermissions(plugin.permissions);
      if (!hasPermissions) {
        return { success: false, message: 'Insufficient permissions' };
      }

      // Create plugin API
      const api = this.createPluginAPI(plugin);
      this.pluginAPIs.set(pluginId, api);

      // In a real implementation, this would load the plugin code
      // For now, we'll just simulate it
      plugin.api = api;
      plugin.loaded = true;
      this.savePlugins();

      // Emit event
      this.emit('plugin:loaded', plugin);

      console.log('[PluginManager] Plugin loaded:', plugin.name);

      return {
        success: true,
        message: 'Plugin loaded successfully',
      };
    } catch (error) {
      console.error('[PluginManager] Error loading plugin:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Load failed',
      };
    }
  }

  /**
   * Unload plugin
   */
  private async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.loaded) return;

    console.log('[PluginManager] Unloading plugin:', plugin.name);

    // Clean up plugin API
    this.pluginAPIs.delete(pluginId);

    // Mark as unloaded
    plugin.loaded = false;
    plugin.api = undefined;
    this.savePlugins();

    // Emit event
    this.emit('plugin:unloaded', plugin);
  }

  /**
   * Create plugin API
   */
  private createPluginAPI(plugin: Plugin): PluginAPI {
    return {
      fs: {
        readFile: async (path: string) => {
          if (!plugin.permissions.includes('filesystem.read')) {
            throw new Error('Permission denied: filesystem.read');
          }
          // Mock implementation
          return 'file content';
        },
        writeFile: async (path: string, content: string) => {
          if (!plugin.permissions.includes('filesystem.write')) {
            throw new Error('Permission denied: filesystem.write');
          }
          // Mock implementation
        },
        listDirectory: async (path: string) => {
          if (!plugin.permissions.includes('filesystem.read')) {
            throw new Error('Permission denied: filesystem.read');
          }
          // Mock implementation
          return [];
        },
        deleteFile: async (path: string) => {
          if (!plugin.permissions.includes('filesystem.delete')) {
            throw new Error('Permission denied: filesystem.delete');
          }
          // Mock implementation
        },
      },
      settings: {
        get: (key: string) => {
          if (!plugin.permissions.includes('settings.read')) {
            throw new Error('Permission denied: settings.read');
          }
          return null;
        },
        set: (key: string, value: any) => {
          if (!plugin.permissions.includes('settings.write')) {
            throw new Error('Permission denied: settings.write');
          }
        },
      },
      ui: {
        addToolbarButton: (button: ToolbarButton) => {
          if (!plugin.permissions.includes('ui.toolbar')) {
            throw new Error('Permission denied: ui.toolbar');
          }
          this.emit('plugin:toolbar-button', { plugin, button });
        },
        addContextMenuItem: (item: ContextMenuItem) => {
          if (!plugin.permissions.includes('ui.contextmenu')) {
            throw new Error('Permission denied: ui.contextmenu');
          }
          this.emit('plugin:context-menu-item', { plugin, item });
        },
        addSidebarItem: (item: SidebarItem) => {
          if (!plugin.permissions.includes('ui.sidebar')) {
            throw new Error('Permission denied: ui.sidebar');
          }
          this.emit('plugin:sidebar-item', { plugin, item });
        },
        showNotification: (message: string, type = 'info') => {
          if (!plugin.permissions.includes('notifications')) {
            throw new Error('Permission denied: notifications');
          }
          console.log(`[Plugin: ${plugin.name}]`, message);
        },
      },
      events: {
        on: (event: string, handler: Function) => {
          this.on(event, handler);
        },
        off: (event: string, handler: Function) => {
          this.off(event, handler);
        },
        emit: (event: string, ...args: any[]) => {
          this.emit(event, ...args);
        },
      },
      utils: {
        formatSize: (bytes: number) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
        },
        formatDate: (date: Date) => {
          return date.toLocaleString();
        },
        showDialog: async (options: DialogOptions) => {
          // Mock implementation
          return { response: 0 };
        },
      },
    };
  }

  /**
   * Check permissions
   */
  private checkPermissions(permissions: PluginPermission[]): boolean {
    // In a real implementation, this would check actual permissions
    return true;
  }

  /**
   * Get all plugins
   */
  public getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  public getPlugin(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Get loaded plugins
   */
  public getLoadedPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.loaded);
  }

  /**
   * Event system
   */
  public on(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  public off(event: string, handler: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  }

  public emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error('[PluginManager] Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Clear all data
   */
  public clearAll(): void {
    this.plugins.forEach(plugin => {
      if (plugin.loaded) {
        this.unloadPlugin(plugin.id);
      }
    });
    this.plugins.clear();
    this.pluginAPIs.clear();
    this.eventListeners.clear();
    localStorage.removeItem('plugins');
  }
}

export const pluginManager = PluginManagerClass.getInstance();
