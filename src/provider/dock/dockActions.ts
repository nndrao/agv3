import type { CustomActionsMap, CustomActionPayload } from '@openfin/workspace-platform';
import { CustomActionCallerType, getCurrentSync } from '@openfin/workspace-platform';
import { WindowManager } from '../../services/window/windowManager';

/**
 * Get the custom actions for dock buttons
 * @returns The custom actions map
 */
export function getDockCustomActions(): CustomActionsMap {
  return {
    // Theme toggle
    'toggle-theme': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomButton) {
        console.log('[DockActions] Toggling theme...');
        try {
          // For now, just log the action since theming is temporarily disabled
          const currentTheme = localStorage.getItem('agv3_theme') || 'dark';
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
          
          console.log(`[DockActions] Would switch from ${currentTheme} to ${newTheme}`);
          localStorage.setItem('agv3_theme', newTheme);
          
          // TODO: Re-enable when theming is fixed
          // const platform = getCurrentSync();
          // await platform.Theme.setSelectedScheme(newTheme);
          
          console.log(`[DockActions] Theme toggle clicked (theming temporarily disabled)`);
        } catch (error) {
          console.error('[DockActions] Failed to toggle theme:', error);
        }
      }
    },
    // DataGrid Simplified
    'new-datagrid-stomp-simplified': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomButton) {
        console.log('[DockActions] Opening simplified DataGrid with direct STOMP connection...');
        try {
          await WindowManager.openDataGridStompSimplified();
        } catch (error) {
          console.error('[DockActions] Failed to open DataGrid STOMP Simplified:', error);
        }
      }
    },
    
    // Manage DataGrid Instances
    'manage-datagrid-instances': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomButton) {
        console.log('[DockActions] Opening DataGrid STOMP Instance Manager...');
        try {
          await WindowManager.openDataGridStompManager();
        } catch (error) {
          console.error('[DockActions] Failed to open DataGrid STOMP Manager:', error);
        }
      }
    },
    
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
    
    // Developer Tools - DataGrid Channel
    'new-datagrid-channel': async (payload: CustomActionPayload): Promise<void> => {
      if (payload.callerType === CustomActionCallerType.CustomDropdownItem) {
        console.log('[DockActions] Opening DataGrid with channel connection...');
        try {
          await WindowManager.openDataGridChannel();
        } catch (error) {
          console.error('[DockActions] Failed to open DataGrid Channel:', error);
        }
      }
    },
    
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
    }
  };
}