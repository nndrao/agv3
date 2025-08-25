import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { StorageClient } from '@/services/storage/storageClient';
import { UnifiedConfig } from '@/services/storage/types';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

interface ThemeConfig {
  theme: Theme;
  lastUpdated: Date;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const configIdRef = useRef<string>('agv3-theme-config');

  const saveThemeToConfig = async (newTheme: Theme) => {
    try {
      const themeConfig: ThemeConfig = {
        theme: newTheme,
        lastUpdated: new Date()
      };
      
      // Check if config exists
      const existing = await StorageClient.get(configIdRef.current);
      
      if (existing) {
        // Update existing
        await StorageClient.update(configIdRef.current, {
          config: themeConfig,
          lastUpdated: new Date(),
          lastUpdatedBy: 'current-user'
        });
      } else {
        // Create new
        const unifiedConfig: UnifiedConfig = {
          configId: configIdRef.current,
          appId: 'agv3',
          userId: 'system',
          componentType: 'system',
          componentSubType: 'theme',
          name: 'Theme Configuration',
          description: 'Application theme settings',
          config: themeConfig,
          settings: [],
          activeSetting: 'default',
          createdBy: 'system',
          lastUpdatedBy: 'system',
          creationTime: new Date(),
          lastUpdated: new Date()
        };
        
        await StorageClient.save(unifiedConfig);
      }
      
      console.log('[ThemeProvider] Saved theme to Configuration Service:', newTheme);
    } catch (error) {
      console.error('[ThemeProvider] Failed to save theme to Configuration Service:', error);
      // No fallback - handle error appropriately
      throw error;
    }
  };

  // Load theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Try to load from Configuration Service
        const config = await StorageClient.get(configIdRef.current);
        
        if (config && config.config) {
          const themeConfig = config.config as ThemeConfig;
          setThemeState(themeConfig.theme);
          console.log('[ThemeProvider] Loaded theme from Configuration Service:', themeConfig.theme);
        }
      } catch (error) {
        console.error('[ThemeProvider] Failed to load theme from Configuration Service:', error);
        // Use default theme on error
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (isLoading) return;
    
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme, isLoading]);

  const value = {
    theme,
    setTheme: async (newTheme: Theme) => {
      setThemeState(newTheme);
      await saveThemeToConfig(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};