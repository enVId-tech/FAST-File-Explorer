"use client";
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './FileExplorer.scss';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string | null;
}

export function FileExplorer() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [drives, setDrives] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    initializeExplorer();
  }, []);

  const initializeExplorer = async () => {
    try {
      const [homeDir, driveList] = await Promise.all([
        invoke<string>('get_home_dir'),
        invoke<string[]>('get_drives')
      ]);
      
      setDrives(driveList);
      navigateToPath(homeDir);
    } catch (err) {
      setError('Failed to initialize file explorer: ' + err);
    }
  };

  const navigateToPath = async (path: string, addToHistory: boolean = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const fileList = await invoke<FileEntry[]>('list_files', { path });
      setFiles(fileList);
      setCurrentPath(path);
      
      if (addToHistory) {
        const newHistory = pathHistory.slice(0, historyIndex + 1);
        newHistory.push(path);
        setPathHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    } catch (err) {
      setError('Failed to load directory: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      navigateToPath(pathHistory[newIndex], false);
    }
  };

  const goForward = () => {
    if (historyIndex < pathHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      navigateToPath(pathHistory[newIndex], false);
    }
  };

  const goUp = () => {
    const parentPath = currentPath.split(/[/\\]/).slice(0, -1).join('/');
    if (parentPath) {
      navigateToPath(parentPath);
    }
  };

  const handleFileClick = (file: FileEntry) => {
    if (file.is_dir) {
      navigateToPath(file.path);
    } else {
      openFileInExplorer(file.path);
    }
  };

  const openFileInExplorer = async (path: string) => {
    try {
      await invoke('open_file_in_explorer', { path });
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-explorer">
      <div className="explorer-toolbar">
        <div className="navigation-buttons">
          <button 
            onClick={goBack} 
            disabled={historyIndex <= 0}
            title="Back"
          >
            ←
          </button>
          <button 
            onClick={goForward} 
            disabled={historyIndex >= pathHistory.length - 1}
            title="Forward"
          >
            →
          </button>
          <button 
            onClick={goUp} 
            disabled={!currentPath || currentPath === '/'}
            title="Up"
          >
            ↑
          </button>
        </div>
        
        <div className="path-bar">
          <input 
            type="text" 
            value={currentPath} 
            onChange={(e) => setCurrentPath(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                navigateToPath(currentPath);
              }
            }}
            placeholder="Enter path..."
          />
        </div>
        
        <div className="drives">
          {drives.map(drive => (
            <button 
              key={drive}
              onClick={() => navigateToPath(drive)}
              className={currentPath.startsWith(drive) ? 'active' : ''}
            >
              {drive}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="file-list">
          <div className="file-list-header">
            <div className="column-name">Name</div>
            <div className="column-modified">Modified</div>
            <div className="column-size">Size</div>
          </div>
          
          {files.map((file, index) => (
            <div 
              key={index}
              className={`file-item ${file.is_dir ? 'directory' : 'file'}`}
              onClick={() => handleFileClick(file)}
              title={file.path}
            >
              <div className="column-name">
                <span className="file-icon">
                  {file.is_dir ? '📁' : '📄'}
                </span>
                <span className="file-name">{file.name}</span>
              </div>
              <div className="column-modified">
                {file.modified || '-'}
              </div>
              <div className="column-size">
                {file.is_dir ? '-' : formatSize(file.size)}
              </div>
            </div>
          ))}
          
          {files.length === 0 && !loading && (
            <div className="empty-message">
              This folder is empty
            </div>
          )}
        </div>
      )}
    </div>
  );
}
