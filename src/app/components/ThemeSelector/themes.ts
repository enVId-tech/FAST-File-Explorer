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

export interface ThemeMeta {
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

export const BUILTIN_THEMES: ThemeMeta[] = [
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
