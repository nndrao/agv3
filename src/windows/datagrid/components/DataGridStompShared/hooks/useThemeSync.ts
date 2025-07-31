import { useMemo, useEffect } from 'react';
import { useTheme } from '@/components/theme-provider';
import { ThemeState } from '../types';

// Function to set dark mode on document body
function setDarkMode(enabled: boolean) {
  document.body.dataset.agThemeMode = enabled ? "dark" : "light";
}

export function useThemeSync(): ThemeState & { theme: string; setTheme: (theme: any) => void } {
  const { theme: appTheme, setTheme } = useTheme();
  
  // Memoize dark mode calculation to prevent re-computation
  const isDarkMode = useMemo(() => {
    return appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, [appTheme]);
  
  // Update the body dataset when dark mode changes
  useEffect(() => {
    setDarkMode(isDarkMode);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  
  // Check if styles are loaded and initialize theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (!root.classList.contains('light') && !root.classList.contains('dark')) {
      root.classList.add('light');
    }
  }, []);
  
  // Memoize the class name
  const className = useMemo(() => {
    return `h-full flex flex-col ${isDarkMode ? 'dark' : 'light'}`;
  }, [isDarkMode]);
  
  return {
    isDarkMode,
    className,
    theme: appTheme,
    setTheme
  };
}