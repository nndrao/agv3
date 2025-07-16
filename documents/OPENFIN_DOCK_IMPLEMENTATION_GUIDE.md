# OpenFin Dock Provider Implementation Guide for React Applications

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Core Concepts](#core-concepts)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [Common Issues and Solutions](#common-issues-and-solutions)
7. [Best Practices](#best-practices)
8. [Testing and Debugging](#testing-and-debugging)
9. [Production Considerations](#production-considerations)
10. [Reference Implementation](#reference-implementation)

## Overview

The OpenFin Dock is a customizable component that provides quick access to applications, tools, and actions within the OpenFin Workspace. This guide details how to implement a custom dock provider in a React application, allowing you to add custom buttons, dropdowns, and integrate with your application's functionality.

### What You'll Learn
- How to register a custom dock provider
- Adding custom buttons with actions
- Handling icon requirements and limitations
- Integrating dock actions with React components
- Troubleshooting common implementation issues

## Prerequisites

### Required Dependencies
```json
{
  "dependencies": {
    "@openfin/core": "^41.102.4",
    "@openfin/workspace": "^21.0.16",
    "@openfin/workspace-platform": "^21.0.16",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@openfin/node-adapter": "^41.102.4"
  }
}
```

### Knowledge Requirements
- React and TypeScript fundamentals
- Basic understanding of OpenFin concepts
- Familiarity with workspace platforms

## Project Setup

### 1. Directory Structure
```
project-root/
├── public/
│   ├── icons/                    # Icon files for dock buttons
│   │   ├── plus.svg
│   │   ├── database.svg
│   │   ├── user.svg
│   │   └── settings.svg
│   ├── manifest.fin.json         # OpenFin manifest
│   └── platform/
│       └── provider.html         # Provider HTML (optional)
├── src/
│   ├── openfin/
│   │   ├── provider/
│   │   │   ├── provider.ts       # Main provider initialization
│   │   │   ├── customActions.ts  # Custom action handlers
│   │   │   └── workspaceConfig.ts # Dock configuration
│   │   ├── dock/
│   │   │   └── dockProvider.ts   # Dock registration logic
│   │   └── utils/
│   │       └── iconGenerator.ts  # Icon utility functions
│   ├── routes/
│   │   └── AppRouter.tsx         # React router configuration
│   └── main.tsx                  # React entry point
├── launch-openfin.js             # OpenFin launch script
└── package.json
```

### 2. OpenFin Manifest Configuration

Create `public/manifest.fin.json`:

```json
{
  "devtools_port": 9090,
  "licenseKey": "your-license-key-here",
  "runtime": {
    "version": "41.134.102.4"
  },
  "platform": {
    "uuid": "your-app-workspace-platform",
    "name": "Your App Workspace Platform",
    "description": "Your application workspace platform",
    "icon": "http://localhost:5173/vite.svg",
    "autoShow": true,
    "providerUrl": "http://localhost:5173/provider",
    "preventQuitOnLastWindowClosed": true,
    "defaultWindowOptions": {
      "permissions": {
        "System": {
          "launchExternalProcess": true,
          "readRegistryValue": true,
          "openUrlWithBrowser": {
            "enabled": true,
            "protocols": ["http", "https", "mailto"]
          }
        }
      }
    }
  },
  "snapshot": {
    "windows": []
  },
  "customSettings": {
    "appId": "your-app-workspace"
  }
}
```

### 3. Launch Script

Create `launch-openfin.js`:

```javascript
const { launch } = require('@openfin/node-adapter');

async function launchApp() {
  try {
    console.log('🚀 Launching OpenFin application...');
    
    const manifestUrl = 'http://localhost:5173/manifest.fin.json';
    
    const port = await launch({
      manifestUrl,
      devtools_port: 9090
    });
    
    console.log(`✅ OpenFin launched successfully on port ${port}`);
    console.log('🔧 DevTools available at: http://localhost:9090');
    
  } catch (error) {
    console.error('❌ Failed to launch OpenFin:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down OpenFin...');
  process.exit(0);
});

launchApp();
```

## Core Concepts

### 1. Workspace Platform Initialization

The workspace platform must be initialized before any workspace components (Home, Store, Dock) can be registered:

```typescript
import { init } from '@openfin/workspace-platform';

await init({
  browser: {
    defaultWindowOptions: {
      icon: 'http://localhost:5173/favicon.ico',
      workspacePlatform: {
        pages: [],
        favicon: 'http://localhost:5173/favicon.ico',
      },
    },
  },
  theme: [{
    label: 'Default Theme',
    default: 'dark',
    palette: {
      brandPrimary: '#0A76D3',
      brandSecondary: '#383A40',
      backgroundPrimary: '#1E1F23'
    }
  }],
  customActions: getCustomActions(),
  overrideCallback,
});
```

### 2. Component Registration Order

**CRITICAL**: Components must be registered in this specific order:
1. Home component (required)
2. Storefront component (optional but recommended)
3. Dock provider
4. Show dock

```typescript
// 1. Register Home (required for dock to show home button)
await Home.register({...});

// 2. Register Storefront (optional)
await Storefront.register({...});

// 3. Register Dock Provider
await Dock.register(dockConfig);

// 4. Show the dock
await Dock.show();
```

### 3. Icon Requirements

**IMPORTANT**: OpenFin dock has specific requirements for icons:
- Must be served over HTTP/HTTPS (not data URLs)
- Should be SVG or PNG format
- Recommended size: 24x24 pixels
- Should have good contrast for both light and dark themes

## Step-by-Step Implementation

### Step 1: Create Icon Assets

Create SVG icons in `public/icons/`:

```svg
<!-- public/icons/plus.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" 
     fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="12" y1="5" x2="12" y2="19"></line>
  <line x1="5" y1="12" x2="19" y2="12"></line>
</svg>
```

### Step 2: Create Icon Utility

Create `src/openfin/utils/iconGenerator.ts`:

```typescript
/**
 * Get icon URL - returns actual HTTP URLs for dock compatibility
 */
export function getHttpIconUrl(iconName: string): string {
  const iconMap: Record<string, string> = {
    newDataTable: 'http://localhost:5173/icons/plus.svg',
    dataSources: 'http://localhost:5173/icons/database.svg', 
    profiles: 'http://localhost:5173/icons/user.svg',
    settings: 'http://localhost:5173/icons/settings.svg',
    mainApp: 'http://localhost:5173/icons/table.svg'
  };
  
  return iconMap[iconName] || 'http://localhost:5173/vite.svg';
}
```

### Step 3: Define Custom Actions

Create `src/openfin/provider/customActions.ts`:

```typescript
import type { CustomActionsMap, CustomActionPayload } from '@openfin/workspace-platform';
import { CustomActionCallerType, getCurrentSync } from '@openfin/workspace-platform';

export function getCustomActions(): CustomActionsMap {
  const actions = {
    'launch-datatable': async (payload: CustomActionPayload): Promise<void> => {
      console.log('🚀 Launch DataTable action called', payload);
      const platform = getCurrentSync();
      
      const tableId = `table-${Date.now()}`;
      
      try {
        // Create a new BROWSER window (not simple window) for DataTable
        const browserWindow = await platform.Browser.createWindow({
          name: `datatable-${tableId}`,
          url: `http://localhost:5173/datatable/${tableId}`,
          defaultWidth: 1200,
          defaultHeight: 800,
          defaultCentered: true,
          saveWindowState: true,
          contextMenu: true,
          accelerator: {
            devtools: true,
            zoom: true,
            reload: true,
          },
          // IMPORTANT: Configure workspace pages for proper tabbing
          workspacePlatform: {
            pages: [{
              pageId: `datatable-page-${tableId}`,
              title: `DataTable ${tableId}`,
              layout: {
                settings: {
                  reorderEnabled: true,
                  popoutWholeStack: true,
                  showPopoutIcon: true,
                  showMaximizeIcon: true,
                  showCloseIcon: true,
                },
                content: [{
                  type: 'stack',
                  content: [{
                    type: 'component',
                    componentName: 'view',
                    componentState: {
                      name: `datatable-view-${tableId}`,
                      url: `http://localhost:5173/datatable/${tableId}`,
                      isClosable: true,
                    }
                  }]
                }]
              }
            }],
            favicon: 'http://localhost:5173/vite.svg',
            // Add custom toolbar buttons for the browser window
            toolbarOptions: {
              buttons: [
                {
                  type: 'Custom',
                  tooltip: 'Column Formatting',
                  iconUrl: 'http://localhost:5173/icons/settings.svg',
                  action: {
                    id: 'column-formatting',
                    customData: { tableId }
                  }
                }
              ]
            }
          }
        });

        console.log('✅ DataTable browser window created:', browserWindow);
      } catch (error) {
        console.error('❌ Failed to create browser window:', error);
        // Fallback to simple window if needed
      }
    },

    'open-datasources': async (payload: CustomActionPayload): Promise<void> => {
      console.log('💾 Open datasources action called', payload);
      
      // Configuration dialogs can use simple windows
      const window = await fin.Window.create({
        name: 'datasource-config',
        url: 'http://localhost:5173/datasources',
        defaultWidth: 1000,
        defaultHeight: 700,
        defaultCentered: true,
        frame: true,
        resizable: true,
        autoShow: true,
      });
    },

    // Add more actions as needed...
  };
  
  console.log('📋 Registered custom actions:', Object.keys(actions));
  return actions;
}
```

### Important: Browser Windows vs Simple Windows

**Browser Windows** (`platform.Browser.createWindow()`):
- Use for main application views (DataTable, Charts, etc.)
- Support tabs, layouts, and workspace features
- Include toolbar with custom buttons
- Can be saved as part of workspace snapshots
- Support advanced window management features

**Simple Windows** (`fin.Window.create()`):
- Use for dialogs and configuration screens
- Lighter weight, faster to open
- Don't support tabs or layouts
- Good for temporary UI elements

### Step 4: Configure Dock Provider

Create `src/openfin/provider/workspaceConfig.ts`:

```typescript
import type { DockProviderConfigWithIdentity } from '@openfin/workspace';
import { getHttpIconUrl } from '../utils/iconGenerator';

export const dockProvider: DockProviderConfigWithIdentity = {
  id: 'your-app-dock',
  title: 'Your App Workspace',
  icon: 'http://localhost:5173/vite.svg',
  workspaceComponents: ['home', 'notifications', 'store', 'switchWorkspace'],
  disableUserRearrangement: false,
  buttons: [
    {
      tooltip: 'New DataTable',
      iconUrl: getHttpIconUrl('newDataTable'),
      action: {
        id: 'launch-datatable'
      }
    },
    {
      tooltip: 'Data Sources',
      iconUrl: getHttpIconUrl('dataSources'),
      action: {
        id: 'open-datasources'
      }
    },
    {
      tooltip: 'Profiles',
      iconUrl: getHttpIconUrl('profiles'),
      action: {
        id: 'manage-profiles'
      }
    },
    {
      tooltip: 'Settings',
      iconUrl: getHttpIconUrl('settings'),
      action: {
        id: 'import-export-settings'
      }
    }
  ]
};
```

### Step 5: Implement Provider Initialization

Create `src/openfin/provider/provider.ts`:

```typescript
import type OpenFin from '@openfin/core';
import {
  Dock,
  Home,
  Storefront,
  type StorefrontFooter,
  type StorefrontLandingPage
} from '@openfin/workspace';
import {
  init,
  type WorkspacePlatformProvider,
  getCurrentSync,
} from '@openfin/workspace-platform';
import { getCustomActions } from './customActions';
import { dockProvider } from './workspaceConfig';

let storageEndpoint: any = null;

async function initializeWorkspacePlatform(): Promise<void> {
  console.log('Initializing workspace platform');

  await init({
    browser: {
      defaultWindowOptions: {
        icon: 'http://localhost:5173/vite.svg',
        workspacePlatform: {
          pages: [],
          favicon: 'http://localhost:5173/vite.svg',
        },
      },
    },
    theme: [{
      label: 'Default Theme',
      default: 'dark',
      palette: {
        brandPrimary: '#0A76D3',
        brandSecondary: '#383A40',
        backgroundPrimary: '#1E1F23'
      }
    }],
    customActions: getCustomActions(),
    overrideCallback,
  });

  // Handle platform close
  const providerWindow = fin.Window.getCurrentSync();
  await providerWindow.once('close-requested', async () => {
    await fin.Platform.getCurrentSync().quit();
  });

  // Initialize workspace components
  await initializeWorkspaceComponents();

  console.log('Workspace platform initialized successfully');
}

async function initializeWorkspaceComponents(): Promise<void> {
  const PLATFORM_ID = 'your-app-workspace-platform';
  const PLATFORM_TITLE = 'Your App Workspace';
  const PLATFORM_ICON = 'http://localhost:5173/vite.svg';

  // Register Home component (REQUIRED for dock)
  await Home.register({
    title: PLATFORM_TITLE,
    id: PLATFORM_ID,
    icon: PLATFORM_ICON,
    onUserInput: async () => ({ results: [] }),
    onResultDispatch: async () => {}
  });

  // Register Storefront component (optional)
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

  // Register custom dock with buttons
  console.log('🎨 Registering custom dock with buttons...');
  try {
    await Dock.register(dockProvider);
    console.log('✅ Custom dock registered successfully');
  } catch (error) {
    console.error('❌ Failed to register custom dock:', error);
  }

  // Show the dock
  await Dock.show();
  
  console.log('Workspace components initialized successfully');
}

// Override callback for customizing platform behavior
function overrideCallback(
  WorkspacePlatformProvider: OpenFin.Constructor<WorkspacePlatformProvider>
): WorkspacePlatformProvider {
  class Override extends WorkspacePlatformProvider {
    // Add custom overrides here if needed
  }
  return new Override();
}

// Export initialization function
export async function initializePlatform(): Promise<void> {
  await initializeWorkspacePlatform();
}
```

### Step 6: Create React Provider Component

Create or update your React router to include the provider route:

```tsx
// src/routes/AppRouter.tsx
import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// OpenFin Provider Component
const OpenFinProvider: React.FC = () => {
  const [status, setStatus] = React.useState<'initializing' | 'ready' | 'error'>('initializing');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('🎯 OpenFinProvider component mounted');
    console.log('📍 Current pathname:', window.location.pathname);
    console.log('🔍 OpenFin available:', typeof fin !== 'undefined');
    
    if (typeof fin !== 'undefined' && window.location.pathname === '/provider') {
      console.log('🚀 Starting OpenFin platform initialization...');
      import('@/openfin/provider/provider')
        .then(({ initializePlatform }) => {
          console.log('📦 Provider module loaded, calling initializePlatform...');
          return initializePlatform();
        })
        .then(() => {
          console.log('✅ Platform initialized successfully');
          setStatus('ready');
        })
        .catch((err) => {
          console.error('❌ Failed to initialize workspace platform:', err);
          setError(err.message);
          setStatus('error');
        });
    }
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      backgroundColor: '#1e1f23',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Your App Workspace Platform</h1>
        {status === 'initializing' && <p>Initializing provider...</p>}
        {status === 'ready' && <p>Provider is running</p>}
        {status === 'error' && (
          <>
            <p style={{ color: '#f44336' }}>Failed to initialize platform</p>
            <p style={{ fontSize: '0.9em', opacity: 0.8 }}>{error}</p>
          </>
        )}
      </div>
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/provider',
    element: <OpenFinProvider />,
  },
  // Add your other routes here
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
```

## Common Issues and Solutions

### Issue 1: Dock Buttons Not Showing

**Symptoms:**
- Dock appears but without custom buttons
- Only default OpenFin buttons visible

**Solutions:**

1. **Check registration order:**
   ```typescript
   // CORRECT ORDER:
   await Home.register({...});        // 1st
   await Storefront.register({...});  // 2nd
   await Dock.register({...});        // 3rd
   await Dock.show();                 // 4th
   ```

2. **Verify icon URLs are accessible:**
   - Open browser to `http://localhost:5173/icons/plus.svg`
   - Should display the SVG icon
   - Check DevTools Network tab for 404 errors

3. **Ensure icons use HTTP URLs, not data URLs:**
   ```typescript
   // ❌ WRONG - Data URLs don't work
   iconUrl: 'data:image/svg+xml,%3Csvg...'
   
   // ✅ CORRECT - HTTP URLs
   iconUrl: 'http://localhost:5173/icons/plus.svg'
   ```

### Issue 2: Custom Actions Not Triggering

**Symptoms:**
- Clicking dock buttons does nothing
- No console logs from action handlers

**Solutions:**

1. **Verify action IDs match:**
   ```typescript
   // In dock configuration:
   action: { id: 'launch-datatable' }
   
   // In custom actions:
   'launch-datatable': async (payload) => {...}
   ```

2. **Check custom actions are registered:**
   ```typescript
   await init({
     // ...
     customActions: getCustomActions(), // Must be included
   });
   ```

### Issue 3: Platform Not Initializing

**Symptoms:**
- Provider window shows error
- Console errors about missing components

**Solutions:**

1. **Check manifest URL matches:**
   ```json
   // In manifest.fin.json:
   "providerUrl": "http://localhost:5173/provider"
   
   // In React router:
   path: '/provider'
   ```

2. **Verify OpenFin runtime version:**
   ```json
   // Use a stable version
   "runtime": {
     "version": "41.134.102.4"
   }
   ```

## Best Practices

### 1. Icon Management

Create a centralized icon management system:

```typescript
// src/openfin/utils/iconManager.ts
export class IconManager {
  private static baseUrl = 'http://localhost:5173/icons';
  
  static getIconUrl(name: string): string {
    return `${this.baseUrl}/${name}.svg`;
  }
  
  static async preloadIcons(iconNames: string[]): Promise<void> {
    const promises = iconNames.map(name => 
      fetch(this.getIconUrl(name))
    );
    await Promise.all(promises);
  }
}
```

### 2. Action Handler Organization

Group related actions:

```typescript
// src/openfin/actions/dataTableActions.ts
export const dataTableActions = {
  'launch-datatable': async (payload) => {...},
  'close-datatable': async (payload) => {...},
  'refresh-datatable': async (payload) => {...},
};

// src/openfin/actions/index.ts
export function getAllActions(): CustomActionsMap {
  return {
    ...dataTableActions,
    ...datasourceActions,
    ...profileActions,
  };
}
```

### 3. Error Handling

Implement comprehensive error handling:

```typescript
async function registerDockSafely(config: DockProviderConfig): Promise<boolean> {
  try {
    await Dock.register(config);
    console.log('✅ Dock registered successfully');
    return true;
  } catch (error) {
    console.error('❌ Dock registration failed:', error);
    
    // Attempt recovery
    if (error.message.includes('already registered')) {
      console.log('🔄 Attempting to update existing dock...');
      // Implementation for updating existing dock
    }
    
    return false;
  }
}
```

### 4. Dynamic Dock Updates

Support dynamic button updates:

```typescript
export class DockManager {
  private static registration: DockProviderRegistration;
  
  static async updateButtons(buttons: DockButton[]): Promise<void> {
    if (this.registration) {
      await this.registration.updateDockProviderConfig({
        ...dockProvider,
        buttons
      });
    }
  }
  
  static async addButton(button: DockButton): Promise<void> {
    const currentConfig = await this.getCurrentConfig();
    const newButtons = [...currentConfig.buttons, button];
    await this.updateButtons(newButtons);
  }
}
```

## Testing and Debugging

### 1. Console Testing Functions

Add test utilities for development:

```typescript
// src/openfin/test/dockTest.ts
export async function testDockButtons() {
  console.log('🧪 Testing dock button registration...');
  
  try {
    const { Dock } = await import('@openfin/workspace');
    
    // Hide and re-show dock
    await Dock.hide();
    await new Promise(resolve => setTimeout(resolve, 500));
    await Dock.show();
    
    console.log('✅ Dock test completed');
  } catch (error) {
    console.error('❌ Dock test failed:', error);
  }
}

// Make available in console
(window as any).testDockButtons = testDockButtons;
```

### 2. DevTools Usage

Access OpenFin DevTools:
1. Launch with devtools port: `devtools_port: 9090`
2. Navigate to: `http://localhost:9090`
3. Select the provider window
4. Monitor console for initialization logs

### 3. Logging Best Practices

Use descriptive logging with emojis for clarity:

```typescript
console.log('🚀 Starting platform initialization...');
console.log('📋 Registering custom actions:', actionCount);
console.log('🎨 Configuring dock with buttons:', buttonCount);
console.log('✅ Initialization complete');
console.log('❌ Error occurred:', error);
```

## Production Considerations

### 1. Icon Hosting

For production, serve icons from a CDN:

```typescript
const ICON_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://cdn.yourapp.com/icons'
  : 'http://localhost:5173/icons';
```

### 2. License Management

```typescript
// Check for valid license
if (!manifest.licenseKey || manifest.licenseKey === 'openfin-demo-license-key') {
  console.warn('⚠️ Using demo license - limited functionality');
}
```

### 3. Error Recovery

Implement graceful degradation:

```typescript
async function initializeWithFallback() {
  try {
    await initializeWorkspacePlatform();
  } catch (error) {
    console.error('Platform initialization failed, using fallback');
    await initializeBasicPlatform(); // Minimal setup
  }
}
```

### 4. Performance Optimization

- Lazy load dock buttons based on user permissions
- Cache icon files for offline support
- Minimize initial dock configuration payload

## Reference Implementation

For a complete working example, refer to:
- OpenFin's workspace-starter repository: `workspace-starter/how-to/register-with-dock`
- This provides a minimal but complete implementation

### Key Files to Study:
- `client/src/provider.ts` - Platform initialization
- `client/src/dock.ts` - Dock registration and management
- `public/manifest.fin.json` - Manifest configuration

## Conclusion

Implementing a custom dock provider in OpenFin requires careful attention to:
1. Component registration order
2. Icon serving requirements
3. Action handler integration
4. Error handling and recovery

Following this guide should help you successfully implement a fully functional custom dock in your React-based OpenFin application. Remember to test thoroughly in different scenarios and always refer to the official OpenFin documentation for the latest updates and best practices.