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
      
      // Validate that we're in an OpenFin environment
      if (typeof fin === 'undefined') {
        throw new Error('OpenFin API not available - cannot register dock');
      }
      
      // Validate Dock API is available
      if (!Dock || typeof Dock.register !== 'function') {
        throw new Error('Dock API not available - workspace components may not be loaded');
      }
      
      // Set the platform icon URL
      this.platformIcon = `${window.location.origin}/icon.png`;
      console.log('[DockProvider] Platform icon URL:', this.platformIcon);
      
      // Build initial dock configuration
      const dockConfig = this.buildDockConfiguration();
      
      // Validate dock configuration
      if (!dockConfig.buttons || dockConfig.buttons.length === 0) {
        console.warn('[DockProvider] No buttons configured for dock');
      }
      
      console.log('[DockProvider] Registering dock with config:', {
        id: this.dockId,
        title: dockConfig.title,
        buttonCount: dockConfig.buttons.length,
        workspaceComponents: dockConfig.workspaceComponents
      });
      
      // Log first few buttons to check icon URLs
      console.log('[DockProvider] First button:', dockConfig.buttons[0]);
      console.log('[DockProvider] Icon URL sample:', dockConfig.buttons[0]?.iconUrl?.substring(0, 100));
      
      // Try different configurations if the first one fails
      let registrationPromise;
      
      try {
        // First attempt with full configuration
        registrationPromise = Dock.register({
          id: this.dockId,
          ...dockConfig
        });
      } catch (initialError) {
        console.warn('[DockProvider] Initial registration failed, trying without workspace components');
        
        // Try without workspace components
        const minimalConfig = {
          ...dockConfig,
          workspaceComponents: []
        };
        
        registrationPromise = Dock.register({
          id: this.dockId,
          ...minimalConfig
        });
      }
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Dock registration timed out after 30 seconds')), 30000);
      });
      
      this.registration = await Promise.race([registrationPromise, timeoutPromise]);
      
      // Validate registration
      if (!this.registration) {
        throw new Error('Dock registration returned undefined');
      }
      
      // Log detailed button information
      console.log('[DockProvider] Registered dock with buttons:', dockConfig.buttons.map((b, i) => ({
        index: i,
        tooltip: 'tooltip' in b ? b.tooltip : 'Dropdown',
        iconUrl: 'iconUrl' in b ? b.iconUrl : 'N/A',
        action: 'action' in b ? b.action : 'N/A'
      })));
      
      console.log('[DockProvider] Dock provider initialized successfully');
      console.log('[DockProvider] Registration:', this.registration);
      
      return this.registration;
    } catch (err) {
      const error = err as Error;
      console.error('[DockProvider] Failed to register dock provider');
      console.error('[DockProvider] Error:', err);
      console.error('[DockProvider] Error message:', error?.message || 'No message');
      console.error('[DockProvider] Error stack:', error?.stack || 'No stack');
      console.error('[DockProvider] Full error object:', JSON.stringify(err, null, 2));
      
      // Provide helpful error messages
      if (error.message?.includes('timeout')) {
        console.error('[DockProvider] Registration timed out - check if workspace platform is properly initialized');
      } else if (error.message?.includes('OpenFin API not available')) {
        console.error('[DockProvider] Not running in OpenFin environment');
      } else if (error.message?.includes('already registered')) {
        console.error('[DockProvider] Dock already registered - consider deregistering first');
      }
      
      // Don't re-throw to allow graceful degradation
      return undefined;
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
      workspaceComponents: ['home', 'notifications', 'store'],
      disableUserRearrangement: false,
      buttons
    };
  }
  
  /**
   * Update the dock configuration without re-registering
   */
  static async updateDock(): Promise<void> {
    try {
      if (!this.registration) {
        console.warn('[DockProvider] No dock registration found, cannot update');
        return;
      }
      
      console.log('[DockProvider] Updating dock configuration');
      const config = this.buildDockConfiguration();
      
      // Validate config before updating
      if (!config || !config.buttons) {
        throw new Error('Invalid dock configuration');
      }
      
      await this.registration.updateDockProviderConfig(config);
      console.log('[DockProvider] Dock configuration updated successfully');
    } catch (err) {
      const error = err as Error;
      console.error('[DockProvider] Failed to update dock configuration:', {
        message: error.message,
        stack: error.stack
      });
      
      // Don't re-throw to prevent breaking the app
    }
  }
  
  /**
   * Safely deregister the dock
   */
  static async deregister(): Promise<void> {
    try {
      if (!this.registration) {
        console.warn('[DockProvider] No dock registration to deregister');
        return;
      }
      
      console.log('[DockProvider] Deregistering dock...');
      await Dock.deregister();
      this.registration = undefined;
      console.log('[DockProvider] Dock deregistered successfully');
    } catch (err) {
      const error = err as Error;
      console.error('[DockProvider] Failed to deregister dock:', {
        message: error.message,
        stack: error.stack
      });
    }
  }
}