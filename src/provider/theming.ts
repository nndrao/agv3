import type OpenFin from '@openfin/core';
import type { CustomPaletteSet } from '@openfin/workspace-platform';
import {
  ColorSchemeOptionType,
  getCurrentSync,
  type WorkspacePlatformProvider
} from '@openfin/workspace-platform';
import { DockProvider } from './dock/dockProvider';

// Current color scheme
let currentColorScheme: 'light' | 'dark' = 'dark';

/**
 * Initialize the color scheme based on the saved preference or platform settings
 */
export async function initColorScheme(): Promise<void> {
  // First check localStorage
  const savedTheme = localStorage.getItem('agv3_theme') as 'light' | 'dark' | null;
  if (savedTheme) {
    currentColorScheme = savedTheme;
    console.log('[Theming] Loaded saved theme:', savedTheme);
  } else {
    // Get from platform
    try {
      const platform = getCurrentSync();
      const selectedScheme = await platform.Theme.getSelectedScheme();
      
      if (selectedScheme === ColorSchemeOptionType.System || !selectedScheme) {
        // Use system preference
        currentColorScheme = getSystemPreferredColorScheme();
      } else {
        currentColorScheme = selectedScheme as 'light' | 'dark';
      }
      
      // Save the preference
      localStorage.setItem('agv3_theme', currentColorScheme);
      console.log('[Theming] Initial theme set to:', currentColorScheme);
    } catch (error) {
      console.error('[Theming] Error getting selected scheme:', error);
    }
  }
}

/**
 * Set the color scheme and update all components
 * @param schemeType The color scheme to switch to
 */
export async function setColorScheme(schemeType: ColorSchemeOptionType): Promise<void> {
  console.log('[Theming] Setting color scheme to:', schemeType);
  
  let finalScheme: 'light' | 'dark';
  
  // If the scheme is System then use media query to get the OS setting
  if (schemeType === ColorSchemeOptionType.System) {
    finalScheme = getSystemPreferredColorScheme();
  } else {
    finalScheme = schemeType as 'light' | 'dark';
  }
  
  // Store the current scheme
  currentColorScheme = finalScheme;
  localStorage.setItem('agv3_theme', finalScheme);
  
  // Update all windows with the new theme
  await updateAllWindowsTheme(finalScheme);
  
  // Update dock buttons to reflect new theme icon
  await DockProvider.updateDock();
  
  // Notify any components using interop
  await notifyColorScheme(finalScheme);
}

/**
 * Get the current color scheme
 */
export function getCurrentColorScheme(): 'light' | 'dark' {
  return currentColorScheme;
}

/**
 * Update all windows with the new theme
 */
async function updateAllWindowsTheme(theme: 'light' | 'dark'): Promise<void> {
  try {
    const platform = getCurrentSync();
    const snapshot = await platform.getSnapshot();
    
    // Update all windows in the snapshot
    if (snapshot.windows) {
      for (const window of snapshot.windows) {
        try {
          const windowObj = fin.Window.wrapSync({ uuid: window.uuid || fin.me.uuid, name: window.name });
          
          // Update window theme
          await windowObj.executeJavaScript(`
            // Update root element
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add('${theme}');
            root.setAttribute('data-theme', '${theme}');
            
            // Update body dataset for ag-grid
            if (document.body) {
              document.body.dataset.agThemeMode = '${theme}';
            }
            
            // Trigger theme change for components that listen
            window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: '${theme}' } }));
          `);
          
          // Update child views if any
          if (window.childWindows) {
            for (const childWindow of window.childWindows) {
              for (const view of childWindow.views || []) {
                try {
                  const viewObj = fin.View.wrapSync({ uuid: view.uuid || fin.me.uuid, name: view.name });
                  await viewObj.executeJavaScript(`
                    const root = document.documentElement;
                    root.classList.remove('light', 'dark');
                    root.classList.add('${theme}');
                    root.setAttribute('data-theme', '${theme}');
                    if (document.body) {
                      document.body.dataset.agThemeMode = '${theme}';
                    }
                    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: '${theme}' } }));
                  `);
                } catch (e) {
                  console.warn('[Theming] Could not update view:', view.name, e);
                }
              }
            }
          }
        } catch (e) {
          console.warn('[Theming] Could not update window:', window.name, e);
        }
      }
    }
  } catch (error) {
    console.error('[Theming] Failed to update windows:', error);
  }
}

/**
 * Notify components about theme change via interop
 */
async function notifyColorScheme(scheme: 'light' | 'dark'): Promise<void> {
  try {
    // Get the platform's theme configuration
    const platform = getCurrentSync();
    const themes = await platform.Theme.getThemes();
    
    let palette: CustomPaletteSet | undefined;
    if (themes.length > 0) {
      const theme = themes[0];
      if ('palettes' in theme && theme.palettes) {
        palette = theme.palettes[scheme];
      } else if ('palette' in theme) {
        palette = theme.palette;
      }
    }
    
    // Broadcast theme change via interop
    if (fin.me.interop) {
      const appSessionContextGroup = await fin.me.interop.joinSessionContextGroup('platform/events');
      await appSessionContextGroup.setContext({
        type: 'platform.theme',
        schemeType: scheme,
        palette: palette
      } as OpenFin.Context);
    }
  } catch (error) {
    console.warn('[Theming] Could not notify theme change via interop:', error);
  }
}

/**
 * Calculate the preferred color scheme based on the OS settings
 */
function getSystemPreferredColorScheme(): 'light' | 'dark' {
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Create platform override for handling theme changes
 */
export function createThemingOverride<T extends WorkspacePlatformProvider>(
  Base: OpenFin.Constructor<T>
): OpenFin.Constructor<T> {
  return class ThemingOverride extends Base {
    /**
     * Handle theme selection changes
     */
    public async setSelectedScheme(schemeType: ColorSchemeOptionType): Promise<void> {
      // Handle the theme change
      await setColorScheme(schemeType);
      
      // Call parent
      return super.setSelectedScheme(schemeType);
    }
    
    /**
     * Get the current selected scheme
     */
    public async getSelectedScheme(): Promise<ColorSchemeOptionType> {
      return currentColorScheme;
    }
  };
}