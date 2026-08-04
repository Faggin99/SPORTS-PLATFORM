import { createContext, useContext, useMemo, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    name: 'light',
    colors: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      secondary: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceHover: '#f1f5f9',
      border: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    }
  },
  dark: {
    name: 'dark',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      secondary: '#64748b',
      background: '#0f172a',
      surface: '#1e293b',
      surfaceHover: '#334155',
      border: '#334155',
      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    }
  }
};

// Utilitários de luminância pra escolher contraste de texto sobre a cor primária
function clamp8(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace('#', '');
  if (h.length < 6) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function darkenHex(hex, ratio) {
  const rgb = hexToRgb(hex); if (!rgb) return hex;
  const [r, g, b] = rgb;
  return '#' + [r * (1 - ratio), g * (1 - ratio), b * (1 - ratio)]
    .map((x) => clamp8(x).toString(16).padStart(2, '0')).join('');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved || 'light';
  });
  // Cor do clube ativo — setada via setClubPrimary pelo ClubContext consumer
  const [clubPrimary, setClubPrimary] = useState(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Resolução do tema: cor do clube ativo sobrescreve a primary do tema.
  const colors = useMemo(() => {
    const base = themes[theme].colors;
    if (!clubPrimary) return base;
    return {
      ...base,
      primary: clubPrimary,
      primaryHover: darkenHex(clubPrimary, 0.2),
      info: clubPrimary,  // links/info passam a usar a mesma cor
    };
  }, [theme, clubPrimary]);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    colors,
    isDark: theme === 'dark',
    // Permite que o ClubProvider injete a cor do clube ativo aqui
    setClubPrimary,
    clubPrimary,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
