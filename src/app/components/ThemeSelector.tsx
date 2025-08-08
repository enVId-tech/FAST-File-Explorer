import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ThemeSelector.scss';
import { CustomStyleManager } from './CustomStyleManager';
import { CustomStyleEditor, CustomStyle } from './CustomStyleEditor';

interface Theme {
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

const BUILTIN_THEMES: Theme[] = [
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

export const ThemeSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('win11-dark');
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingStyle, setEditingStyle] = useState<CustomStyle | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCustomThemes();
    
    // Load saved theme
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme, false); // No transition on initial load
    } else {
      applyTheme('win11-dark', false);
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  const applyTheme = useCallback((themeId: string, withTransition = true) => {
    const body = document.body;
    const root = document.documentElement;
    
    if (withTransition) {
      setIsTransitioning(true);
      body.classList.add('theme-transitioning');
    }

    // Clear any existing theme data attributes and classes
    root.removeAttribute('data-theme');
    root.removeAttribute('data-custom-theme');
    
    // Remove all possible theme classes (legacy cleanup)
    const allThemes = [...BUILTIN_THEMES, ...customThemes];
    allThemes.forEach(theme => {
      if (theme.class) {
        body.classList.remove(theme.class);
      }
    });
    
    // Apply new theme
    const theme = allThemes.find(t => t.id === themeId);
    if (theme) {
      if (theme.isCustom) {
        // Apply custom theme CSS variables
        const customStyle = CustomStyleManager.getStyle(themeId);
        if (customStyle) {
          // Clear any built-in theme styles first
          CustomStyleManager.clearDocumentStyles();
          // Apply custom theme
          CustomStyleManager.applyStyleToDocument(customStyle);
          root.setAttribute('data-theme', 'custom');
          root.setAttribute('data-custom-theme', themeId);
        }
      } else {
        // Clear any custom CSS variables first
        CustomStyleManager.clearDocumentStyles();
        // Apply built-in theme using data-theme attribute
        root.setAttribute('data-theme', themeId);
      }
    }

    if (withTransition) {
      // Clear transition after animation completes
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        body.classList.remove('theme-transitioning');
        setIsTransitioning(false);
      }, 300);
    }
  }, [customThemes]);

  const handleThemeSelect = (themeId: string) => {
    if (themeId === currentTheme) return;
    
    setCurrentTheme(themeId);
    localStorage.setItem('selectedTheme', themeId);
    applyTheme(themeId, true);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    setEditingStyle(null);
    setShowEditor(true);
    setIsOpen(false);
  };

  const handleEditCustomTheme = (themeId: string) => {
    const customStyle = CustomStyleManager.getStyle(themeId);
    setEditingStyle(customStyle);
    setShowEditor(true);
    setIsOpen(false);
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
    
    // If this is the current theme, reapply it
    if (currentTheme === style.id) {
      applyTheme(style.id, false);
    }
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setEditingStyle(null);
  };

  const handleEditorApply = (style: CustomStyle) => {
    // Apply theme for preview without saving - apply directly for live preview
    const root = document.documentElement;
    
    // Clear any existing themes
    CustomStyleManager.clearDocumentStyles();
    root.removeAttribute('data-theme');
    root.removeAttribute('data-custom-theme');
    
    // Apply the preview style directly
    CustomStyleManager.applyStyleToDocument(style);
    root.setAttribute('data-theme', 'custom');
    root.setAttribute('data-custom-theme', style.id);
  };

  const allThemes = [...BUILTIN_THEMES, ...customThemes];
  const getCurrentTheme = () => {
    return allThemes.find(t => t.id === currentTheme) || BUILTIN_THEMES[0];
  };

  const renderThemePreview = (theme: Theme) => {
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
          onClick={() => setIsOpen(!isOpen)}
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
