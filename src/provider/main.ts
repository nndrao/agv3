console.log('=== AGV3 Provider Main.ts Loading ===');

import type OpenFin from '@openfin/core';
import { init } from '@openfin/workspace-platform';
import { Home, Storefront, Dock } from '@openfin/workspace';
import type { StorefrontFooter, StorefrontLandingPage } from '@openfin/workspace';
import type { CustomActionsMap, WorkspacePlatformProvider } from '@openfin/workspace-platform';
import { DockProvider } from './dock/dockProvider';
import { setDeveloperMode, refreshDockButtons } from './dock/dockButtons';
import { getDockCustomActions } from './dock/dockActions';
import { initColorScheme, createThemingOverride } from './theming';
import { StorageService } from '../services/storage/storageService';
import { ChannelService } from '../services/channels/channelService';
import { WindowManager } from '../services/window/windowManager';

const PLATFORM_ID = 'agv3-workspace-platform';
const PLATFORM_TITLE = 'AGV3 Workspace';
const PLATFORM_ICON = `${window.location.origin}/icon.png`;

// Platform instance reference
let platformInstance: WorkspacePlatformProvider | null = null;

console.log('=== Setting up DOMContentLoaded listener ===');

// Wait for DOM ready before initializing
window.addEventListener('DOMContentLoaded', async () => {
  console.log('=== DOMContentLoaded fired ===');
  // The DOM is ready so initialize the platform
  await initializeWorkspacePlatform();
});

/**
 * Initialize the workspace platform with proper configuration
 */
async function initializeWorkspacePlatform() {
  console.log('🚀 Initializing AGV3 Workspace Platform...');
  
  // Clear developer mode on startup to ensure buttons are hidden
  try {
    localStorage.removeItem('agv3_developer_mode');
    console.log('[Main] Cleared developer mode from localStorage');
  } catch (e) {
    console.error('[Main] Error clearing developer mode:', e);
  }
  
  // Set up keyboard shortcut listener for developer mode
  setupDeveloperModeShortcut();
  
  try {
    // Initialize storage service
    await StorageService.initialize();
    
    // Initialize channel service
    await ChannelService.initialize();
    
    // Initialize workspace platform with proper configuration
    await init({
      browser: {
        defaultWindowOptions: {
          icon: PLATFORM_ICON,
          workspacePlatform: {
            pages: [],
            favicon: PLATFORM_ICON
          }
        }
      },
      // Use minimal theme configuration
      theme: [
        {
          label: 'Default',
          default: 'dark',
          palette: {
            brandPrimary: '#0A76D3',
            brandSecondary: '#383A40',
            backgroundPrimary: '#1E1F23'
          }
        }
      ],
      // Register all custom actions including dock actions
      customActions: getAllCustomActions(),
      // Override platform callbacks
      overrideCallback
    });
    
    console.log('✅ AGV3 Platform initialized');
    
    // Initialize workspace components immediately after platform init
    await initializeWorkspaceComponents();
    
  } catch (error) {
    console.error('❌ Failed to initialize platform:', error);
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Failed to initialize platform';
    }
  }
}

/**
 * Initialize workspace components (Home, Store, Dock)
 */
async function initializeWorkspaceComponents() {
  console.log('📋 Initializing workspace components...');
  
  try {
    // Register Home component (required for dock)
    await Home.register({
      title: PLATFORM_TITLE,
      id: PLATFORM_ID,
      icon: PLATFORM_ICON,
      onUserInput: async () => ({ results: [] }),
      onResultDispatch: async () => {}
    });
    console.log('✅ Home registered');
    
    // Show Home to ensure it's available for dock
    await Home.show();
    console.log('✅ Home shown');
  } catch (error) {
    console.error('❌ Failed to register Home:', error);
  }
  
  try {
    // Register Storefront component (optional but recommended)
    await Storefront.register({
      title: PLATFORM_TITLE,
      id: PLATFORM_ID,
      icon: PLATFORM_ICON,
      getApps: async () => [],
      getLandingPage: async () => ({}) as StorefrontLandingPage,
      getNavigation: async () => [],
      getFooter: async () => ({ 
        logo: { src: PLATFORM_ICON }, 
        links: [] 
      }) as unknown as StorefrontFooter,
      launchApp: async () => {}
    });
    console.log('✅ Storefront registered');
  } catch (error) {
    console.error('❌ Failed to register Storefront:', error);
  }
  
  // Wait a bit longer before registering dock to ensure workspace is ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Register the dock provider with retry logic
    console.log('🔧 About to register dock...');
    let registration = await DockProvider.register();
    
    // If first attempt fails, retry after a delay
    if (!registration) {
      console.log('🔧 First dock registration attempt failed, retrying in 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      registration = await DockProvider.register();
    }
    
    if (registration) {
      console.log('✅ Dock registered successfully');
      
      // Show the dock (with small delay to ensure everything is ready)
      console.log('🔧 About to show dock...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        await Dock.show();
        console.log('✅ Dock shown');
      } catch (showError) {
        console.error('❌ Failed to show dock:', showError);
        // Try to show again after a longer delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await Dock.show();
          console.log('✅ Dock shown on second attempt');
        } catch (retryError) {
          console.error('❌ Failed to show dock on retry:', retryError);
        }
      }
    } else {
      console.warn('⚠️ Dock registration failed after retry - dock features disabled');
    }
  } catch (error) {
    console.error('❌ Failed to register dock:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      error
    });
    // Continue without dock - don't break the entire app
  }
  
  // Temporarily disable color scheme initialization
  // try {
  //   // Initialize color scheme
  //   await initColorScheme();
  //   console.log('✅ Color scheme initialized');
    
  //   // Create interop for theme messaging
  //   fin.me.interop = fin.Interop.connectSync(fin.me.uuid, {});
  // } catch (error) {
  //   console.error('❌ Failed to initialize theming:', error);
  // }
  
  // Force dock refresh to ensure theme toggle button is visible
  setTimeout(async () => {
    console.log('🔄 Forcing dock refresh to ensure theme toggle button is visible');
    await DockProvider.updateDock();
  }, 1000);
  
  // Add a global function to manually test dock refresh
  (window as any).testDockRefresh = async () => {
    console.log('🔄 Manual dock refresh triggered');
    await DockProvider.updateDock();
  };
  
  // Update status
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = 'Platform ready - Dock active';
  }
}

/**
 * Get all custom actions for the platform
 */
function getAllCustomActions(): CustomActionsMap {
  return {
    // Dock actions
    ...getDockCustomActions(),
    
    // Rename tab action
    'rename-tab': async (payload: any): Promise<void> => {
      try {
        // Get view identity from selected views
        let viewIdentity;
        if (payload?.selectedViews && payload.selectedViews.length > 0) {
          const selectedView = payload.selectedViews[0];
          viewIdentity = {
            uuid: selectedView.uuid || PLATFORM_ID,
            name: selectedView.name
          };
        } else if (payload?.customData?.viewIdentity) {
          viewIdentity = payload.customData.viewIdentity;
        }
        
        if (!viewIdentity) {
          return;
        }
        
        const targetView = fin.View.wrapSync(viewIdentity);
        
        // Get the current title
        let currentTitle = 'Untitled';
        try {
          const viewInfo = await targetView.getInfo();
          const viewUrl = viewInfo.url;
          const urlParams = new URLSearchParams(new URL(viewUrl).search);
          const viewInstanceId = urlParams.get('id');
          
          if (viewInstanceId) {
            const savedTitle = await targetView.executeJavaScript(`
              (() => {
                const id = ${JSON.stringify(viewInstanceId)};
                return window.localStorage.getItem('viewTitle_' + id);
              })()
            `);
            
            if (savedTitle) {
              currentTitle = savedTitle;
            } else {
              const docTitle = await targetView.executeJavaScript('document.title');
              currentTitle = docTitle || 'Untitled';
            }
          }
        } catch (e) {
          // Fallback
          currentTitle = 'Untitled';
        }
        
        // Show rename dialog
        const baseUrl = window.location.origin;
        const dialogWindow = await fin.Window.create({
          name: `rename-dialog-${Date.now()}`,
          url: `${baseUrl}/rename-dialog`,
          defaultWidth: 360,
          defaultHeight: 160,
          frame: false,
          autoShow: true,
          alwaysOnTop: true,
          resizable: false,
          customData: {
            currentTitle,
            targetView: viewIdentity
          }
        });
        
        // Handle dialog result
        const resultTopic = `rename-dialog-result-${dialogWindow.identity.name}`;
        const resultPromise = new Promise<{ success: boolean; newTitle?: string }>((resolve) => {
          const handleMessage = (message: any) => {
            fin.InterApplicationBus.unsubscribe({ uuid: '*' }, resultTopic, handleMessage);
            resolve(message);
          };
          
          fin.InterApplicationBus.subscribe({ uuid: '*' }, resultTopic, handleMessage);
          
          dialogWindow.once('closed', () => {
            fin.InterApplicationBus.unsubscribe({ uuid: '*' }, resultTopic, handleMessage);
            resolve({ success: false });
          });
        });
        
        const result = await resultPromise;
        
        if (result && result.success && result.newTitle && result.newTitle !== currentTitle) {
          // Update view title
          await targetView.updateOptions({
            title: result.newTitle
          });
          
          // Save to localStorage
          await targetView.executeJavaScript(`
            (async () => {
              document.title = ${JSON.stringify(result.newTitle)};
              const urlParams = new URLSearchParams(window.location.search);
              const viewInstanceId = urlParams.get('id');
              if (viewInstanceId && typeof window.localStorage !== 'undefined') {
                window.localStorage.setItem('viewTitle_' + viewInstanceId, ${JSON.stringify(result.newTitle)});
              }
            })();
          `);
        }
      } catch (error) {
        console.error('[Main] Error in rename-tab action:', error);
      }
    }
  };
}

/**
 * Override platform methods
 */
function overrideCallback(
  WorkspacePlatformProvider: OpenFin.Constructor<WorkspacePlatformProvider>
): WorkspacePlatformProvider {
  // Temporarily disable theming override to test
  // const ThemingProvider = createThemingOverride(WorkspacePlatformProvider);
  
  class Override extends WorkspacePlatformProvider {
    // Override openViewTabContextMenuInternal to inject rename option
    // @ts-ignore - This method exists but is not in the TypeScript definitions
    async openViewTabContextMenuInternal(req: any): Promise<any> {
      try {
        // Modify template to add rename option
        if (req?.template && Array.isArray(req.template)) {
          const hasRename = req.template.some((item: any) => item.label === 'Rename Tab');
          
          if (!hasRename) {
            const duplicateIndex = req.template.findIndex((item: any) => 
              item.label === 'Duplicate View' || 
              (item.data && item.data.type === 'DuplicateViews')
            );
            
            const renameItem = {
              label: 'Rename Tab',
              data: {
                type: 'Custom',
                action: {
                  id: 'rename-tab',
                  customData: {
                    viewIdentity: req.viewIdentity || req.identity
                  }
                }
              }
            };
            
            if (duplicateIndex !== -1) {
              req.template.splice(duplicateIndex + 1, 0, renameItem);
            } else {
              req.template.push({ type: 'separator' });
              req.template.push(renameItem);
            }
          }
        }
        
        return super.openViewTabContextMenuInternal(req);
      } catch (error) {
        return super.openViewTabContextMenuInternal(req);
      }
    }
    
    // Override handleAction to handle custom menu actions
    async handleAction(action: any): Promise<void> {
      if (action.id === 'rename-tab') {
        // Call the rename-tab custom action
        const customActions = getAllCustomActions();
        if (customActions['rename-tab']) {
          await customActions['rename-tab'](action);
        }
        return;
      }
      
      // Call parent for other actions
      return super.handleAction(action);
    }
  }
  
  platformInstance = new Override();
  return platformInstance;
}

/**
 * Set up keyboard shortcut for developer mode
 */
function setupDeveloperModeShortcut() {
  // Register global hotkey with OpenFin
  const registerHotkey = async () => {
    try {
      // Register Ctrl+Alt+Shift+D as a global hotkey
      await fin.GlobalHotkey.register('CTRL+ALT+SHIFT+D', async () => {
        console.log('[Main] Developer mode hotkey triggered');
        
        // Toggle developer mode
        const { isDeveloperModeEnabled } = await import('./dock/dockButtons');
        const currentMode = isDeveloperModeEnabled();
        const newMode = !currentMode;
        
        console.log('[Main] Toggling developer mode:', newMode);
        setDeveloperMode(newMode);
        
        // Refresh dock buttons
        await refreshDockButtons();
        
        // Show notification
        try {
          const notification = await fin.Notification.create({
            title: 'Developer Mode',
            message: newMode ? 'Developer buttons enabled' : 'Developer buttons hidden',
            icon: PLATFORM_ICON,
            timeout: 3000
          });
          await notification.show();
        } catch (notifError) {
          console.log('[Main] Notification skipped:', notifError.message);
        }
      });
      
      console.log('[Main] Global hotkey CTRL+ALT+SHIFT+D registered');
    } catch (error) {
      console.error('[Main] Failed to register global hotkey:', error);
    }
  };
  
  registerHotkey();
}

// Auto-initialize when loaded
console.log('=== Checking OpenFin availability ===', typeof fin);
if (typeof fin !== 'undefined') {
  console.log('=== OpenFin is available, waiting for DOMContentLoaded ===');
  // Platform will be initialized on DOMContentLoaded
} else {
  console.error('OpenFin API not available');
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = 'OpenFin API not available';
  }
}