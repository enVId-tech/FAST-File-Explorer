import { CustomStyle } from '../components/CustomStyleEditor/CustomStyleEditor';

export class CustomStyleManager {
  private static readonly STORAGE_KEY = 'fast-file-explorer-custom-styles';

  static getAllStyles(): CustomStyle[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load custom styles:', error);
      return [];
    }
  }

  static saveStyle(style: CustomStyle): void {
    try {
      const styles = this.getAllStyles();
      const existingIndex = styles.findIndex(s => s.id === style.id);
      
      if (existingIndex >= 0) {
        styles[existingIndex] = style;
      } else {
        styles.push(style);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(styles));
    } catch (error) {
      console.error('Failed to save custom style:', error);
      throw new Error('Failed to save custom style');
    }
  }

  static deleteStyle(styleId: string): void {
    try {
      const styles = this.getAllStyles();
      const filteredStyles = styles.filter(s => s.id !== styleId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredStyles));
    } catch (error) {
      console.error('Failed to delete custom style:', error);
      throw new Error('Failed to delete custom style');
    }
  }

  static getStyle(styleId: string): CustomStyle | null {
    const styles = this.getAllStyles();
    return styles.find(s => s.id === styleId) || null;
  }

  static applyStyleToDocument(style: CustomStyle): void {
    const root = document.documentElement;
    
    // Apply CSS variables
    Object.entries(style.variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Store the applied style info
    root.setAttribute('data-custom-style', style.id);
  }

  static removeCustomStyleFromDocument(): void {
    const root = document.documentElement;
    
    // List of CSS variables that could be custom
    const customVariables = [
      '--primary-bg',
      '--secondary-bg',
      '--surface-bg',
      '--hover-bg',
      '--accent-color',
      '--accent-hover',
      '--accent-active',
      '--text-primary',
      '--text-secondary',
      '--text-tertiary',
      '--border-color',
      '--border-hover',
      '--selection-bg',
      '--selection-border',
      '--shadow-small',
      '--shadow-medium',
      '--shadow-large'
    ];
    
    // Remove only custom CSS variables
    customVariables.forEach((property) => {
      root.style.removeProperty(property);
    });
    
    root.removeAttribute('data-custom-style');
    root.removeAttribute('data-custom-theme');
  }

  static clearDocumentStyles(): void {
    this.removeCustomStyleFromDocument();
  }

  static exportStyle(style: CustomStyle): string {
    return JSON.stringify(style, null, 2);
  }

  static importStyle(styleData: any): boolean {
    try {
      // Validate the imported style has required properties
      if (!styleData.name || !styleData.variables) {
        return false;
      }
      
      // Create a new style with unique ID
      const importedStyle: CustomStyle = {
        id: `imported-${Date.now()}`,
        name: styleData.name,
        description: styleData.description || 'Imported theme',
        variables: styleData.variables,
        driveIcons: styleData.driveIcons || {
          'hard-drive': 'FaHdd',
          'usb': 'FaUsb',
          'cd-rom': 'FaCompactDisc',
          'network': 'FaNetworkWired',
          'cloud': 'FaCloud',
          'default': 'FaFolder'
        },
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      // Save the imported style
      this.saveStyle(importedStyle);
      return true;
    } catch (error) {
      console.error('Failed to import style:', error);
      return false;
    }
  }

  static generateCSS(style: CustomStyle): string {
    const cssVariables = Object.entries(style.variables)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join('\n');
    
    return `/* Custom Style: ${style.name} */\n[data-theme="custom-${style.id}"] {\n${cssVariables}\n}`;
  }

  static duplicateStyle(style: CustomStyle): CustomStyle {
    const now = new Date().toISOString();
    return {
      ...style,
      id: `custom-${Date.now()}`,
      name: `${style.name} (Copy)`,
      created: now,
      modified: now
    };
  }

  private static getDefaultStyle(): CustomStyle {
    return {
      id: 'default',
      name: 'Default',
      description: 'Default style',
      variables: {
        '--primary-bg': '#f6f7fb',
        '--secondary-bg': '#ffffff',
        '--surface-bg': '#ffffff',
        '--hover-bg': '#f3f4f6',
        '--accent-color': '#2563eb',
        '--accent-hover': '#1d4ed8',
        '--accent-active': '#1e40af',
        '--text-primary': '#0f172a',
        '--text-secondary': '#334155',
        '--text-tertiary': '#64748b',
        '--border-color': '#e5e7eb',
        '--border-hover': '#d1d5db',
        '--selection-bg': 'rgba(37, 99, 235, 0.14)',
        '--selection-border': 'rgba(37, 99, 235, 0.3)',
        '--shadow-small': '0 1px 3px rgba(15, 23, 42, 0.06)',
        '--shadow-medium': '0 6px 16px rgba(15, 23, 42, 0.08)',
        '--shadow-large': '0 12px 28px rgba(15, 23, 42, 0.12)',
      },
      driveIcons: {
        'hard-drive': 'FaHdd',
        'usb': 'FaUsb',
        'cd-rom': 'FaCompactDisc',
        'network': 'FaNetworkWired',
        'cloud': 'FaCloud',
        'default': 'FaFolder'
      },
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };
  }
}
