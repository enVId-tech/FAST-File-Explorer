import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ThemeSelector.scss';
import { CustomStyleManager } from '../CustomStyleManager';
import { CustomStyleEditor, CustomStyle } from '../CustomStyleEditor';

// Public Theme type used by parent components (allows custom ids)
export type Theme =
  | 'win11-dark'
  | 'win11-light'
  | 'win10-dark'
  | 'win10-light'
  | 'cyberpunk'
  | 'futuristic'
  | 'nature'
  | 'retro'
  | (string & {});

interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  class?: string;
  isCustom?: boolean;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
}

const BUILTIN_THEMES: ThemeMeta[] = [
  { 
    id: 'win11-dark', 
    name: 'Windows 11 Dark', 
    description: 'Modern dark theme with fluent design',
    class: 'win11-dark',
    colors: {
      primary: '#202020',
      secondary: '#2d2d30',
      accent: '#0078d4',
      text: '#ffffff'
    }
  },
  { 
    id: 'win11-light', 
    name: 'Windows 11 Light', 
    description: 'Clean light theme with modern aesthetics',
    class: 'win11-light',
    colors: {
      primary: '#f6f7fb',
      secondary: '#ffffff',
      accent: '#2563eb',
      text: '#0f172a'
    }
  },
  { 
    id: 'win10-dark', 
    name: 'Windows 10 Dark', 
    description: 'Classic Windows 10 dark mode',
    class: 'win10-dark',
    colors: {
      primary: '#1f1f23',
      secondary: '#2d2d30',
      accent: '#0078d4',
      text: '#ffffff'
    }
  },
  { 
    id: 'win10-light', 
    name: 'Windows 10 Light', 
    description: 'Traditional Windows 10 light theme',
    class: 'win10-light',
    colors: {
      primary: '#e1e1e1',
      secondary: '#f0f0f0',
      accent: '#0078d4',
      text: '#000000'
    }
  },
  { 
    id: 'cyberpunk', 
    name: 'Cyberpunk', 
    description: 'Neon-inspired futuristic theme',
    class: 'cyberpunk',
    colors: {
      primary: '#0a0a0f',
      secondary: '#121218',
      accent: '#00ffff',
      text: '#ffffff'
    }
  },
  { 
    id: 'futuristic', 
    name: 'Futuristic', 
    description: 'Sleek sci-fi inspired interface',
    class: 'futuristic',
    colors: {
      primary: '#0d1117',
      secondary: '#161b22',
      accent: '#58a6ff',
      text: '#f0f6fc'
    }
  },
  { 
    id: 'nature', 
    name: 'Nature', 
    description: 'Earth-toned organic theme',
    class: 'nature',
    colors: {
      primary: '#f5f7f0',
      secondary: '#ffffff',
      accent: '#2d5016',
      text: '#1a1a1a'
    }
  },
  { 
    id: 'retro', 
    name: 'Retro', 
    description: 'Vintage computing aesthetics',
    class: 'retro',
    colors: {
      primary: '#f4f1e8',
      secondary: '#ffffff',
      accent: '#ff6b35',
      text: '#2c1810'
    }
  },
];

interface ThemeSelectorProps {
  currentTheme?: Theme; // if omitted, component manages its own selection state (fallback)
  onThemeChange?: (theme: Theme) => void;
  isOpen?: boolean; // if omitted, local dropdown state is used
  onToggle?: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme: controlledTheme, onThemeChange, isOpen: controlledOpen, onToggle }) => {
  // Local state fallbacks for uncontrolled usage
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlledOpen = controlledOpen !== undefined;
  const isOpen = controlledOpen ?? internalOpen;

  const toggleDropdown = () => {
    if (isControlledOpen) {
      onToggle?.();
    } else {
      setInternalOpen(prev => !prev);
    }
  };

  const closeDropdown = () => {
    if (isControlledOpen) {
      // Only close if currently open to avoid unintended opens on outside clicks
      if (controlledOpen) onToggle?.();
    } else {
      setInternalOpen(false);
    }
  };

  const [internalTheme, setInternalTheme] = useState<Theme>('win11-dark');
  const currentTheme = controlledTheme ?? internalTheme;
  const setCurrentTheme = controlledTheme === undefined ? setInternalTheme : (val: Theme) => onThemeChange?.(val);

  const [customThemes, setCustomThemes] = useState<ThemeMeta[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingStyle, setEditingStyle] = useState<CustomStyle | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCustomThemes();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
  closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // While editing a style, keep the custom themes list in sync for real-time preview (name/colors)
  useEffect(() => {
    if (!showEditor || !editingStyle) return;
    setCustomThemes(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(t => t.id === editingStyle.id);
      const meta: ThemeMeta = {
        id: editingStyle.id,
        name: editingStyle.name,
        description: editingStyle.description,
        isCustom: true,
        colors: {
          primary: editingStyle.variables['--primary-bg'],
          secondary: editingStyle.variables['--secondary-bg'],
          accent: editingStyle.variables['--accent-color'],
          text: editingStyle.variables['--text-primary']
        }
      };
      if (idx >= 0) {
        updated[idx] = meta;
      } else {
        updated.push(meta);
      }
      return updated;
    });
  }, [showEditor, editingStyle]);

  const loadCustomThemes = useCallback(() => {
    const themes = CustomStyleManager.getAllStyles().map(style => ({
      id: style.id,
      name: style.name,
      description: style.description,
      isCustom: true,
      colors: {
        primary: style.variables['--primary-bg'],
        secondary: style.variables['--secondary-bg'],
        accent: style.variables['--accent-color'],
        text: style.variables['--text-primary']
      }
    }));
    setCustomThemes(themes);
  }, []);

  // Transition-only UI feedback (actual theme application handled centrally by parent)
  const beginTransition = useCallback(() => {
    const body = document.body;
    setIsTransitioning(true);
    body.classList.add('theme-transitioning');
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      body.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 300);
  }, []);

  const handleThemeSelect = (themeId: string) => {
  if (themeId === currentTheme) return;

  // Controlled: notify parent; Uncontrolled: update own state
  setCurrentTheme(themeId);
  beginTransition();
  closeDropdown();
  };

  const handleCreateNew = () => {
    setEditingStyle(null);
    setShowEditor(true);
  closeDropdown();
  };

  const handleEditCustomTheme = (themeId: string) => {
    const customStyle = CustomStyleManager.getStyle(themeId);
    setEditingStyle(customStyle);
    setShowEditor(true);
  closeDropdown();
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    if (confirm('Are you sure you want to delete this custom theme?')) {
      CustomStyleManager.deleteStyle(themeId);
      loadCustomThemes();
      
      // If we're currently using this theme, switch to default
      if (currentTheme === themeId) {
        handleThemeSelect('win11-dark');
      }
    }
  };

  const handleExportTheme = (themeId: string) => {
    const customStyle = CustomStyleManager.getStyle(themeId);
    if (customStyle) {
      const dataStr = JSON.stringify(customStyle, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customStyle.name.replace(/\s+/g, '_')}_theme.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportTheme = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const themeData = JSON.parse(event.target?.result as string);
            const success = CustomStyleManager.importStyle(themeData);
            if (success) {
              loadCustomThemes();
              alert('Theme imported successfully!');
            } else {
              alert('Failed to import theme. Please check the file format.');
            }
          } catch (error) {
            alert('Invalid theme file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleEditorSave = (style: CustomStyle) => {
    CustomStyleManager.saveStyle(style);
    loadCustomThemes();
    setShowEditor(false);
    setEditingStyle(null);
    
  // If this is the current theme, parent should already react via onThemeChange/currentTheme
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingStyle(null);
  // Reload from storage to drop any unsaved preview changes in the list
  loadCustomThemes();
  // Re-apply the currently selected theme to avoid lingering preview state
  const root = document.documentElement;
  const body = document.body;
  const appRoot = document.getElementById('root');
  CustomStyleManager.clearDocumentStyles();
  root.setAttribute('data-theme', String(currentTheme));
  body.setAttribute('data-theme', String(currentTheme));
  if (appRoot) appRoot.setAttribute('data-theme', String(currentTheme));
  root.removeAttribute('data-custom-theme');
  body.removeAttribute('data-custom-theme');
  if (appRoot) appRoot.removeAttribute('data-custom-theme');
  };

  const handleEditorApply = (style: CustomStyle) => {
    // Apply theme for preview without saving - apply directly for live preview
    const root = document.documentElement;
    const body = document.body;
    const appRoot = document.getElementById('root');
    
    // Clear any existing themes
    CustomStyleManager.clearDocumentStyles();
    root.removeAttribute('data-theme');
    root.removeAttribute('data-custom-theme');
    body.removeAttribute('data-theme');
    body.removeAttribute('data-custom-theme');
    if (appRoot) {
      appRoot.removeAttribute('data-theme');
      appRoot.removeAttribute('data-custom-theme');
    }
    
    // Apply the preview style directly
    CustomStyleManager.applyStyleToDocument(style);
    root.setAttribute('data-theme', 'custom');
    root.setAttribute('data-custom-theme', style.id);
    body.setAttribute('data-theme', 'custom');
    body.setAttribute('data-custom-theme', style.id);
    if (appRoot) {
      appRoot.setAttribute('data-theme', 'custom');
      appRoot.setAttribute('data-custom-theme', style.id);
    }

    // Update local editing state so the list reflects live changes
    setEditingStyle(style);
    setCustomThemes(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(t => t.id === style.id);
      const meta: ThemeMeta = {
        id: style.id,
        name: style.name,
        description: style.description,
        isCustom: true,
        colors: {
          primary: style.variables['--primary-bg'],
          secondary: style.variables['--secondary-bg'],
          accent: style.variables['--accent-color'],
          text: style.variables['--text-primary']
        }
      };
      if (idx >= 0) {
        updated[idx] = meta;
      } else {
        updated.push(meta);
      }
      return updated;
    });
  };

  const allThemes: ThemeMeta[] = [...BUILTIN_THEMES, ...customThemes];
  const getCurrentTheme = () => {
    return allThemes.find(t => t.id === currentTheme) || BUILTIN_THEMES[0];
  };

  const renderThemePreview = (theme: ThemeMeta) => {
    if (!theme.colors) return null;
    
    return (
      <div className="theme-preview">
        <div 
          className="theme-preview__background"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <div 
            className="theme-preview__secondary"
            style={{ backgroundColor: theme.colors.secondary }}
          />
          <div 
            className="theme-preview__accent"
            style={{ backgroundColor: theme.colors.accent }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="theme-selector" ref={dropdownRef}>
        <button 
          className={`theme-selector__toggle ${isTransitioning ? 'transitioning' : ''}`}
          onClick={toggleDropdown}
          title={`Current theme: ${getCurrentTheme().name}`}
          aria-label="Theme selector"
        >
          <span className="theme-selector__icon">🎨</span>
          <span className="theme-selector__current-theme">
            {getCurrentTheme().name}
          </span>
        </button>

        {isOpen && (
          <div className="theme-selector__dropdown">
            <div className="theme-selector__header">
              <h3 className="theme-selector__title">Choose Theme</h3>
              <div className="theme-selector__actions">
                <button
                  className="theme-selector__action-btn"
                  onClick={handleImportTheme}
                  title="Import theme"
                  aria-label="Import theme"
                >
                  📥
                </button>
                <button
                  className="theme-selector__action-btn"
                  onClick={handleCreateNew}
                  title="Create new theme"
                  aria-label="Create new theme"
                >
                  ➕
                </button>
              </div>
            </div>

            <div className="theme-selector__content">
              {BUILTIN_THEMES.length > 0 && (
                <div className="theme-selector__section">
                  <h4 className="theme-selector__section-title">Built-in Themes</h4>
                  <div className="theme-selector__grid">
                    {BUILTIN_THEMES.map(theme => (
                      <div
                        key={theme.id}
                        className={`theme-selector__option ${currentTheme === theme.id ? 'active' : ''}`}
                        onClick={() => handleThemeSelect(theme.id)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleThemeSelect(theme.id);
                          }
                        }}
                      >
                        <div className="theme-selector__option-content">
                          <div className="theme-selector__info">
                            <div className="theme-selector__name">{theme.name}</div>
                            <div className="theme-selector__description">{theme.description}</div>
                          </div>
                          {renderThemePreview(theme)}
                        </div>
                        {currentTheme === theme.id && (
                          <div className="theme-selector__active-indicator">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {customThemes.length > 0 && (
                <div className="theme-selector__section">
                  <h4 className="theme-selector__section-title">Custom Themes</h4>
                  <div className="theme-selector__grid">
                    {customThemes.map(theme => (
                      <div
                        key={theme.id}
                        className={`theme-selector__option theme-selector__option--custom ${currentTheme === theme.id ? 'active' : ''}`}
                      >
                        <div 
                          className="theme-selector__option-content"
                          onClick={() => handleThemeSelect(theme.id)}
                          role="button"
                          tabIndex={0}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              handleThemeSelect(theme.id);
                            }
                          }}
                        >
                          <div className="theme-selector__info">
                            <div className="theme-selector__name">{theme.name}</div>
                            <div className="theme-selector__description">{theme.description}</div>
                            <div className="theme-selector__badge">Custom</div>
                          </div>
                          {renderThemePreview(theme)}
                        </div>
                        <div className="theme-selector__custom-actions">
                          <button
                            className="theme-selector__custom-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCustomTheme(theme.id);
                            }}
                            title="Edit theme"
                            aria-label="Edit theme"
                          >
                            ✏️
                          </button>
                          <button
                            className="theme-selector__custom-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportTheme(theme.id);
                            }}
                            title="Export theme"
                            aria-label="Export theme"
                          >
                            📤
                          </button>
                          <button
                            className="theme-selector__custom-action theme-selector__custom-action--danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomTheme(theme.id);
                            }}
                            title="Delete theme"
                            aria-label="Delete theme"
                          >
                            🗑️
                          </button>
                        </div>
                        {currentTheme === theme.id && (
                          <div className="theme-selector__active-indicator">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEditor && (
        <CustomStyleEditor
          isOpen={showEditor}
          onClose={handleEditorCancel}
          currentStyle={editingStyle}
          onStyleSave={handleEditorSave}
          onStyleDelete={(styleId) => {
            handleDeleteCustomTheme(styleId);
          }}
          onStyleApply={handleEditorApply}
          customStyles={customThemes.map(t => CustomStyleManager.getStyle(t.id)).filter(Boolean) as CustomStyle[]}
        />
      )}
    </>
  );
};
