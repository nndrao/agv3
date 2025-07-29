import { DockButton, DockButtonNames, DockDropdownConfig } from '@openfin/workspace';
import { createColorfulIcon, createDynamicIcon } from './dynamicIcons';

// Track developer mode state with localStorage persistence
let developerModeEnabled: boolean | null = null;

// Load developer mode state from localStorage
function loadDeveloperModeState(): boolean {
  if (developerModeEnabled !== null) {
    return developerModeEnabled;
  }
  
  try {
    const stored = localStorage.getItem('agv3_developer_mode');
    // Default to false if not set
    developerModeEnabled = stored === 'true' ? true : false;
    console.log('[DockButtons] Loading developer mode from localStorage:', {
      storedValue: stored,
      parsed: developerModeEnabled,
      rawLocalStorage: localStorage.getItem('agv3_developer_mode')
    });
  } catch (e) {
    console.error('[DockButtons] Error loading developer mode state:', e);
    developerModeEnabled = false;
  }
  
  return developerModeEnabled;
}

export function isDeveloperModeEnabled(): boolean {
  return loadDeveloperModeState();
}

export function setDeveloperMode(enabled: boolean): void {
  developerModeEnabled = enabled;
  try {
    localStorage.setItem('agv3_developer_mode', enabled.toString());
  } catch (e) {
    console.error('Failed to save developer mode state:', e);
  }
}

export function createDockButtons(includeDeveloperButtons = false): DockButton[] {
  // Use relative paths that work regardless of port
  const baseUrl = window.location.origin;
  const devMode = isDeveloperModeEnabled();
  console.log('[DockButtons] createDockButtons called with:', {
    includeDeveloperButtons,
    devMode,
    developerModeEnabled,
    localStorage: typeof window !== 'undefined' ? localStorage.getItem('agv3_developer_mode') : 'N/A'
  });
  
  // Get current theme for icon selection
  const currentTheme = localStorage.getItem('agv3_theme') || 'dark';
  const themeTooltip = currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
  
  // Always visible buttons
  const buttons: DockButton[] = [
    {
      tooltip: 'Configure Datasource',
      iconUrl: createDynamicIcon({
        text: 'DB',
        backgroundColor: '#0EA5E9',
        textColor: '#FFFFFF',
        fontSize: 10
      }),
      action: {
        id: 'configure-datasource-main',
        customData: {}
      },
      type: 'Custom' as const
    },
    {
      tooltip: 'DataGrid (Direct STOMP)',
      iconUrl: createDynamicIcon({
        text: 'DG',
        backgroundColor: '#10B981',
        textColor: '#FFFFFF',
        fontSize: 10
      }),
      action: {
        id: 'new-datagrid-stomp-main',
        customData: {}
      },
      type: 'Custom' as const
    },
    {
      tooltip: 'DataGrid (Shared STOMP)',
      iconUrl: createDynamicIcon({
        text: 'DS',
        backgroundColor: '#3B82F6',
        textColor: '#FFFFFF',
        fontSize: 10
      }),
      action: {
        id: 'new-datagrid-stomp-shared',
        customData: {}
      },
      type: 'Custom' as const
    },
    {
      tooltip: themeTooltip,
      iconUrl: createColorfulIcon(currentTheme === 'dark' ? 'sun' : 'moon'),
      action: {
        id: 'toggle-theme',
        customData: {}
      },
      type: 'Custom' as const
    }
  ];
  
  // Add developer tools dropdown button if enabled
  if (includeDeveloperButtons || devMode) {
    // Create a dropdown button with developer options
    const toolsButton: DockDropdownConfig = {
      type: DockButtonNames.DropdownButton,
      tooltip: 'Developer Tools',
      iconUrl: createColorfulIcon('gear'),
      options: [
        {
          tooltip: 'New DataTable',
          iconUrl: `${baseUrl}/icons/table.svg`,
          action: {
            id: 'new-datatable',
            customData: {}
          }
        },
        {
          tooltip: 'DataGrid (Direct STOMP)',
          iconUrl: `${baseUrl}/icons/grid.svg`,
          action: {
            id: 'new-datagrid-stomp',
            customData: {}
          }
        },
        {
          tooltip: 'Configure Datasource',
          iconUrl: `${baseUrl}/icons/database.svg`,
          action: {
            id: 'configure-datasource',
            customData: {}
          }
        },
        {
          tooltip: 'Active Providers',
          iconUrl: `${baseUrl}/icons/activity.svg`,
          action: {
            id: 'show-providers',
            customData: {}
          }
        },
        {
          tooltip: 'Reload Dock',
          iconUrl: createColorfulIcon('refresh'),
          action: {
            id: 'reload-dock',
            customData: {}
          }
        },
        {
          tooltip: 'Open DevTools',
          iconUrl: createColorfulIcon('devtools'),
          action: {
            id: 'open-devtools',
            customData: {}
          }
        }
      ]
    };
    
    buttons.push(toolsButton as DockButton);
  }
  
  console.log('[DockButtons] Final button configuration:', {
    totalButtons: buttons.length,
    includeDeveloperButtons: includeDeveloperButtons || devMode,
    buttonList: buttons.map(btn => 'tooltip' in btn ? btn.tooltip : 'Dropdown'),
    theme: currentTheme
  });
  
  return buttons;
}

// Action handlers are now registered in the main.ts file as CustomActionsMap

// Export function to refresh dock with new button visibility
export async function refreshDockButtons(): Promise<void> {
  const { DockProvider } = await import('./dockProvider');
  
  console.log('[DockButtons] Refreshing dock buttons with developer mode:', isDeveloperModeEnabled());
  
  try {
    // Update the dock configuration without re-registering
    await DockProvider.updateDock();
    console.log('[DockButtons] Dock buttons updated');
  } catch (error) {
    console.error('[DockButtons] Error refreshing dock:', error);
  }
}