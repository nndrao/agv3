import { Dock } from '@openfin/workspace';
import type { DockProviderRegistration, DockProviderConfig } from '@openfin/workspace';
import { createDockButtons, isDeveloperModeEnabled } from './dockButtons';

export class DockProvider {
  private static dockId = 'agv3-dock';
  private static registration: DockProviderRegistration | undefined;
  private static platformTitle = 'AGV3 Workspace';
  private static platformIcon: string;
  
  /**
   * Register the dock provider following OpenFin best practices
   */
  static async register(): Promise<DockProviderRegistration | undefined> {
    try {
      console.log('[DockProvider] Initializing the dock provider');
      console.log('[DockProvider] Window location:', window.location.origin);
      
      // Set the platform icon URL
      this.platformIcon = `${window.location.origin}/icon.png`;
      console.log('[DockProvider] Platform icon URL:', this.platformIcon);
      // Build initial dock configuration
      const dockConfig = this.buildDockConfiguration();
      
      console.log('[DockProvider] Registering dock with config:', {
        id: this.dockId,
        title: dockConfig.title,
        buttonCount: dockConfig.buttons.length
      });
      
      // Register the dock
      this.registration = await Dock.register({
        id: this.dockId,
        ...dockConfig
      });
      
      // Log detailed button information
      console.log('[DockProvider] Registered dock with buttons:', dockConfig.buttons.map((b, i) => ({
        index: i,
        tooltip: 'tooltip' in b ? b.tooltip : 'Dropdown',
        iconUrl: 'iconUrl' in b ? b.iconUrl : 'N/A',
        action: 'action' in b ? b.action : 'N/A'
      })));
      
      console.log('[DockProvider] Dock provider initialized');
      console.log('[DockProvider] Registration:', this.registration);
      
      return this.registration;
    } catch (err) {
      console.error('[DockProvider] An error was encountered while trying to register the dock provider', err);
      console.error('[DockProvider] Error details:', {
        message: err?.message,
        stack: err?.stack,
        err
      });
      throw err; // Re-throw to see the error in the calling code
    }
  }
  
  /**
   * Build the dock configuration with current buttons
   */
  private static buildDockConfiguration(): DockProviderConfig {
    const devMode = isDeveloperModeEnabled();
    const buttons = createDockButtons(devMode);
    
    console.log('[DockProvider] Building dock configuration:', {
      devMode,
      buttonCount: buttons.length,
      buttons: buttons.map(b => 'tooltip' in b ? b.tooltip : 'dropdown')
    });
    
    return {
      title: this.platformTitle,
      icon: this.platformIcon,
      workspaceComponents: ['home', 'notifications', 'store', 'switchWorkspace'],
      disableUserRearrangement: false,
      buttons
    };
  }
  
  /**
   * Update the dock configuration without re-registering
   */
  static async updateDock(): Promise<void> {
    if (this.registration) {
      console.log('[DockProvider] Updating dock configuration');
      const config = this.buildDockConfiguration();
      await this.registration.updateDockProviderConfig(config);
      console.log('[DockProvider] Dock configuration updated');
    } else {
      console.warn('[DockProvider] No dock registration found, cannot update');
    }
  }
}