# OpenFin Service Provider Architecture

## Overview

The OpenFin Service Provider is a lightweight wrapper component that provides standardized access to all centralized services, OpenFin platform events, and common functionality for components hosted in OpenFin windows and browser windows.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenFinServiceProvider                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Service Context                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │Configuration │  │   Logging    │  │AppVariables  │    │ │
│  │  │   Service    │  │   Service    │  │   Service    │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   Window     │  │  Event Bus   │  │    Theme     │    │ │
│  │  │ Operations   │  │   Service    │  │   Manager    │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │  ┌──────────────┐  ┌──────────────────────────────────┐  │ │
│  │  │   Channel    │  │         Service Health           │  │ │
│  │  │   Manager    │  │         & Metadata               │  │ │
│  │  └──────────────┘  └──────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                               ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Wrapped Component                        │ │
│  │                  (Your Application Code)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. OpenFinServiceProvider (`OpenFinServiceProvider.tsx`)

The main React context provider that initializes and manages all services.

**Key Features:**
- Lazy initialization of services
- Service health monitoring
- Error boundary capabilities
- Configurable service selection
- Loading and error states

**Props:**
```typescript
interface ServiceProviderConfig {
  viewId: string;                           // Required: Unique view identifier
  services?: ServiceType[];                 // Services to initialize
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logToConsole?: boolean;
  logToIndexedDB?: boolean;
  subscribeToWorkspaceEvents?: boolean;
  subscribeToThemeEvents?: boolean;
  subscribeToProfileEvents?: boolean;
  subscribeToProviderEvents?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
  customServices?: Record<string, any>;
}
```

### 2. Service Context (`ServiceContext.ts`)

Defines all service interfaces and types used throughout the system.

**Core Interfaces:**
- `ConfigurationClient` - Configuration management
- `LoggingClient` - Centralized logging
- `AppVariablesClient` - App variable management
- `WindowOperations` - Window/view operations
- `EventBus` - Event subscription and broadcasting
- `ThemeManager` - Theme management
- `ChannelManager` - OpenFin IAB channel management

### 3. Logging Service (`LoggingService.ts`)

Provides structured logging with IndexedDB persistence.

**Features:**
- Multiple log levels (debug, info, warn, error)
- IndexedDB storage with automatic cleanup
- Query and export capabilities
- Session tracking
- Source file extraction from stack traces
- Performance optimized with indexes

**IndexedDB Schema:**
```typescript
{
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  viewId: string;
  userId?: string;
  sessionId: string;
  source?: string;
  stack?: string;
}
```

### 4. Event Bus Service (`EventBusService.ts`)

Subscribes to OpenFin platform/workspace events and forwards them through a unified interface.

**Event Categories:**
- Workspace events (saving, saved, loading, loaded)
- Theme events (changed, toggled)
- Profile events (changed, saved, deleted)
- Provider events (connected, disconnected, error)
- Tab events (renamed, selected, closed)
- Window events (shown, hidden, minimized, maximized)

### 5. Window Operations Service (`WindowOperationsService.ts`)

Provides standard APIs for window and view operations.

**Capabilities:**
- Tab renaming and metadata
- Window state management (minimize, maximize, restore)
- Inter-window communication
- View navigation
- Developer tools access
- Bounds management

### 6. React Hooks (`useOpenFinServices.ts`)

Custom hooks for accessing services within components.

**Available Hooks:**
- `useOpenFinServices()` - Access all services
- `useService(serviceName)` - Access specific service
- `useConfiguration()` - Configuration service
- `useLogger()` - Logging service
- `useAppVariables()` - App variables
- `useWindowOperations()` - Window operations
- `useEventBus()` - Event bus
- `useTheme()` - Theme manager
- `useChannels()` - Channel manager
- `useServiceMetadata()` - Service metadata
- `useServiceHealth()` - Service health status

### 7. HOC Utilities (`withOpenFinServices.tsx`)

Higher-Order Components for easy migration of existing components.

**Available HOCs:**
- `withOpenFinServices(Component, config)` - Full configuration
- `withLogging(Component)` - Just logging
- `withConfiguration(Component)` - Configuration + logging
- `withEvents(Component)` - Events + logging
- `withWindowOperations(Component)` - Window ops + logging
- `withAllServices(Component)` - All services enabled

## Usage Examples

### 1. Wrapping a New Component

```typescript
// App.tsx
import { OpenFinServiceProvider } from '@/services/openfin/OpenFinServiceProvider';
import { DataGridStompShared } from './components/DataGridStompShared';

function App() {
  const viewId = new URLSearchParams(window.location.search).get('id') || 'default';
  
  return (
    <OpenFinServiceProvider
      viewId={viewId}
      services={['configuration', 'logging', 'events', 'window']}
      logLevel="info"
      onError={(error) => console.error('Service error:', error)}
    >
      <DataGridStompShared />
    </OpenFinServiceProvider>
  );
}
```

### 2. Using Services in a Component

```typescript
import { useOpenFinServices } from '@/services/openfin/useOpenFinServices';
import { useEffect } from 'react';

function DataGridStompShared() {
  const { logger, events, window, configuration } = useOpenFinServices();
  
  useEffect(() => {
    // Log component initialization
    logger.info('DataGrid initialized', { 
      viewId: window.getViewId() 
    });
    
    // Subscribe to theme changes
    const unsubscribeTheme = events.on('theme:changed', (theme) => {
      logger.info('Theme changed', { theme });
      // Update component theme
    });
    
    // Subscribe to workspace save events
    const unsubscribeWorkspace = events.on('workspace:saving', () => {
      logger.info('Workspace is saving');
      // Save component state
    });
    
    return () => {
      unsubscribeTheme();
      unsubscribeWorkspace();
    };
  }, []);
  
  const handleRenameTab = async () => {
    await window.renameTab('New Grid Name');
    logger.info('Tab renamed');
  };
  
  const handleSaveProfile = async (profile: any) => {
    await configuration.create({
      componentType: 'datagrid',
      componentId: window.getViewId(),
      name: 'My Profile',
      config: profile,
      appId: 'agv3'
    });
    logger.info('Profile saved');
  };
  
  return (
    <div>
      {/* Component content */}
    </div>
  );
}
```

### 3. Migrating an Existing Component with HOC

```typescript
// Before
export default DataGridStompShared;

// After - Option 1: Default configuration
import { withOpenFinServices } from '@/utils/withOpenFinServices';
export default withOpenFinServices(DataGridStompShared);

// After - Option 2: Custom configuration
import { withOpenFinServices } from '@/utils/withOpenFinServices';
export default withOpenFinServices(DataGridStompShared, {
  services: ['configuration', 'logging', 'events'],
  logLevel: 'debug',
  enableCaching: true
});

// After - Option 3: Preset configuration
import { withAllServices } from '@/utils/withOpenFinServices';
export default withAllServices(DataGridStompShared);
```

### 4. Centralized Logging

```typescript
const { logger } = useOpenFinServices();

// Different log levels
logger.debug('Debug message', { data: someData });
logger.info('User action', { action: 'button_click', target: 'save' });
logger.warn('Performance warning', { loadTime: 5000 });
logger.error('Operation failed', { error: errorObject });

// Query logs
const recentErrors = await logger.query({
  level: 'error',
  startTime: new Date(Date.now() - 3600000), // Last hour
  endTime: new Date()
});

// Export logs
const csvLogs = await logger.export('csv', {
  level: 'error',
  viewId: 'datagrid-1'
});
```

### 5. Event Subscription

```typescript
const { events } = useOpenFinServices();

// Subscribe to multiple events
useEffect(() => {
  const handlers = [
    events.on('workspace:saving', handleWorkspaceSave),
    events.on('theme:toggled', (isDark) => setDarkMode(isDark)),
    events.on('profile:changed', (profile) => applyProfile(profile)),
    events.on('provider:error', (error) => showErrorNotification(error))
  ];
  
  return () => {
    // Cleanup all subscriptions
    handlers.forEach(unsubscribe => unsubscribe());
  };
}, []);
```

### 6. Inter-Window Communication

```typescript
const { window } = useOpenFinServices();

// Send message to specific window
await window.sendToWindow('datagrid-2', {
  type: 'data-update',
  payload: { rows: updatedRows }
});

// Broadcast to all windows
await window.broadcast({
  type: 'theme-change',
  theme: 'dark'
});

// Listen for messages
const unsubscribe = window.onMessage((message) => {
  if (message.type === 'data-update') {
    updateGrid(message.payload);
  }
});
```

## Service Health Monitoring

The provider includes built-in health monitoring:

```typescript
const { health } = useOpenFinServices();

// Check overall health
const isHealthy = health.isConnected;

// Check individual service status
const loggingStatus = health.services.logging;
console.log(loggingStatus.status); // 'connected' | 'disconnected' | 'error'

// Perform health check
const result = await health.checkHealth();
console.log(result.healthy); // true/false
console.log(result.services); // Array of service statuses
```

## Performance Considerations

1. **Lazy Initialization**: Services are only initialized when included in the `services` array
2. **Singleton Pattern**: Services use singleton pattern to avoid multiple instances
3. **IndexedDB Indexes**: Logging service uses indexes for efficient querying
4. **Event Debouncing**: High-frequency events are debounced internally
5. **Automatic Cleanup**: Old logs are automatically cleaned up to prevent database growth
6. **Caching**: Configuration service supports caching with configurable timeout

## Migration Guide

### Step 1: Identify Components to Migrate
- List all components that need service access
- Determine which services each component needs

### Step 2: Choose Migration Strategy
- **Option A**: Wrap with HOC (minimal changes)
- **Option B**: Use provider directly (more control)
- **Option C**: Gradual migration (mix both approaches)

### Step 3: Update Component Imports
```typescript
// Add imports
import { useOpenFinServices } from '@/services/openfin/useOpenFinServices';
// or
import { withOpenFinServices } from '@/utils/withOpenFinServices';
```

### Step 4: Replace Direct Service Calls
```typescript
// Before
localStorage.setItem('profile', JSON.stringify(profile));
console.log('Profile saved');

// After
const { configuration, logger } = useOpenFinServices();
await configuration.create({ ...profile });
logger.info('Profile saved', { profileId: profile.id });
```

### Step 5: Test and Verify
- Verify all services are working
- Check logs in IndexedDB
- Test event subscriptions
- Verify inter-window communication

## Best Practices

1. **Service Selection**: Only include services you actually need
2. **Error Handling**: Always provide an `onError` callback
3. **Logging Levels**: Use appropriate log levels (debug for development, info for production)
4. **Event Cleanup**: Always unsubscribe from events in cleanup functions
5. **Type Safety**: Use TypeScript interfaces for all service interactions
6. **Testing**: Mock services in tests using the `customServices` prop

## Troubleshooting

### Services Not Initializing
- Check browser console for errors
- Verify OpenFin APIs are available
- Check IndexedDB permissions

### Events Not Firing
- Verify event subscriptions are set up
- Check if OpenFin workspace is properly initialized
- Ensure IAB channels are created

### Logging Not Working
- Check IndexedDB in browser DevTools
- Verify log level settings
- Check disk space for IndexedDB

### Inter-Window Communication Failing
- Verify both windows have the service provider
- Check IAB channel names match
- Ensure windows are in same OpenFin application

## Future Enhancements

1. **Service Discovery**: Automatic discovery of available services
2. **Service Versioning**: Handle service version compatibility
3. **Offline Support**: Queue operations when services are unavailable
4. **Performance Metrics**: Built-in performance monitoring
5. **Service Plugins**: Allow third-party service extensions
6. **GraphQL Integration**: Add GraphQL client as a service
7. **WebSocket Service**: Centralized WebSocket management
8. **Notification Service**: Unified notification system
9. **Telemetry Service**: Application usage analytics
10. **Security Service**: Centralized authentication/authorization