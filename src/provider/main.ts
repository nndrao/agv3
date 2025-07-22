import { init } from '@openfin/workspace-platform';
import { Home, Storefront, Dock } from '@openfin/workspace';
import type { StorefrontFooter, StorefrontLandingPage } from '@openfin/workspace';
import type { CustomActionsMap } from '@openfin/workspace-platform';
import { DockProvider } from './dock/dockProvider';
import { StorageService } from '../services/storage/storageService';
import { ChannelService } from '../services/channels/channelService';
import { WindowManager } from '../services/window/windowManager';

async function initializePlatform() {
  console.log('🚀 Initializing AGV3 Platform...');
  
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

  // 3. Register dock
  console.log('🎨 Registering custom dock...');
  await DockProvider.register();
  console.log('✅ Dock registered');
  
  // 4. Show the dock
  await Dock.show();
  console.log('✅ Dock shown');
  
  // Custom actions are now registered through the init() function
  console.log('✅ Dock actions registered');
}

// Custom actions for dock buttons and menu items
function getCustomActions(): CustomActionsMap {
  return {
    'configure-datasource': async (): Promise<void> => {
      console.log('Opening datasource configuration...');
      try {
        await WindowManager.openDatasourceConfig();
      } catch (error) {
        console.error('Failed to open datasource config:', error);
      }
    },
    'new-datatable': async (): Promise<void> => {
      console.log('Opening new DataTable...');
      try {
        await WindowManager.openDataTable();
      } catch (error) {
        console.error('Failed to open data table:', error);
      }
    },
    'show-providers': async (): Promise<void> => {
      console.log('Showing active providers...');
      try {
        await WindowManager.showProviderStatus();
      } catch (error) {
        console.error('Failed to show provider status:', error);
      }
    },
    'new-datagrid-stomp': async (): Promise<void> => {
      console.log('Opening DataGrid with direct STOMP connection...');
      try {
        await WindowManager.openDataGridStomp();
      } catch (error) {
        console.error('Failed to open DataGrid STOMP:', error);
      }
    },
    'new-datagrid-channel': async (): Promise<void> => {
      console.log('Opening DataGrid with channel connection...');
      try {
        await WindowManager.openDataGridChannel();
      } catch (error) {
        console.error('Failed to open DataGrid Channel:', error);
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
        const options = await targetView.getOptions();
        const currentTitle = options.title || options.name || 'Untitled';
        
        // Show rename dialog
        const dialogId = `rename-${Date.now()}`;
        const baseUrl = window.location.origin;
        
        const dialogWindow = await fin.Window.create({
          name: `rename-dialog-${dialogId}`,
          url: `${baseUrl}/rename-dialog`,
          defaultWidth: 340,
          defaultHeight: 170,
          frame: false,
          autoShow: true,
          defaultCentered: true,
          alwaysOnTop: true,
          resizable: false,
          maximizable: false,
          minimizable: false,
          showTaskbarIcon: false,
          backgroundColor: '#2B2B2B',
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
        
        if (result.success && result.newTitle && result.newTitle !== currentTitle) {
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