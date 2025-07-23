import { DockButton, DockButtonNames, DockDropdownConfig } from '@openfin/workspace';

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
  
  // Always visible buttons
  const buttons: DockButton[] = [
    {
      tooltip: 'DataGrid Simplified',
      iconUrl: `${baseUrl}/icons/grid-simple.svg`,
      action: {
        id: 'new-datagrid-stomp-simplified',
        customData: {}
      }
    },
    {
      tooltip: 'Manage DataGrid Instances',
      iconUrl: `${baseUrl}/icons/layers.svg`,
      action: {
        id: 'manage-datagrid-instances',
        customData: {}
      }
    }
  ];
  
  // Add developer tools dropdown button if enabled
  if (includeDeveloperButtons || devMode) {
    // Create a dropdown button with developer options
    const toolsButton: DockDropdownConfig = {
      type: DockButtonNames.DropdownButton,
      tooltip: 'Developer Tools',
      iconUrl: `${baseUrl}/icons/tools.svg`,
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
          tooltip: 'DataGrid (Channel)',
          iconUrl: `${baseUrl}/icons/grid-channel.svg`,
          action: {
            id: 'new-datagrid-channel',
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
        }
      ]
    };
    
    buttons.push(toolsButton as DockButton);
  }
  
  console.log('[DockButtons] Final button configuration:', {
    totalButtons: buttons.length,
    includeDeveloperButtons: includeDeveloperButtons || devMode,
    buttonList: buttons.map(btn => btn.tooltip)
  });
  
  return buttons;
}

// Action handlers are now registered in the main.ts file as CustomActionsMap

// Export function to refresh dock with new button visibility
export async function refreshDockButtons(): Promise<void> {
  const { Dock } = await import('@openfin/workspace');
  const { DockProvider } = await import('./dockProvider');
  
  console.log('[DockButtons] Refreshing dock buttons with developer mode:', isDeveloperModeEnabled());
  
  try {
    // Re-register the dock with updated buttons
    await DockProvider.register();
    console.log('[DockButtons] Dock re-registered with updated buttons');
    
    // Make sure the dock is shown after re-registration
    await Dock.show();
    console.log('[DockButtons] Dock shown');
  } catch (error) {
    console.error('[DockButtons] Error refreshing dock:', error);
    // Try to show dock even if there was an error
    try {
      await Dock.show();
    } catch (showError) {
      console.error('[DockButtons] Error showing dock:', showError);
    }
  }
}