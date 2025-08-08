import React from 'react';
import './ThemeSelector.scss';

export type Theme = 
  | 'win11-light' 
  | 'win11-dark' 
  | 'win10-light' 
  | 'win10-dark' 
  | 'cyberpunk' 
  | 'retro' 
  | 'futuristic' 
  | 'nature';

interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const themeOptions: { value: Theme; label: string; description: string }[] = [
  { value: 'win11-light', label: 'Windows 11 Light', description: 'Clean, modern light theme' },
  { value: 'win11-dark', label: 'Windows 11 Dark', description: 'Sleek dark theme' },
  { value: 'win10-light', label: 'Windows 10 Light', description: 'Classic light theme' },
  { value: 'win10-dark', label: 'Windows 10 Dark', description: 'Traditional dark theme' },
  { value: 'cyberpunk', label: 'Cyberpunk', description: 'Neon-lit futuristic dark' },
  { value: 'retro', label: 'Retro', description: '80s/90s nostalgic computing' },
  { value: 'futuristic', label: 'Futuristic', description: 'Clean sci-fi aesthetic' },
  { value: 'nature', label: 'Nature', description: 'Organic, earthy tones' },
];

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange,
  isOpen,
  onToggle
}) => {
  return (
    <div className="theme-selector">
      <button className="theme-toggle" onClick={() => {
        console.log('Theme toggle clicked, isOpen:', isOpen);
        onToggle();
      }} title="Change Theme">
        🎨
      </button>
      
      {isOpen && (
        <div className="theme-dropdown">
          <div className="theme-dropdown-header">
            <h3>Choose Theme</h3>
          </div>
          <div className="theme-options">
            {themeOptions.map((theme) => (
              <button
                key={theme.value}
                className={`theme-option ${currentTheme === theme.value ? 'active' : ''}`}
                onClick={() => {
                  console.log('Theme option clicked:', theme.value);
                  onThemeChange(theme.value);
                  onToggle();
                }}
              >
                <div className="theme-preview" data-theme={theme.value}>
                  <div className="preview-bg"></div>
                  <div className="preview-accent"></div>
                </div>
                <div className="theme-info">
                  <span className="theme-label">{theme.label}</span>
                  <span className="theme-description">{theme.description}</span>
                </div>
                {currentTheme === theme.value && <span className="theme-active">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
