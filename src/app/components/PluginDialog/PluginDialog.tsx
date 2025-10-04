import React, { useState, useEffect } from 'react';
import { pluginManager, Plugin } from '../../utils/PluginManager';
import './PluginDialog.scss';

interface PluginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluginDialog: React.FC<PluginDialogProps> = ({ isOpen, onClose }) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPlugins();
    }
  }, [isOpen]);

  const loadPlugins = () => {
    setPlugins(pluginManager.getPlugins());
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    const result = enabled
      ? await pluginManager.enablePlugin(pluginId)
      : await pluginManager.disablePlugin(pluginId);
    
    setMessage(result.message);
    loadPlugins();
  };

  const handleUninstall = async (pluginId: string) => {
    const result = await pluginManager.uninstallPlugin(pluginId);
    setMessage(result.message);
    loadPlugins();
  };

  if (!isOpen) return null;

  return (
    <div className="plugin-dialog-overlay" onClick={onClose}>
      <div className="plugin-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="plugin-dialog__header">
          <h2>🧩 Plugin Manager</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="plugin-dialog__content">
          {plugins.length === 0 ? (
            <div className="empty-state">
              <p>No plugins installed</p>
              <p className="hint">Install plugins to extend functionality</p>
            </div>
          ) : (
            <div className="plugins-list">
              {plugins.map(plugin => (
                <div key={plugin.id} className="plugin-card">
                  <div className="plugin-icon">{plugin.icon || '🧩'}</div>
                  <div className="plugin-info">
                    <h3>{plugin.name}</h3>
                    <p className="description">{plugin.description}</p>
                    <div className="meta">
                      <span>v{plugin.version}</span>
                      <span>by {plugin.author}</span>
                      {plugin.loaded && <span className="badge">Loaded</span>}
                    </div>
                  </div>
                  <div className="plugin-actions">
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={plugin.enabled}
                        onChange={(e) => handleTogglePlugin(plugin.id, e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                    <button
                      className="uninstall-btn"
                      onClick={() => handleUninstall(plugin.id)}
                    >
                      Uninstall
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {message && <div className="message">{message}</div>}
        </div>
      </div>
    </div>
  );
};
