import { Dock } from '@openfin/workspace';
import type { DockProviderConfigWithIdentity } from '@openfin/workspace';
import { createDockButtons } from './dockButtons';

export class DockProvider {
  static async register(): Promise<void> {
    const dockProvider: DockProviderConfigWithIdentity = {
      id: 'agv3-dock',
      title: 'AGV3 Workspace',
      icon: 'http://localhost:5173/icon.png',
      workspaceComponents: ['home', 'notifications', 'store', 'switchWorkspace'],
      disableUserRearrangement: false,
      buttons: createDockButtons()
    };
    
    await Dock.register(dockProvider);
  }
}