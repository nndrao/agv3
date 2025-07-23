import { Dock } from '@openfin/workspace';
import type { DockProviderConfigWithIdentity } from '@openfin/workspace';
import { createDockButtons, isDeveloperModeEnabled } from './dockButtons';

export class DockProvider {
  private static dockId = 'agv3-dock';
  
  static async register(): Promise<void> {
    // Use relative path for icon
    const baseUrl = window.location.origin;
    
    const devMode = isDeveloperModeEnabled();
    const buttons = createDockButtons(devMode);
    
    console.log('[DockProvider] Creating dock config:', {
      devMode,
      buttonCount: buttons.length,
      buttons: buttons.map(b => b.tooltip)
    });
    
    // Use versioned dock ID to force refresh
    const dockId = `${this.dockId}-v2`;
    
    const dockProvider: DockProviderConfigWithIdentity = {
      id: dockId,
      title: 'AGV3 Workspace',
      icon: `${baseUrl}/icon.png`,
      workspaceComponents: ['home', 'notifications', 'store', 'switchWorkspace'],
      disableUserRearrangement: false,
      buttons: buttons
    };
    
    // Try to deregister all possible dock versions
    const dockIds = ['agv3-dock', 'agv3-dock-v1', 'agv3-dock-v2'];
    for (const id of dockIds) {
      try {
        await Dock.deregister(id);
        console.log(`[DockProvider] Deregistered dock: ${id}`);
      } catch (error) {
        // Ignore error if dock wasn't registered
      }
    }
    
    await Dock.register(dockProvider);
    console.log('[DockProvider] Dock registered with', dockProvider.buttons.length, 'buttons');
    console.log('[DockProvider] Button details:', dockProvider.buttons.map(b => b.tooltip));
  }
}