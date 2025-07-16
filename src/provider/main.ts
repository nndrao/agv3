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
    
    // Initialize workspace platform
    await init({
      browser: {
        defaultWindowOptions: {
          icon: 'http://localhost:5173/icon.png',
          workspacePlatform: {
            pages: [],
            favicon: 'http://localhost:5173/icon.png'
          }
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
  const PLATFORM_ICON = 'http://localhost:5173/icon.png';

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

// Custom actions for dock buttons
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