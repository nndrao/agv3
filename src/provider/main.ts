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
          console.log('[Platform] Setting up override callback for custom actions');
          
          class Override extends WorkspacePlatformProvider {
            constructor() {
              super();
              console.log('[Platform] Override constructor called');
            }
            
            // Override handleAction to handle custom menu actions
            async handleAction(action: any): Promise<void> {
              console.log('[Platform] handleAction called with:', action);
              
              if (action.id === 'rename-tab') {
                await this.handleRenameTabAction(action);
                return;
              }
              
              // Call parent for other actions
              return super.handleAction(action);
            }
            
            // Override openViewTabContextMenuInternal which is what's actually being called
            async openViewTabContextMenuInternal(req: any): Promise<any> {
              console.log('[Platform] openViewTabContextMenuInternal called with:', req);
              
              try {
                // If there's a template in the request, modify it BEFORE calling super
                if (req && req.template && Array.isArray(req.template)) {
                  console.log('[Platform] Found template in request, modifying...');
                  
                  // Check if rename already exists
                  const hasRename = req.template.some((item: any) => item.label === 'Rename Tab');
                  
                  if (!hasRename) {
                    // Find the position after "Duplicate View"
                    const duplicateIndex = req.template.findIndex((item: any) => 
                      item.label === 'Duplicate View' || 
                      (item.data && item.data.type === 'DuplicateViews')
                    );
                    
                    // Create rename menu item
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
                      // Insert after duplicate
                      req.template.splice(duplicateIndex + 1, 0, renameItem);
                    } else {
                      // Add at the end
                      req.template.push({ type: 'separator' });
                      req.template.push(renameItem);
                    }
                    
                    console.log('[Platform] Modified template:', req.template.map((item: any) => item.label || item.type));
                  }
                }
                
                // Now call the parent with the modified template
                const result = await super.openViewTabContextMenuInternal(req);
                console.log('[Platform] Result from parent:', result);
                
                return result;
              } catch (error) {
                console.error('[Platform] Error in openViewTabContextMenuInternal:', error);
                return super.openViewTabContextMenuInternal(req);
              }
            }
            
            // Also override openViewTabContextMenu as a fallback
            async openViewTabContextMenu(identity: OpenFin.Identity, x: number, y: number): Promise<any> {
              console.log('[Platform] openViewTabContextMenu called');
              
              try {
                // Let the parent handle it, but log what happens
                const result = await super.openViewTabContextMenu(identity, x, y);
                console.log('[Platform] openViewTabContextMenu result:', result);
                return result;
              } catch (error) {
                console.error('[Platform] Error in openViewTabContextMenu:', error);
                throw error;
              }
            }
            
            private async handleRenameTabAction(action: any): Promise<void> {
              console.log('[Platform] handleRenameTabAction called with:', action);
              
              try {
                // Get the view identity from the action context
                const viewIdentity = action.customData?.viewIdentity || action.payload?.viewIdentity;
                
                if (!viewIdentity) {
                  console.error('[Platform] No view identity provided for rename action');
                  return;
                }
                
                console.log('[Platform] Renaming view:', viewIdentity);
                
                // Show rename dialog
                const newTitle = await this.showRenameDialog(viewIdentity);
                
                if (newTitle && newTitle.trim()) {
                  await this.renameViewTab(viewIdentity, newTitle.trim());
                }
              } catch (error) {
                console.error('[Platform] Error renaming tab:', error);
              }
            }
            
            private async showRenameDialog(viewIdentity: OpenFin.Identity): Promise<string | null> {
              try {
                // Get current view to retrieve existing title
                const view = fin.View.wrapSync(viewIdentity);
                const viewOptions = await view.getOptions();
                const currentTitle = viewOptions.title || viewOptions.name || 'Untitled';
                
                // For now, use a simple prompt. In production, create a proper OpenFin window
                const newTitle = prompt(`Rename tab "${currentTitle}" to:`, currentTitle);
                
                return newTitle;
              } catch (error) {
                console.error('[Platform] Error showing rename dialog:', error);
                return null;
              }
            }
            
            private async renameViewTab(viewIdentity: OpenFin.Identity, newTitle: string): Promise<void> {
              try {
                const view = fin.View.wrapSync(viewIdentity);
                
                // Update the view options with new title
                await view.updateOptions({
                  title: newTitle,
                  titleOrder: 'options' // Ensure the options title takes precedence
                });
                
                // Also update the document title
                try {
                  await view.executeJavaScript(`
                    document.title = ${JSON.stringify(newTitle)};
                    // Store the title to persist across reloads
                    if (typeof window.localStorage !== 'undefined') {
                      const viewName = '${viewIdentity.name}';
                      window.localStorage.setItem('viewTitle_' + viewName, ${JSON.stringify(newTitle)});
                    }
                  `);
                } catch (jsError) {
                  console.warn('[Platform] Could not update document title:', jsError);
                }
                
                console.log(`[Platform] Tab renamed to: ${newTitle}`);
              } catch (error) {
                console.error('[Platform] Error updating view title:', error);
                throw error;
              }
            }
          }
          
          console.log('[Platform] Returning Override instance');
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
      console.log('[Custom Action] rename-tab action called:', payload);
      console.log('[Custom Action] Full payload structure:', JSON.stringify(payload, null, 2));
      
      try {
        // Try to get the actual view from the current context
        let targetView;
        let currentTitle = 'Untitled';
        
        // Check if we have selectedViews in the payload (from context menu)
        if (payload?.selectedViews && payload.selectedViews.length > 0) {
          const selectedView = payload.selectedViews[0];
          console.log('[Custom Action] Using selected view from payload:', selectedView);
          
          try {
            targetView = fin.View.wrapSync({
              uuid: selectedView.uuid || 'agv3-workspace-platform',
              name: selectedView.name
            });
            const options = await targetView.getOptions();
            currentTitle = options.title || options.name || 'Untitled';
          } catch (error) {
            console.error('[Custom Action] Error wrapping selected view:', error);
          }
        }
        
        // If we didn't get a view from selectedViews, try other methods
        if (!targetView) {
          try {
            // Try to get the current view (if called from within a view)
            const currentView = await fin.View.getCurrent();
            if (currentView) {
              targetView = currentView;
              const options = await currentView.getOptions();
              currentTitle = options.title || document.title || options.name || 'Untitled';
              console.log('[Custom Action] Using current view:', currentView.identity);
            }
          } catch (e) {
            console.log('[Custom Action] Not called from within a view, trying platform snapshot');
            
            // As a last resort, try to get the active view from the platform
            const platform = fin.Platform.getCurrentSync();
            const snapshot = await platform.getSnapshot();
            console.log('[Custom Action] Platform snapshot:', snapshot);
            
            // Find views in the snapshot
            if (snapshot.windows && snapshot.windows.length > 0) {
              for (const window of snapshot.windows) {
                if (window.layout && window.layout.content && window.layout.content.length > 0) {
                  // Navigate through the layout tree to find views
                  const findView = (content: any): any => {
                    if (content.type === 'component' && content.componentName === 'view') {
                      return content;
                    }
                    if (content.content && Array.isArray(content.content)) {
                      for (const item of content.content) {
                        const found = findView(item);
                        if (found) return found;
                      }
                    }
                    return null;
                  };
                  
                  const viewComponent = findView(window.layout);
                  if (viewComponent) {
                    console.log('[Custom Action] Found view in snapshot:', viewComponent);
                    targetView = fin.View.wrapSync({ 
                      uuid: window.uuid, 
                      name: viewComponent.componentState.name 
                    });
                    currentTitle = viewComponent.componentState.title || viewComponent.componentState.name || 'Untitled';
                    break;
                  }
                }
              }
            }
          }
        }
        
        if (!targetView) {
          console.error('[Custom Action] Could not find target view');
          alert('Could not find the view to rename. Please try clicking on the view first.');
          return;
        }
        
        // Show rename dialog using OpenFin window
        const dialogId = `rename-${Date.now()}`;
        const baseUrl = window.location.origin;
        
        // Create rename dialog window
        const dialogWindow = await fin.Window.create({
          name: `rename-dialog-${dialogId}`,
          url: `${baseUrl}/rename-dialog.html`,
          defaultWidth: 400,
          defaultHeight: 200,
          frame: true,
          autoShow: true,
          defaultCentered: true,
          alwaysOnTop: true,
          resizable: false,
          maximizable: false,
          minimizable: false,
          showTaskbarIcon: false,
          customData: {
            dialogId,
            currentTitle,
            targetView: targetView.identity
          }
        });
        
        // Wait for the dialog result
        const resultTopic = `rename-dialog-result-${dialogId}`;
        const resultPromise = new Promise<{ success: boolean; newTitle?: string }>((resolve) => {
          let subscribed = true;
          
          const handleMessage = (message: any) => {
            console.log('[Custom Action] Received dialog result:', message);
            if (subscribed) {
              subscribed = false;
              fin.InterApplicationBus.unsubscribe({ uuid: '*' }, resultTopic, handleMessage);
              resolve(message);
            }
          };
          
          fin.InterApplicationBus.subscribe({ uuid: '*' }, resultTopic, handleMessage);
          
          // Handle dialog close without result
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
          try {
            // Update the view options with new title
            await targetView.updateOptions({
              title: result.newTitle,
              titleOrder: 'options'
            });
            
            // Update document title and save to localStorage using the view's unique ID
            await targetView.executeJavaScript(`
              (async () => {
                try {
                  document.title = ${JSON.stringify(result.newTitle)};
                  
                  // Get the unique view instance ID from the URL query parameters
                  const urlParams = new URLSearchParams(window.location.search);
                  const viewInstanceId = urlParams.get('id');
                  
                  if (viewInstanceId && typeof window.localStorage !== 'undefined') {
                    // Use the unique view instance ID as the key
                    const storageKey = 'viewTitle_' + viewInstanceId;
                    window.localStorage.setItem(storageKey, ${JSON.stringify(result.newTitle)});
                    console.log('[Rename] Saved title to localStorage with key:', storageKey);
                  } else {
                    console.warn('[Rename] Could not get view instance ID from URL');
                  }
                } catch (e) {
                  console.error('[Rename] Error in executeJavaScript:', e);
                }
              })();
            `);
            
            console.log(`[Custom Action] Tab renamed to: ${result.newTitle}`);
          } catch (error) {
            console.error('[Custom Action] Error updating view title:', error);
            // Create an error notification instead of alert
            const errorWindow = await fin.Window.create({
              name: `error-${Date.now()}`,
              url: 'about:blank',
              defaultWidth: 300,
              defaultHeight: 100,
              frame: false,
              autoShow: true,
              defaultCentered: true,
              alwaysOnTop: true,
              showTaskbarIcon: false
            });
            
            await errorWindow.executeJavaScript(`
              document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif;">Failed to rename tab. Please try again.</div>';
              setTimeout(() => fin.me.close(), 3000);
            `);
          }
        }
      } catch (error) {
        console.error('[Custom Action] Error in rename-tab action:', error);
        alert('An error occurred while renaming the tab.');
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