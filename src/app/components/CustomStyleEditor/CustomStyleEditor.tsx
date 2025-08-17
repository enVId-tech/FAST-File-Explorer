import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaSave, FaUndo, FaTrash, FaPlus, FaCopy, FaPalette, FaEye } from 'react-icons/fa';
import { ColorPicker } from '../ColorPicker/ColorPicker';
import { IconSelector } from '../IconSelector/IconSelector';
import { defaultCustomStyle, debounce } from './styleUtils';
import './CustomStyleEditor.scss';

export interface CustomStyle {
  id: string;
  name: string;
  description: string;
  variables: {
    // Background colors
    '--primary-bg': string;
    '--secondary-bg': string;
    '--surface-bg': string;
    '--hover-bg': string;

    // Accent colors
    '--accent-color': string;
    '--accent-hover': string;
    '--accent-active': string;

    // Text colors
    '--text-primary': string;
    '--text-secondary': string;
    '--text-tertiary': string;

    // Border colors
    '--border-color': string;
    '--border-hover': string;

    // Selection colors
    '--selection-bg': string;
    '--selection-border': string;

    // Shadow values
    '--shadow-small': string;
    '--shadow-medium': string;
    '--shadow-large': string;
  };
  driveIcons: {
    [driveType: string]: string; // Drive type to React Icon name mapping
  };
  created: string;
  modified: string;
}

interface CustomStyleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: CustomStyle | null;
  onStyleSave: (style: CustomStyle) => void;
  onStyleDelete: (styleId: string) => void;
  onStyleApply: (style: CustomStyle) => void;
  customStyles: CustomStyle[];
}

export const CustomStyleEditor: React.FC<CustomStyleEditorProps> = ({
  isOpen,
  onClose,
  currentStyle,
  onStyleSave,
  onStyleDelete,
  onStyleApply,
  customStyles
}) => {
  const [editingStyle, setEditingStyle] = useState<CustomStyle | null>(null);
  const [activeTab, setActiveTab] = useState<'colors' | 'icons' | 'preview'>('colors');
  const [previewMode, setPreviewMode] = useState(true);
  const [originalTheme, setOriginalTheme] = useState<string>('');
  const [detached, setDetached] = useState(false); // Pop-out mode
  const [expanded, setExpanded] = useState(false); // Wider editor

  useEffect(() => {
    if (isOpen) {
      // Store original theme to restore later
      const currentTheme = localStorage.getItem('selectedTheme') || 'win11-dark';
      setOriginalTheme(currentTheme);
      setPreviewMode(true);
    }

    if (currentStyle) {
      setEditingStyle(currentStyle);
    } else if (isOpen) {
      // Create new style
      const now = new Date().toISOString();
      const newStyle = {
        id: `custom-${Date.now()}`,
        ...defaultCustomStyle,
        created: now,
        modified: now
      };
      setEditingStyle(newStyle);
      // Apply the new style immediately for preview
      if (onStyleApply) {
        onStyleApply(newStyle);
      }
    }
  }, [currentStyle, isOpen, onStyleApply]);

  // Real-time preview as user edits
  const applyPreviewDebounced = useCallback(
    debounce((style: CustomStyle) => {
      if (previewMode && isOpen && onStyleApply) {
        onStyleApply(style);
      }
    }, 150),
    [previewMode, isOpen, onStyleApply]
  );

  useEffect(() => {
    if (editingStyle && previewMode) {
      applyPreviewDebounced(editingStyle);
    }
  }, [editingStyle, previewMode, applyPreviewDebounced]);

  const handleVariableChange = (property: string, value: string) => {
    if (!editingStyle) return;

    const updatedStyle = {
      ...editingStyle,
      variables: {
        ...editingStyle.variables,
        [property]: value
      },
      modified: new Date().toISOString()
    };

    setEditingStyle(updatedStyle);
  };

  const handleDriveIconChange = (driveType: string, iconName: string) => {
    if (!editingStyle) return;

    const updatedStyle = {
      ...editingStyle,
      driveIcons: {
        ...editingStyle.driveIcons,
        [driveType]: iconName
      },
      modified: new Date().toISOString()
    };

    setEditingStyle(updatedStyle);
  };

  const handleSave = () => {
    if (!editingStyle) return;
    onStyleSave(editingStyle);
  };

  const handleReset = () => {
    const now = new Date().toISOString();
    const resetStyle = {
      id: editingStyle?.id || `custom-${Date.now()}`,
      ...defaultCustomStyle,
      created: editingStyle?.created || now,
      modified: now
    };
    setEditingStyle(resetStyle);
  };

  const handleClose = () => {
    onClose();
  };

  const togglePreviewMode = () => {
    const newPreviewMode = !previewMode;
    setPreviewMode(newPreviewMode);
    if (newPreviewMode && editingStyle && onStyleApply) {
      onStyleApply(editingStyle);
    }
  };

  const generateThemePreview = (style: CustomStyle) => {
    return {
      primary: style.variables['--primary-bg'],
      secondary: style.variables['--secondary-bg'],
      accent: style.variables['--accent-color'],
      text: style.variables['--text-primary']
    };
  };

  const renderColorSection = (title: string, filterFn: (key: string) => boolean) => {
    if (!editingStyle) return null;

    return (
      <div className="color-category">
        <h3>{title}</h3>
        <div className="color-items">
          {Object.entries(editingStyle.variables)
            .filter(([key]) => filterFn(key))
            .map(([key, value]) => (
              <div key={key} className="color-item">
                <label>{key.replace('--', '').replace(/-/g, ' ')}</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={value.startsWith('#') ? value : extractColorFromValue(value)}
                    onChange={(e) => handleVariableChange(key, e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleVariableChange(key, e.target.value)}
                    className="color-text-input"
                    placeholder="Color value"
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const extractColorFromValue = (value: string): string => {
    if (value.startsWith('#')) return value;
    if (value.startsWith('rgb')) {
      // Extract RGB values and convert to hex
      const match = value.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    return '#000000'; // Default fallback
  };

  if (!isOpen || !editingStyle) return null;

  const ui = (
    <div className={`custom-style-editor-overlay ${detached ? 'detached' : 'modal'}`}>
      <div className={`custom-style-editor ${expanded ? 'expanded' : 'compact'} ${detached ? 'floating' : ''}`}>
        <div className="editor-header">
          <h2>Custom Theme Editor</h2>
          <div className="header-actions">
            <button
              className={`preview-btn ${detached ? 'active' : ''}`}
              onClick={() => setDetached(!detached)}
              title={detached ? 'Dock editor' : 'Pop out editor'}
            >
              {detached ? 'Dock' : 'Pop out'}
            </button>
            <button
              className={`preview-btn ${expanded ? 'active' : ''}`}
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Use compact size' : 'Expand width'}
            >
              {expanded ? 'Compact' : 'Expand'}
            </button>
            <button
              className={`preview-btn ${previewMode ? 'active' : ''}`}
              onClick={togglePreviewMode}
              title={previewMode ? 'Disable live preview' : 'Enable live preview'}
            >
              <FaEye />
              {previewMode ? 'Live Preview' : 'Preview'}
            </button>
            <button className="close-btn" onClick={handleClose}>×</button>
          </div>
        </div>

        <div className="editor-content">
          <div className="style-info">
            <input
              type="text"
              placeholder="Theme Name"
              value={editingStyle.name}
              onChange={(e) => setEditingStyle({ ...editingStyle, name: e.target.value, modified: new Date().toISOString() })}
              className="style-name-input"
            />
            <textarea
              placeholder="Theme Description"
              value={editingStyle.description}
              onChange={(e) => setEditingStyle({ ...editingStyle, description: e.target.value, modified: new Date().toISOString() })}
              className="style-description-input"
              rows={2}
            />
          </div>

          <div className="editor-tabs">
            <button
              className={`tab ${activeTab === 'colors' ? 'active' : ''}`}
              onClick={() => setActiveTab('colors')}
            >
              <FaPalette /> Colors
            </button>
            <button
              className={`tab ${activeTab === 'icons' ? 'active' : ''}`}
              onClick={() => setActiveTab('icons')}
            >
              Icons
            </button>
            <button
              className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <FaEye /> Preview
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'colors' && (
              <div className="colors-tab">
                <div className="color-categories">
                  {renderColorSection('Background Colors', (key) => key.includes('bg') && !key.includes('selection'))}
                  {renderColorSection('Accent Colors', (key) => key.includes('accent'))}
                  {renderColorSection('Text Colors', (key) => key.includes('text'))}
                  {renderColorSection('Border Colors', (key) => key.includes('border'))}
                  {renderColorSection('Selection Colors', (key) => key.includes('selection'))}
                  {renderColorSection('Shadow Values', (key) => key.includes('shadow'))}
                </div>
              </div>
            )}

            {activeTab === 'icons' && (
              <div className="icons-tab">
                <h3>Drive Icons</h3>
                <div className="icon-settings">
                  {Object.entries(editingStyle.driveIcons).map(([driveType, iconName]) => (
                    <div key={driveType} className="icon-setting">
                      <label>{driveType.replace('-', ' ').toUpperCase()}</label>
                      <IconSelector
                        selectedIcon={iconName}
                        onIconSelect={(icon: string) => handleDriveIconChange(driveType, icon)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="preview-tab">
                <div className="preview-container">
                  <div className="live-preview-notice">
                    {previewMode ? (
                      <span>✅ Live preview is enabled - changes apply immediately</span>
                    ) : (
                      <span>⏸️ Live preview is disabled - click 'Preview' to apply changes</span>
                    )}
                  </div>

                  <div className="theme-preview-card">
                    <div className="preview-header" style={{
                      backgroundColor: editingStyle.variables['--secondary-bg'],
                      color: editingStyle.variables['--text-primary'],
                      borderBottom: `1px solid ${editingStyle.variables['--border-color']}`
                    }}>
                      <h4>Theme Preview</h4>
                      <button style={{
                        backgroundColor: editingStyle.variables['--accent-color'],
                        color: 'white'
                      }}>
                        Action Button
                      </button>
                    </div>

                    <div className="preview-body" style={{
                      backgroundColor: editingStyle.variables['--primary-bg'],
                      color: editingStyle.variables['--text-primary']
                    }}>
                      <div className="preview-item" style={{
                        backgroundColor: editingStyle.variables['--surface-bg'],
                        color: editingStyle.variables['--text-secondary'],
                        border: `1px solid ${editingStyle.variables['--border-color']}`
                      }}>
                        <h5>Surface Element</h5>
                        <p>This shows how surface elements will look with your theme.</p>
                      </div>

                      <div className="preview-item accent" style={{
                        backgroundColor: editingStyle.variables['--accent-color'],
                        color: 'white'
                      }}>
                        <h5>Accent Element</h5>
                        <p>This highlights your chosen accent color.</p>
                      </div>

                      <div className="preview-item" style={{
                        backgroundColor: editingStyle.variables['--hover-bg'],
                        color: editingStyle.variables['--text-tertiary']
                      }}>
                        <h5>Hover State</h5>
                        <p>This shows how hover states will appear.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="editor-footer">
          <div className="footer-left">
            <button className="secondary-btn" onClick={handleReset}>
              <FaUndo /> Reset to Default
            </button>
            {currentStyle && (
              <button
                className="danger-btn"
                onClick={() => {
                  if (onStyleDelete) {
                    onStyleDelete(currentStyle.id);
                  }
                  handleClose();
                }}
              >
                <FaTrash /> Delete Theme
              </button>
            )}
          </div>
          <div className="footer-right">
            <button className="secondary-btn" onClick={handleClose}>
              Cancel
            </button>
            <button className="primary-btn" onClick={handleSave}>
              <FaSave /> Save Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(ui, document.body);
};
