import { CustomStyle } from './CustomStyleEditor';

export const defaultCustomStyle: Omit<CustomStyle, 'id' | 'created' | 'modified'> = {
  name: 'My Custom Theme',
  description: 'A custom theme created by me',
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
  }
};

// Simple debounce utility
export const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
