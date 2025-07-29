import type { CustomActionsMap, CustomActionPayload } from '@openfin/workspace-platform';
import { CustomActionCallerType, getCurrentSync, ColorSchemeOptionType } from '@openfin/workspace-platform';
import { WindowManager } from '../../services/window/windowManager';
import { Dock } from '@openfin/workspace';
import { DockProvider } from './dockProvider';

/**
 * Get the custom actions for dock buttons
 * @returns The custom actions map
 */
export function getDockCustomActions(): CustomActionsMap {
  return {
    // Theme toggle - Re-enabled with simpler implementation
    'toggle-theme': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomButton) {
        console.log('[DockActions] Toggling theme...');
        try {
          const platform = getCurrentSync();
          
          // Get current theme from platform
          const currentScheme = await platform.Theme.getSelectedScheme();
          console.log('[DockActions] Current scheme:', currentScheme);
          
          // Determine new scheme to switch to
          let newScheme: ColorSchemeOptionType;
          if (currentScheme === ColorSchemeOptionType.Dark) {
            newScheme = ColorSchemeOptionType.Light;
          } else if (currentScheme === ColorSchemeOptionType.Light) {
            newScheme = ColorSchemeOptionType.Dark;
          } else {
            // If system, default to light
            newScheme = ColorSchemeOptionType.Light;
          }
          
          // Set the new theme
          await platform.Theme.setSelectedScheme(newScheme);
          
          // Update localStorage
          localStorage.setItem('agv3_theme', newScheme.toLowerCase());
          
          console.log('[DockActions] Theme toggled successfully to:', newScheme);
          
          // Update the dock to refresh button tooltips and icons
          await DockProvider.updateDock();
        } catch (error) {
          console.error('[DockActions] Failed to toggle theme:', error);
        }
      }
    },
    // Configure DataSource (Main Button)
    'configure-datasource-main': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomButton) {
        console.log('[DockActions] Opening datasource configuration...');
        try {
          await WindowManager.openDatasourceConfig();
        } catch (error) {
          console.error('[DockActions] Failed to open datasource config:', error);
        }
      }
    },
    
    // DataGrid STOMP (Main Button)
    'new-datagrid-stomp-main': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomButton) {
        console.log('[DockActions] Opening DataGrid with direct STOMP connection...');
        try {
          await WindowManager.openDataGridStomp();
        } catch (error) {
          console.error('[DockActions] Failed to open DataGrid STOMP:', error);
        }
      }
    },
    
    // DataGrid Shared STOMP
    'new-datagrid-stomp-shared': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomButton) {
        console.log('[DockActions] Opening DataGrid with shared STOMP connection...');
        try {
          await WindowManager.openDataGridStompShared();
        } catch (error) {
          console.error('[DockActions] Failed to open DataGrid STOMP Shared:', error);
        }
      }
    },
    
    // DataGrid Simplified
    // Removed new-datagrid-stomp-simplified and manage-datagrid-instances actions
    
    // Developer Tools - DataTable
    'new-datatable': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomDropdownItem) {
        console.log('[DockActions] Opening new DataTable...');
        try {
          await WindowManager.openDataTable();
        } catch (error) {
          console.error('[DockActions] Failed to open data table:', error);
        }
      }
    },
    
    // Developer Tools - DataGrid STOMP
    'new-datagrid-stomp': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomDropdownItem) {
        console.log('[DockActions] Opening DataGrid with direct STOMP connection...');
        try {
          await WindowManager.openDataGridStomp();
        } catch (error) {
          console.error('[DockActions] Failed to open DataGrid STOMP:', error);
        }
      }
    },
    
    // Developer Tools - Configure DataSource
    'configure-datasource': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomDropdownItem) {
        console.log('[DockActions] Opening datasource configuration...');
        try {
          await WindowManager.openDatasourceConfig();
        } catch (error) {
          console.error('[DockActions] Failed to open datasource config:', error);
        }
      }
    },
    
    // Removed new-datagrid-channel action
    
    // Developer Tools - Active Providers
    'show-providers': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomDropdownItem) {
        console.log('[DockActions] Showing active providers...');
        try {
          await WindowManager.showProviderStatus();
        } catch (error) {
          console.error('[DockActions] Failed to show provider status:', error);
        }
      }
    },
    
    // Reload Dock
    'reload-dock': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomDropdownItem) {
        try {
          console.log('[DockActions] Reloading dock by re-registering...');
          
          // The dock needs to be re-registered to "reload" it
          // First, deregister the dock
          await Dock.deregister();
          console.log('[DockActions] Dock deregistered');
          
          // Wait a moment for cleanup
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Re-register the dock
          await DockProvider.register();
          console.log('[DockActions] Dock re-registered');
          
          // Show the dock after re-registration
          await Dock.show();
          console.log('[DockActions] Dock reloaded and shown');
        } catch (error) {
          console.error('[DockActions] Error reloading dock:', error);
        }
      }
    },
    
    // Open DevTools
    'open-devtools': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomDropdownItem) {
        try {
          console.log('[DockActions] Attempting to find and open devtools for dock...');
          
          // Get all applications to find the workspace dock
          const runningApps = await fin.System.getAllApplications();
          let devtoolsOpened = false;
          
          console.log('[DockActions] Running applications:', runningApps.map((app: any) => app.uuid));
          
          // Look for OpenFin Workspace applications
          for (const app of runningApps) {
            if (app.uuid.toLowerCase().includes('workspace') || 
                app.uuid === 'agv3-workspace-platform') {
              try {
                console.log(`[DockActions] Found workspace app: ${app.uuid}`);
                const application = fin.Application.wrapSync({ uuid: app.uuid });
                const childWindows = await application.getChildWindows();
                
                console.log(`[DockActions] Child windows for ${app.uuid}:`, childWindows.map((w: any) => w.identity.name));
                
                // Look for dock-related windows
                for (const window of childWindows) {
                  if (window.identity.name?.toLowerCase().includes('dock') ||
                      window.identity.name?.toLowerCase().includes('workspace-dock')) {
                    await window.showDeveloperTools();
                    console.log(`[DockActions] DevTools opened for dock window: ${window.identity.name}`);
                    devtoolsOpened = true;
                    return;
                  }
                }
              } catch (e) {
                console.log(`[DockActions] Could not check ${app.uuid}:`, (e as Error).message);
              }
            }
          }
          
          // Alternative approach: try to find dock by iterating through all windows
          if (!devtoolsOpened) {
            console.log('[DockActions] Trying alternative approach - checking all windows...');
            const allWindows = await fin.System.getAllWindows();
            
            for (const appInfo of allWindows) {
              // Check child windows
              if (appInfo.childWindows) {
                for (const child of appInfo.childWindows) {
                  if (child.name?.toLowerCase().includes('dock')) {
                    try {
                      const window = fin.Window.wrapSync({ 
                        uuid: appInfo.uuid, 
                        name: child.name 
                      });
                      await window.showDeveloperTools();
                      console.log(`[DockActions] DevTools opened for dock window: ${child.name}`);
                      devtoolsOpened = true;
                      return;
                    } catch (e) {
                      console.log(`[DockActions] Failed to open devtools for ${child.name}:`, (e as Error).message);
                    }
                  }
                }
              }
            }
          }
          
          if (!devtoolsOpened) {
            console.log('[DockActions] Could not find dock window, opening devtools for current window');
            const currentWindow = fin.Window.getCurrentSync();
            await currentWindow.showDeveloperTools();
          }
        } catch (error) {
          console.error('[DockActions] Error opening devtools:', error);
        }
      }
    }
  };
}