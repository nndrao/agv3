import { Dock } from '@openfin/workspace';
import type { DockProviderConfigWithIdentity } from '@openfin/workspace';
import { createDockButtons } from './dockButtons';

export class DockProvider {
  static async register(): Promise<void> {
    // Use relative path for icon
    const baseUrl = window.location.origin;
    
    const dockProvider: DockProviderConfigWithIdentity = {
      id: 'agv3-dock',
      title: 'AGV3 Workspace',
      icon: `${baseUrl}/icon.png`,
      workspaceComponents: ['home', 'notifications', 'store', 'switchWorkspace'],
      disableUserRearrangement: false,
      buttons: createDockButtons()
    };
    
    // Try to deregister first in case it's already registered
    try {
      await Dock.deregister('agv3-dock');
      console.log('Deregistered existing dock');
    } catch (error) {
      // Ignore error if dock wasn't registered
      console.log('No existing dock to deregister');
    }
    
    await Dock.register(dockProvider);
    console.log('Dock registered with buttons:', dockProvider.buttons);
  }
}