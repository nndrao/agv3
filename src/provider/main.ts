import { init } from '@openfin/workspace-platform';
import { Home, Storefront, Dock } from '@openfin/workspace';
import type { StorefrontFooter, StorefrontLandingPage } from '@openfin/workspace';
import type { CustomActionsMap } from '@openfin/workspace-platform';
import { DockProvider } from './dock/dockProvider';
import { setDeveloperMode, refreshDockButtons } from './dock/dockButtons';
import { StorageService } from '../services/storage/storageService';
import { ChannelService } from '../services/channels/channelService';
import { WindowManager } from '../services/window/windowManager';

async function initializePlatform() {
  console.log('🚀 Initializing AGV3 Platform...');
  
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
    
    // Get base URL dynamically
    const baseUrl = window.location.origin;
    
    // Initialize workspace platform
    await init({
      browser: {
        defaultWindowOptions: {
          icon: `${baseUrl}/icon.png`,
          workspacePlatform: {
            pages: [],
            favicon: `${baseUrl}/icon.png`
          }
        },
        // Override to handle custom actions including rename-tab
        overrideCallback: async (WorkspacePlatformProvider) => {
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
                const customActions = getCustomActions();
                if (customActions['rename-tab']) {
                  await customActions['rename-tab'](action);
                }
                return;
              }
              
              // Call parent for other actions
              return super.handleAction(action);
            }
          }
          
          return new Override();
        }
      },
      theme: [{
        label: 'AGV3 Theme',
        default: 'dark',
        palette: {
          brandPrimary: '#0A76D3',
          brandSecondary: '#383A40',
          backgroundPrimary: '#1E1F23'
        }
      }],
      // Register custom actions for dock buttons
      customActions: getCustomActions()
    });
    
    console.log('✅ AGV3 Platform initialized');
    
    // Initialize workspace components in the correct order
    await initializeWorkspaceComponents();
    
    // Update status
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Platform ready - Dock active';
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize platform:', error);
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Failed to initialize platform';
    }
  }
}

async function initializeWorkspaceComponents() {
  const PLATFORM_ID = 'agv3-workspace-platform';
  const PLATFORM_TITLE = 'AGV3 Workspace';
  const baseUrl = window.location.origin;
  const PLATFORM_ICON = `${baseUrl}/icon.png`;

  // 1. Register Home component (REQUIRED for dock)
  console.log('📋 Registering Home component...');
  await Home.register({
    title: PLATFORM_TITLE,
    id: PLATFORM_ID,
    icon: PLATFORM_ICON,
    onUserInput: async () => ({ results: [] }),
    onResultDispatch: async () => {}
  });
  console.log('✅ Home registered');

  // 2. Register Storefront component (optional but recommended)
  console.log('🏪 Registering Storefront component...');
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

  // 3. Make sure dock is hidden first
  try {
    await Dock.hide();
    console.log('🚫 Dock hidden before registration');
  } catch (e) {
    // Ignore if dock wasn't shown
  }
  
  // 4. Register dock with correct buttons
  console.log('🎨 Registering custom dock...');
  await DockProvider.register();
  console.log('✅ Dock registered');
  
  // 5. Show the dock
  await Dock.show();
  console.log('✅ Dock shown');
  
  // Custom actions are now registered through the init() function
  console.log('✅ Dock actions registered');
}

// Custom actions for dock buttons and menu items
function getCustomActions(): CustomActionsMap {
  return {
    // The developer-tools-menu action is no longer needed since we're using native dropdown
    'configure-datasource': async (): Promise<void> => {
      console.log('[CustomActions] Opening datasource configuration...');
      try {
        await WindowManager.openDatasourceConfig();
        console.log('[CustomActions] Datasource config opened');
      } catch (error) {
        console.error('[CustomActions] Failed to open datasource config:', error);
      }
    },
    'new-datatable': async (): Promise<void> => {
      console.log('[CustomActions] Opening new DataTable...');
      try {
        await WindowManager.openDataTable();
        console.log('[CustomActions] DataTable opened');
      } catch (error) {
        console.error('[CustomActions] Failed to open data table:', error);
      }
    },
    'show-providers': async (): Promise<void> => {
      console.log('[CustomActions] Showing active providers...');
      try {
        await WindowManager.showProviderStatus();
        console.log('[CustomActions] Provider status shown');
      } catch (error) {
        console.error('[CustomActions] Failed to show provider status:', error);
      }
    },
    'new-datagrid-stomp': async (): Promise<void> => {
      console.log('[CustomActions] Opening DataGrid with direct STOMP connection...');
      try {
        await WindowManager.openDataGridStomp();
        console.log('[CustomActions] DataGrid STOMP opened');
      } catch (error) {
        console.error('[CustomActions] Failed to open DataGrid STOMP:', error);
      }
    },
    'new-datagrid-stomp-simplified': async (): Promise<void> => {
      console.log('Opening simplified DataGrid with direct STOMP connection...');
      try {
        await WindowManager.openDataGridStompSimplified();
      } catch (error) {
        console.error('Failed to open DataGrid STOMP Simplified:', error);
      }
    },
    'new-datagrid-channel': async (): Promise<void> => {
      console.log('[CustomActions] Opening DataGrid with channel connection...');
      try {
        await WindowManager.openDataGridChannel();
        console.log('[CustomActions] DataGrid Channel opened');
      } catch (error) {
        console.error('[CustomActions] Failed to open DataGrid Channel:', error);
      }
    },
    'manage-datagrid-instances': async (): Promise<void> => {
      console.log('Opening DataGrid STOMP Instance Manager...');
      try {
        await WindowManager.openDataGridStompManager();
      } catch (error) {
        console.error('Failed to open DataGrid STOMP Manager:', error);
      }
    },
    'rename-tab': async (payload: any): Promise<void> => {
      try {
        // Get view identity from selected views
        let viewIdentity;
        if (payload?.selectedViews && payload.selectedViews.length > 0) {
          const selectedView = payload.selectedViews[0];
          viewIdentity = {
            uuid: selectedView.uuid || 'agv3-workspace-platform',
            name: selectedView.name
          };
        } else if (payload?.customData?.viewIdentity) {
          viewIdentity = payload.customData.viewIdentity;
        }
        
        if (!viewIdentity) {
          return;
        }
        
        const targetView = fin.View.wrapSync(viewIdentity);
        
        // Get the current title - check multiple sources
        let currentTitle = 'Untitled';
        try {
          // First, try to get the view instance ID and check localStorage
          const viewInfo = await targetView.getInfo();
          const viewUrl = viewInfo.url;
          const urlParams = new URLSearchParams(new URL(viewUrl).search);
          const viewInstanceId = urlParams.get('id');
          
          if (viewInstanceId) {
            // Try to get the title from localStorage (where renamed titles are stored)
            const savedTitle = await targetView.executeJavaScript(`
              (() => {
                const id = ${JSON.stringify(viewInstanceId)};
                return window.localStorage.getItem('viewTitle_' + id);
              })()
            `);
            
            if (savedTitle) {
              currentTitle = savedTitle;
            } else {
              // Try to get document.title
              const docTitle = await targetView.executeJavaScript('document.title');
              currentTitle = docTitle || 'Untitled';
            }
          } else {
            // Fallback to document.title
            const docTitle = await targetView.executeJavaScript('document.title');
            currentTitle = docTitle || 'Untitled';
          }
        } catch (e) {
          // Final fallback - try view options
          try {
            const options = await targetView.getOptions();
            currentTitle = options.title || options.name || 'Untitled';
          } catch (e2) {
            currentTitle = 'Untitled';
          }
        }
        
        // Show rename dialog
        const dialogId = `rename-${Date.now()}`;
        const baseUrl = window.location.origin;
        
        // Get the parent window position to center the dialog over it
        const parentWindow = await targetView.getCurrentWindow();
        const parentBounds = await parentWindow.getBounds();
        
        // Calculate center position (adding 20px for the 10px padding on each side)
        const dialogWidth = 360;
        const dialogHeight = 160;
        const left = parentBounds.left + Math.floor((parentBounds.width - dialogWidth) / 2);
        const top = parentBounds.top + Math.floor((parentBounds.height - dialogHeight) / 2);
        
        const dialogWindow = await fin.Window.create({
          name: `rename-dialog-${Date.now()}`,
          url: `${baseUrl}/rename-dialog`,
          defaultWidth: dialogWidth,
          defaultHeight: dialogHeight,
          defaultLeft: left,
          defaultTop: top,
          frame: false,
          autoShow: true,
          alwaysOnTop: true,
          resizable: false,
          maximizable: false,
          minimizable: false,
          showTaskbarIcon: false,
          opacity: 0.95,
          backgroundColor: '#00000000', // Transparent background
          customData: {
            dialogId,
            currentTitle,
            targetView: viewIdentity
          }
        });
        
        // Wait for dialog result
        const resultTopic = `rename-dialog-result-${dialogId}`;
        const resultPromise = new Promise<{ success: boolean; newTitle?: string }>((resolve) => {
          let subscribed = true;
          
          const handleMessage = (message: any) => {
            if (subscribed) {
              subscribed = false;
              fin.InterApplicationBus.unsubscribe({ uuid: '*' }, resultTopic, handleMessage);
              resolve(message);
            }
          };
          
          fin.InterApplicationBus.subscribe({ uuid: '*' }, resultTopic, handleMessage);
          
          dialogWindow.once('closed', () => {
            if (subscribed) {
              subscribed = false;
              fin.InterApplicationBus.unsubscribe({ uuid: '*' }, resultTopic, handleMessage);
              resolve({ success: false });
            }
          });
        });
        
        const result = await resultPromise;
        
        if (result && result.success && result.newTitle && result.newTitle !== currentTitle) {
          // Update view title
          await targetView.updateOptions({
            title: result.newTitle,
            titleOrder: 'options'
          });
          
          // Save to localStorage using view instance ID
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
        // Silent fail
      }
    }
  };
}

// Function to handle developer mode keyboard shortcut
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
        
        // Show notification using create method
        try {
          const notification = await fin.Notification.create({
            title: 'Developer Mode',
            message: newMode ? 'Developer buttons enabled' : 'Developer buttons hidden',
            icon: window.location.origin + '/icon.png',
            timeout: 3000
          });
          await notification.show();
        } catch (notifError) {
          console.log('[Main] Notification skipped:', notifError.message);
          // Fallback: show status in console
          console.log(`[Main] Developer Mode: ${newMode ? 'ENABLED' : 'DISABLED'}`);
        }
      });
      
      console.log('[Main] Global hotkey CTRL+ALT+SHIFT+D registered');
    } catch (error) {
      console.error('[Main] Failed to register global hotkey:', error);
      
      // Fallback to window event listener
      console.log('[Main] Falling back to window event listener');
      setupWindowKeyboardListener();
    }
  };
  
  registerHotkey();
}

// Fallback keyboard listener for window
function setupWindowKeyboardListener() {
  const keysPressed = new Set<string>();
  
  window.addEventListener('keydown', async (event) => {
    keysPressed.add(event.key.toLowerCase());
    
    // Check for Ctrl+Alt+Shift+D
    if (event.ctrlKey && event.altKey && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      console.log('[Main] Developer mode hotkey triggered (window listener)');
      
      // Toggle developer mode
      const { isDeveloperModeEnabled } = await import('./dock/dockButtons');
      const currentMode = isDeveloperModeEnabled();
      const newMode = !currentMode;
      
      console.log('[Main] Toggling developer mode:', newMode);
      setDeveloperMode(newMode);
      
      // Refresh dock buttons
      await refreshDockButtons();
      
      // Show notification using create method
      try {
        const notification = await fin.Notification.create({
          title: 'Developer Mode',
          message: newMode ? 'Developer buttons enabled' : 'Developer buttons hidden',
          icon: window.location.origin + '/icon.png',
          timeout: 3000
        });
        await notification.show();
      } catch (notifError) {
        console.log('[Main] Notification skipped:', notifError.message);
        // Fallback: show status in console
        console.log(`[Main] Developer Mode: ${newMode ? 'ENABLED' : 'DISABLED'}`);
      }
    }
  });
  
  window.addEventListener('keyup', (event) => {
    keysPressed.delete(event.key.toLowerCase());
  });
  
  // Clear keys on blur to prevent stuck keys
  window.addEventListener('blur', () => {
    keysPressed.clear();
  });
}

// The showDeveloperToolsMenu function is no longer needed since we're using native dropdown

// Auto-initialize when loaded
if (typeof fin !== 'undefined') {
  initializePlatform().catch(console.error);
} else {
  console.error('OpenFin API not available');
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = 'OpenFin API not available';
  }
}