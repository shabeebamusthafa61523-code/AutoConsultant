import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('benz_theme');
    if (saved) return saved;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const rootDiv = document.getElementById('root');

    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      if (rootDiv) rootDiv.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      if (rootDiv) rootDiv.classList.remove('dark');
    }
    localStorage.setItem('benz_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
