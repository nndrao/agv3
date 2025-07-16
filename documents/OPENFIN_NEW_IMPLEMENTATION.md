# OpenFin New Implementation Blueprint

## Table of Contents
1. [Overview & Rationale](#overview--rationale)
2. [Architecture Design](#architecture-design)
3. [Unified Configuration Schema](#unified-configuration-schema)
4. [Core Features](#core-features)
5. [Technical Stack](#technical-stack)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Code Examples](#code-examples)
8. [Development Guidelines](#development-guidelines)
9. [Migration Strategy](#migration-strategy)

## Overview & Rationale

### Why Start Fresh?

After analyzing the current AGV1 codebase, we identified several issues that make a clean implementation preferable:

1. **Mixed Paradigms**: The codebase contains both React Context patterns and OpenFin-specific patterns, creating confusion about where functionality should live
2. **Incomplete Migration**: Headless provider infrastructure exists but isn't being used - providers still run in browser context
3. **Complex Dependencies**: Deep coupling between components makes it difficult to extract OpenFin-specific functionality
4. **Storage Confusion**: Multiple storage approaches (Zustand, localStorage, MongoDB) without clear separation
5. **Architecture Mismatch**: The application wasn't originally designed for OpenFin's multi-window paradigm

### Benefits of Clean Implementation

- **Clear Architecture**: Purpose-built for OpenFin from the start
- **Proper Separation**: Clean boundaries between provider windows, UI windows, and data channels
- **Simplified State**: No legacy state management to work around
- **Better Performance**: Optimized data flow without unnecessary React re-renders
- **Maintainability**: Easier to understand and extend

## Architecture Design

### Component Types

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenFin Workspace Platform                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │   Provider   │  │    Dock      │  │   Storage API      │  │
│  │   Window     │  │  Component*  │  │ (MongoDB/Local)    │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
│         │                  │                    │              │
│         └──────────────────┴────────────────────┘              │
│                            │                                    │
├─────────────────────────────┼────────────────────────────────────┤
│                            │                                    │
│  ┌─────────────────────────┴────────────────────────────┐     │
│  │              OpenFin Channel API                      │     │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │     │
│  │  │Data Channel│  │Ctrl Channel│  │Cfg Channel │    │     │
│  └──┴────────────┴──┴────────────┴──┴────────────┴────┘     │
│         │                │                │                    │
├─────────┼────────────────┼────────────────┼────────────────────┤
│         │                │                │                    │
│  ┌──────┴──────┐  ┌─────┴─────┐  ┌──────┴──────┐            │
│  │  Headless   │  │ DataTable │  │   Config    │            │
│  │  Providers  │  │  Windows  │  │  Dialogs    │            │
│  └─────────────┘  └───────────┘  └─────────────┘            │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

*For detailed Dock implementation, see [OPENFIN_DOCK_IMPLEMENTATION_GUIDE.md](./OPENFIN_DOCK_IMPLEMENTATION_GUIDE.md)

### Window Types

1. **Provider Window** (Hidden)
   - Platform initialization
   - Dock registration
   - Storage management
   - Provider lifecycle management

2. **Headless Provider Windows** (Hidden)
   - STOMP/REST data connections
   - Data transformation
   - Channel publishing
   - Zero UI overhead

3. **DataTable Windows** (Visible)
   - AG-Grid instances
   - Channel subscriptions
   - Profile management
   - Real-time updates

4. **Configuration Dialogs** (Visible)
   - Datasource configuration
   - Profile management
   - Settings import/export
   - Grid options editor

### Data Flow

```
[External Data Source]
         ↓
[Headless Provider Window]
         ↓ (transform & batch)
[OpenFin Data Channel]
         ↓ (publish)
[Multiple DataTable Windows] (subscribe)
         ↓
[AG-Grid Display]
```

### Communication Patterns

- **Data Flow**: Unidirectional from providers to consumers
- **Control Commands**: Request/response pattern via control channel
- **Configuration**: Shared via config channel with change notifications
- **Storage**: Centralized through provider window

## Unified Configuration Schema

### Core Schema Definition

```typescript
interface UnifiedConfig {
  // === Identity ===
  configId: string;           // Unique identifier (UUID)
  appId: string;              // Application identifier
  userId: string;             // User who owns this config
  
  // === Component Classification ===
  componentType: ComponentType;     // 'datasource' | 'grid' | 'profile' | 'workspace' | 'theme'
  componentSubType?: string;        // 'stomp' | 'rest' | 'default' | 'custom'
  
  // === Display ===
  name: string;               // User-friendly name
  description?: string;       // Optional description
  icon?: string;             // Optional icon identifier
  
  // === Configuration Data ===
  config: any;               // Component-specific configuration
  settings: ConfigVersion[]; // Version history
  activeSetting: string;     // ID of active version
  
  // === Metadata ===
  tags?: string[];           // Searchable tags
  category?: string;         // Organizational category
  isShared?: boolean;        // Shared with other users
  isDefault?: boolean;       // System default
  isLocked?: boolean;        // Prevent modifications
  
  // === Audit ===
  createdBy: string;         // User ID who created
  lastUpdatedBy: string;     // User ID who last updated
  creationTime: Date;        // ISO timestamp
  lastUpdated: Date;         // ISO timestamp
  
  // === Soft Delete ===
  deletedAt?: Date;          // Soft delete timestamp
  deletedBy?: string;        // User who deleted
}

interface ConfigVersion {
  versionId: string;         // Unique version ID
  versionNumber: number;     // Sequential version number
  name: string;              // Version name
  config: any;              // Configuration snapshot
  createdTime: Date;        // When version was created
  createdBy: string;        // Who created version
  comment?: string;         // Version comment
  isActive: boolean;        // Is this the active version
}

type ComponentType = 'datasource' | 'grid' | 'profile' | 'workspace' | 'theme' | 'settings';
```

### Component-Specific Schemas

#### DataSource Configuration
```typescript
interface DataSourceConfig extends UnifiedConfig {
  componentType: 'datasource';
  componentSubType: 'stomp' | 'rest';
  config: {
    // Common fields
    url: string;
    autoStart?: boolean;
    reconnectInterval?: number;
    batchSize?: number;
    conflationWindow?: number;
    
    // STOMP specific
    topics?: string[];
    subscriptionHeaders?: Record<string, string>;
    heartbeatInterval?: number;
    
    // REST specific
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    pollingInterval?: number;
    
    // Field mapping
    keyField: string;
    fieldMappings?: FieldMapping[];
    transformScript?: string;
  };
}
```

#### Grid Profile Configuration
```typescript
interface GridProfileConfig extends UnifiedConfig {
  componentType: 'profile';
  config: {
    // Grid state
    columnState: any[];        // AG-Grid column state
    filterModel: any;          // Active filters
    sortModel: any[];          // Active sorts
    
    // Column formatting
    columnFormatting: Record<string, ColumnFormat>;
    
    // Grid options
    gridOptions: {
      theme: string;
      rowHeight: number;
      headerHeight: number;
      enableRangeSelection: boolean;
      enableCharts: boolean;
      sideBar: any;
      statusBar: any;
    };
    
    // Data source binding
    dataSourceId?: string;     // Linked data source
    
    // Layout
    layout?: {
      showToolbar: boolean;
      showStatusBar: boolean;
      pinnedColumns: string[];
    };
  };
}
```

### Storage Architecture

```typescript
interface StorageAdapter {
  // CRUD Operations
  create(config: UnifiedConfig): Promise<string>;
  read(configId: string): Promise<UnifiedConfig | null>;
  update(configId: string, config: Partial<UnifiedConfig>): Promise<void>;
  delete(configId: string): Promise<void>;
  
  // Query Operations
  query(filter: ConfigQuery): Promise<UnifiedConfig[]>;
  count(filter: ConfigQuery): Promise<number>;
  
  // Bulk Operations
  bulkCreate(configs: UnifiedConfig[]): Promise<string[]>;
  bulkUpdate(updates: Array<{id: string, changes: Partial<UnifiedConfig>}>): Promise<void>;
  bulkDelete(configIds: string[]): Promise<void>;
  
  // Version Management
  createVersion(configId: string, version: ConfigVersion): Promise<void>;
  activateVersion(configId: string, versionId: string): Promise<void>;
  deleteVersion(configId: string, versionId: string): Promise<void>;
}

interface ConfigQuery {
  appId?: string;
  userId?: string;
  componentType?: ComponentType;
  componentSubType?: string;
  tags?: string[];
  isShared?: boolean;
  search?: string;           // Text search in name/description
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
```

### Storage Implementation Strategy

1. **Dual Storage Support**
   ```typescript
   class UnifiedConfigService {
     private primaryStorage: StorageAdapter;   // MongoDB
     private fallbackStorage: StorageAdapter;  // LocalStorage
     
     constructor(mongoUrl?: string) {
       if (mongoUrl) {
         this.primaryStorage = new MongoDBAdapter(mongoUrl);
         this.fallbackStorage = new LocalStorageAdapter();
       } else {
         this.primaryStorage = new LocalStorageAdapter();
         this.fallbackStorage = null;
       }
     }
     
     async save(config: UnifiedConfig): Promise<void> {
       try {
         await this.primaryStorage.create(config);
         // Optionally sync to fallback
         if (this.fallbackStorage) {
           await this.fallbackStorage.create(config);
         }
       } catch (error) {
         if (this.fallbackStorage) {
           await this.fallbackStorage.create(config);
         } else {
           throw error;
         }
       }
     }
   }
   ```

2. **LocalStorage Adapter**
   - Store configs by type: `agv1:datasource:*`, `agv1:profile:*`
   - Use IndexedDB for large configs
   - Implement pagination in-memory

3. **MongoDB Adapter**
   - REST API wrapper over MongoDB
   - Implement caching layer
   - Support real-time sync via WebSocket

## Core Features

### Phase 1: Foundation (Week 1-2)
1. **OpenFin Workspace Setup**
   - Provider window with platform initialization
   - Basic manifest configuration
   - Development environment setup

2. **Storage Layer**
   - Define UnifiedConfig schema
   - Implement LocalStorage adapter
   - Create configuration service

3. **Channel Infrastructure**
   - Channel manager implementation
   - Message type definitions
   - Error handling and reconnection

4. **Basic Dock**
   - Register dock with platform
   - Add core buttons (New Table, Settings)
   - Wire up basic actions
   - See [OPENFIN_DOCK_IMPLEMENTATION_GUIDE.md](./OPENFIN_DOCK_IMPLEMENTATION_GUIDE.md) for implementation details

### Phase 2: Data Flow (Week 3-4)
1. **Headless Providers**
   - Provider window manager
   - STOMP data source provider
   - REST data source provider
   - Channel publishing

2. **DataTable Foundation**
   - Standalone DataTable component
   - AG-Grid integration
   - Channel subscription
   - Basic toolbar

3. **Configuration Dialogs**
   - Data source configuration UI
   - Provider start/stop controls
   - Basic field mapping

### Phase 3: Advanced Features (Week 5-6)
1. **Profile Management**
   - Save/load grid state
   - Profile CRUD operations
   - Profile switcher UI

2. **Column Formatting**
   - Formatting dialog
   - Template system
   - Conditional formatting

3. **Real-time Updates**
   - Incremental updates
   - Conflation/batching
   - Performance optimization

### Phase 4: Enterprise Features (Week 7-8)
1. **MongoDB Integration**
   - MongoDB storage adapter
   - API server setup
   - Migration tools

2. **Advanced Grid Features**
   - Multi-window sync
   - Cross-window filtering
   - Shared selections

3. **Import/Export**
   - Configuration backup
   - Bulk import tools
   - Format converters

## Technical Stack

### Core Technologies
- **TypeScript**: Type safety and better tooling
- **React 18**: UI components
- **Vite**: Build tool and dev server
- **OpenFin**: Workspace platform
- **AG-Grid Enterprise**: Data grid component

### State Management
- **Zustand**: Local component state
- **OpenFin Channels**: Cross-window state
- **UnifiedConfig**: Persistent configuration

### UI Framework
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Lucide Icons**: Icon set

### Data Layer
- **STOMP.js**: WebSocket connections
- **MongoDB**: Remote storage
- **IndexedDB**: Large local storage

## Implementation Roadmap

### Week 1: Project Setup
```
agv1-openfin/
├── src/
│   ├── provider/           # Provider window
│   │   ├── main.ts
│   │   ├── platform.ts
│   │   └── dock.ts
│   ├── windows/           # Window components
│   │   ├── datatable/
│   │   ├── config/
│   │   └── headless/
│   ├── services/          # Shared services
│   │   ├── storage/
│   │   ├── channels/
│   │   └── providers/
│   ├── components/        # React components
│   │   ├── grid/
│   │   ├── dialogs/
│   │   └── common/
│   └── types/            # TypeScript types
├── public/
│   └── manifest.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Week 2: Storage & Channels
- Implement UnifiedConfig interfaces
- Create storage adapters
- Build channel manager
- Add configuration service

### Week 3: Basic Windows
- Provider window setup
- Simple DataTable window
- Dock integration
- Window management

### Week 4: Data Providers
- Headless provider framework
- STOMP provider implementation
- Data transformation pipeline
- Channel publishing

### Week 5: Grid Features
- AG-Grid setup
- Profile management
- Column formatting basics
- Toolbar implementation

### Week 6: Configuration UI
- Data source dialog
- Profile manager
- Settings import/export
- Grid options editor

### Week 7: Advanced Features
- Real-time sync
- Multi-window coordination
- Performance optimization
- Error handling

### Week 8: Production Ready
- MongoDB integration
- Testing suite
- Documentation
- Deployment scripts

## Code Examples

### Storage Adapter Pattern
```typescript
// Local storage implementation
class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix = 'agv1:';
  
  async create(config: UnifiedConfig): Promise<string> {
    const key = `${this.prefix}${config.componentType}:${config.configId}`;
    
    // Check if already exists
    if (localStorage.getItem(key)) {
      throw new Error(`Config ${config.configId} already exists`);
    }
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(config));
    
    // Update index
    this.updateIndex(config.componentType, config.configId);
    
    return config.configId;
  }
  
  async query(filter: ConfigQuery): Promise<UnifiedConfig[]> {
    const results: UnifiedConfig[] = [];
    const pattern = `${this.prefix}${filter.componentType || '*'}:`;
    
    // Scan localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(pattern)) {
        const config = JSON.parse(localStorage.getItem(key)!);
        
        // Apply filters
        if (this.matchesFilter(config, filter)) {
          results.push(config);
        }
      }
    }
    
    // Apply sorting and pagination
    return this.applySortAndPagination(results, filter);
  }
  
  private updateIndex(componentType: string, configId: string): void {
    const indexKey = `${this.prefix}index:${componentType}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    if (!index.includes(configId)) {
      index.push(configId);
      localStorage.setItem(indexKey, JSON.stringify(index));
    }
  }
}
```

### Channel Communication
```typescript
// Publisher (in headless provider)
class DataPublisher {
  private channel: OpenFin.ChannelProvider;
  
  async initialize(channelName: string): Promise<void> {
    this.channel = await fin.InterApplicationBus.Channel.create(channelName);
    
    // Register handlers
    this.channel.register('subscribe', async (payload) => {
      return { subscribed: true, snapshot: await this.getSnapshot() };
    });
    
    this.channel.register('control', async (command) => {
      switch (command.action) {
        case 'start': return await this.start();
        case 'stop': return await this.stop();
        case 'restart': return await this.restart();
      }
    });
  }
  
  async publishUpdate(data: any[]): Promise<void> {
    await this.channel.publish('data-update', {
      rows: data,
      timestamp: new Date().toISOString(),
      sequenceNumber: this.getNextSequence()
    });
  }
}

// Subscriber (in DataTable window)
class DataSubscriber {
  private channel: OpenFin.ChannelClient;
  private unsubscribe?: () => void;
  
  async connect(channelName: string): Promise<void> {
    this.channel = await fin.InterApplicationBus.Channel.connect(channelName);
    
    // Get initial snapshot
    const { snapshot } = await this.channel.dispatch('subscribe');
    this.handleSnapshot(snapshot);
    
    // Listen for updates
    this.unsubscribe = this.channel.register('data-update', (data) => {
      this.handleUpdate(data);
    });
  }
  
  async disconnect(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
      await this.channel.disconnect();
    }
  }
}
```

### Window Management
```typescript
class WindowManager {
  async createDataTableWindow(tableId: string, config?: any): Promise<OpenFin.Window> {
    const window = await fin.Window.create({
      name: `datatable-${tableId}`,
      url: `http://localhost:5173/datatable/${tableId}`,
      defaultWidth: 1200,
      defaultHeight: 800,
      frame: true,
      autoShow: true,
      saveWindowState: true,
      customData: {
        tableId,
        config
      }
    });
    
    // Track window
    this.trackWindow(tableId, window);
    
    return window;
  }
  
  async createHeadlessProvider(providerId: string, config: any): Promise<OpenFin.Window> {
    const window = await fin.Window.create({
      name: `provider-${providerId}`,
      url: `http://localhost:5173/provider/headless?id=${providerId}`,
      defaultWidth: 0,
      defaultHeight: 0,
      frame: false,
      autoShow: false,
      showTaskbarIcon: false,
      customData: {
        providerId,
        config
      }
    });
    
    // Monitor health
    this.monitorProviderHealth(providerId, window);
    
    return window;
  }
}
```

## Development Guidelines

### Code Organization
- **Feature-based structure**: Group by feature, not file type
- **Barrel exports**: Use index.ts for clean imports
- **Shared types**: Keep types in dedicated files
- **Service layer**: Abstract OpenFin APIs

### Naming Conventions
- **Files**: kebab-case (data-source-dialog.tsx)
- **Components**: PascalCase (DataSourceDialog)
- **Services**: PascalCase with suffix (ChannelManager)
- **Types**: PascalCase with prefix (IDataSource, TColumnFormat)

### State Management Rules
1. **Local State**: Use useState/useReducer for component state
2. **Shared State**: Use Zustand for window-level state
3. **Cross-Window**: Use OpenFin channels only
4. **Persistent**: Use UnifiedConfig via storage service

### Performance Guidelines
- **Lazy load**: Heavy components and dependencies
- **Virtualize**: Large lists and grids
- **Batch updates**: Group rapid changes
- **Debounce**: User input and API calls
- **Memoize**: Expensive computations

### Testing Strategy
- **Unit Tests**: Services and utilities
- **Component Tests**: React Testing Library
- **Integration Tests**: Multi-window scenarios
- **E2E Tests**: Playwright with OpenFin

## Migration Strategy

### From Current AGV1
1. **Export configurations** via settings dialog
2. **Transform to UnifiedConfig** format
3. **Import into new system**
4. **Verify data integrity**

### Migration Tools
```typescript
class MigrationService {
  async migrateProfiles(oldProfiles: any[]): Promise<UnifiedConfig[]> {
    return oldProfiles.map(profile => ({
      configId: generateUUID(),
      appId: 'agv1',
      userId: 'migrated',
      componentType: 'profile',
      name: profile.name,
      config: {
        columnState: profile.columnSettings,
        gridOptions: profile.gridOptions,
        // ... map other fields
      },
      settings: [{
        versionId: 'v1',
        versionNumber: 1,
        name: 'Migrated',
        config: profile,
        createdTime: new Date(profile.createdAt),
        createdBy: 'migration',
        isActive: true
      }],
      activeSetting: 'v1',
      createdBy: 'migration',
      lastUpdatedBy: 'migration',
      creationTime: new Date(profile.createdAt),
      lastUpdated: new Date(profile.updatedAt)
    }));
  }
  
  async migrateDatasources(oldDatasources: any[]): Promise<UnifiedConfig[]> {
    // Similar transformation for datasources
  }
}
```

### Rollback Plan
1. Keep original localStorage data
2. Provide export in original format
3. Document manual rollback steps
4. Maintain compatibility layer

## Phase 1 Implementation: STOMP Datasource System

This section details the first implementation phase, focusing on creating a complete STOMP datasource flow with OpenFin channels.

### Overview

The first phase establishes the core data flow architecture:
- OpenFin dock for launching configuration
- STOMP datasource configuration dialog
- Headless provider windows running STOMP connections
- DataTable windows consuming data via channels
- Unified configuration storage

### 1. OpenFin Provider Window & Manifest

#### Manifest Configuration (public/manifest.json)
```json
{
  "platform": {
    "name": "AGV3 Platform",
    "uuid": "agv3-platform",
    "icon": "http://localhost:5173/icon.png",
    "autoShow": false,
    "providerUrl": "http://localhost:5173/provider.html",
    "preventQuitOnLastWindowClosed": true,
    "defaultWindowOptions": {
      "frame": true,
      "defaultCentered": true,
      "showTaskbarIcon": true,
      "autoShow": true,
      "saveWindowState": true,
      "contextMenu": true
    },
    "permissions": {
      "System": {
        "launchExternalProcess": true,
        "downloadAsset": true
      }
    }
  },
  "runtime": {
    "version": "40.100.18.4"
  }
}
```

#### Provider Window (src/provider/main.ts)
```typescript
import { init } from '@openfin/workspace-platform';
import { DockProvider } from './dock/dockProvider';
import { StorageService } from '../services/storage/storageService';
import { ChannelService } from '../services/channels/channelService';

async function initializePlatform() {
  console.log('Initializing AGV3 Platform...');
  
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
    }]
  });
  
  // Register dock
  await DockProvider.register();
  
  console.log('AGV3 Platform initialized');
}

// Auto-initialize when loaded
if (typeof fin !== 'undefined') {
  initializePlatform().catch(console.error);
}
```

### 2. Dock Implementation

#### Dock Provider (src/provider/dock/dockProvider.ts)
```typescript
import { Dock, DockProvider as DockProviderType } from '@openfin/workspace';
import { createDockButtons } from './dockButtons';

export class DockProvider {
  static async register(): Promise<void> {
    const dockProvider: DockProviderType = {
      id: 'agv3-dock',
      title: 'AGV3 Dock',
      icon: 'http://localhost:5173/icon.png',
      workspaceComponents: {
        hideHomeButton: false,
        hideWorkspacesButton: false,
        hideNotificationsButton: true,
        hideStorefrontButton: true
      },
      buttons: createDockButtons()
    };
    
    await Dock.register(dockProvider);
    await Dock.show();
  }
}
```

#### Dock Buttons (src/provider/dock/dockButtons.ts)
```typescript
import { DockButton } from '@openfin/workspace';
import { WindowManager } from '../../services/window/windowManager';

export function createDockButtons(): DockButton[] {
  return [
    {
      tooltip: 'Configure Datasource',
      iconUrl: 'http://localhost:5173/icons/database.svg',
      action: {
        id: 'configure-datasource',
        customData: {}
      }
    },
    {
      tooltip: 'New DataTable',
      iconUrl: 'http://localhost:5173/icons/table.svg',
      action: {
        id: 'new-datatable',
        customData: {}
      }
    },
    {
      tooltip: 'Active Providers',
      iconUrl: 'http://localhost:5173/icons/activity.svg',
      action: {
        id: 'show-providers',
        customData: {}
      }
    }
  ];
}

// Register action handlers
export function registerDockActions(): void {
  fin.Platform.getCurrentSync().on('window-action', async (event) => {
    switch (event.name) {
      case 'configure-datasource':
        await WindowManager.openDatasourceConfig();
        break;
      case 'new-datatable':
        await WindowManager.openDataTable();
        break;
      case 'show-providers':
        await WindowManager.showProviderStatus();
        break;
    }
  });
}
```

### 3. Configuration Storage Service

#### Storage Service (src/services/storage/storageService.ts)
```typescript
import { UnifiedConfig, StorageAdapter } from './types';
import { LocalStorageAdapter } from './adapters/localStorageAdapter';
import { ChannelService } from '../channels/channelService';

export class StorageService {
  private static adapter: StorageAdapter;
  private static channelName = 'storage-updates';
  
  static async initialize(): Promise<void> {
    // Use localStorage adapter for now
    this.adapter = new LocalStorageAdapter();
    
    // Create channel for storage updates
    await ChannelService.createChannel(this.channelName);
    
    // Register storage operations
    await ChannelService.registerHandler(
      this.channelName,
      'save',
      async (config: UnifiedConfig) => {
        return await this.save(config);
      }
    );
    
    await ChannelService.registerHandler(
      this.channelName,
      'get',
      async (configId: string) => {
        return await this.get(configId);
      }
    );
    
    await ChannelService.registerHandler(
      this.channelName,
      'query',
      async (filter: any) => {
        return await this.query(filter);
      }
    );
  }
  
  static async save(config: UnifiedConfig): Promise<string> {
    const id = await this.adapter.create(config);
    
    // Broadcast update
    await ChannelService.broadcast(this.channelName, 'config-saved', {
      configId: id,
      componentType: config.componentType
    });
    
    return id;
  }
  
  static async get(configId: string): Promise<UnifiedConfig | null> {
    return await this.adapter.read(configId);
  }
  
  static async query(filter: any): Promise<UnifiedConfig[]> {
    return await this.adapter.query(filter);
  }
}
```

#### Local Storage Adapter (src/services/storage/adapters/localStorageAdapter.ts)
```typescript
import { StorageAdapter, UnifiedConfig } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'agv3:';
  
  async create(config: UnifiedConfig): Promise<string> {
    if (!config.configId) {
      config.configId = uuidv4();
    }
    
    const key = this.getKey(config.componentType, config.configId);
    
    // Add timestamps
    config.creationTime = new Date();
    config.lastUpdated = new Date();
    
    localStorage.setItem(key, JSON.stringify(config));
    this.updateIndex(config.componentType, config.configId);
    
    return config.configId;
  }
  
  async read(configId: string): Promise<UnifiedConfig | null> {
    // Search all component types
    const types = ['datasource', 'profile', 'grid', 'workspace'];
    
    for (const type of types) {
      const key = this.getKey(type, configId);
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    }
    
    return null;
  }
  
  async update(configId: string, updates: Partial<UnifiedConfig>): Promise<void> {
    const existing = await this.read(configId);
    if (!existing) {
      throw new Error(`Config ${configId} not found`);
    }
    
    const updated = {
      ...existing,
      ...updates,
      lastUpdated: new Date(),
      lastUpdatedBy: updates.lastUpdatedBy || existing.lastUpdatedBy
    };
    
    const key = this.getKey(existing.componentType, configId);
    localStorage.setItem(key, JSON.stringify(updated));
  }
  
  async delete(configId: string): Promise<void> {
    const config = await this.read(configId);
    if (config) {
      const key = this.getKey(config.componentType, configId);
      localStorage.removeItem(key);
      this.removeFromIndex(config.componentType, configId);
    }
  }
  
  async query(filter: any): Promise<UnifiedConfig[]> {
    const results: UnifiedConfig[] = [];
    const componentType = filter.componentType || '*';
    
    if (componentType === '*') {
      // Search all types
      const types = ['datasource', 'profile', 'grid', 'workspace'];
      for (const type of types) {
        results.push(...await this.queryByType(type, filter));
      }
    } else {
      results.push(...await this.queryByType(componentType, filter));
    }
    
    return results;
  }
  
  private async queryByType(type: string, filter: any): Promise<UnifiedConfig[]> {
    const results: UnifiedConfig[] = [];
    const indexKey = `${this.prefix}index:${type}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    for (const configId of index) {
      const config = await this.read(configId);
      if (config && this.matchesFilter(config, filter)) {
        results.push(config);
      }
    }
    
    return results;
  }
  
  private matchesFilter(config: UnifiedConfig, filter: any): boolean {
    if (filter.userId && config.userId !== filter.userId) return false;
    if (filter.appId && config.appId !== filter.appId) return false;
    if (filter.componentSubType && config.componentSubType !== filter.componentSubType) return false;
    if (filter.isShared !== undefined && config.isShared !== filter.isShared) return false;
    
    return true;
  }
  
  private getKey(componentType: string, configId: string): string {
    return `${this.prefix}${componentType}:${configId}`;
  }
  
  private updateIndex(componentType: string, configId: string): void {
    const indexKey = `${this.prefix}index:${componentType}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    
    if (!index.includes(configId)) {
      index.push(configId);
      localStorage.setItem(indexKey, JSON.stringify(index));
    }
  }
  
  private removeFromIndex(componentType: string, configId: string): void {
    const indexKey = `${this.prefix}index:${componentType}`;
    const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
    const filtered = index.filter((id: string) => id !== configId);
    localStorage.setItem(indexKey, JSON.stringify(filtered));
  }
}
```

### 4. STOMP Configuration Dialog

#### Configuration Window (src/windows/datasource-config/index.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Datasource Configuration</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/windows/datasource-config/main.tsx"></script>
</body>
</html>
```

#### Configuration App (src/windows/datasource-config/App.tsx)
```typescript
import React, { useState, useEffect } from 'react';
import { StompConfigurationDialog } from './components/StompConfigurationDialog';
import { StorageClient } from '../../services/storage/storageClient';
import { UnifiedConfig } from '../../services/storage/types';
import './styles.css';

export function DatasourceConfigApp() {
  const [datasources, setDatasources] = useState<UnifiedConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  useEffect(() => {
    loadDatasources();
  }, []);
  
  const loadDatasources = async () => {
    const configs = await StorageClient.query({
      componentType: 'datasource',
      appId: 'agv3'
    });
    setDatasources(configs);
  };
  
  const handleSave = async (config: any) => {
    const unifiedConfig: UnifiedConfig = {
      configId: config.id,
      appId: 'agv3',
      userId: 'current-user', // TODO: Get from auth
      componentType: 'datasource',
      componentSubType: 'stomp',
      name: config.name,
      description: config.description || '',
      config: config,
      settings: [],
      activeSetting: 'default',
      createdBy: 'current-user',
      lastUpdatedBy: 'current-user',
      creationTime: new Date(),
      lastUpdated: new Date()
    };
    
    await StorageClient.save(unifiedConfig);
    await loadDatasources();
  };
  
  return (
    <div className="datasource-config-app">
      <div className="header">
        <h1>Datasource Configuration</h1>
      </div>
      
      <div className="content">
        <div className="sidebar">
          <h2>Datasources</h2>
          <button onClick={() => setSelectedId('new')}>
            + New Datasource
          </button>
          
          <div className="datasource-list">
            {datasources.map(ds => (
              <div
                key={ds.configId}
                className={`datasource-item ${selectedId === ds.configId ? 'selected' : ''}`}
                onClick={() => setSelectedId(ds.configId)}
              >
                <div className="name">{ds.name}</div>
                <div className="type">{ds.componentSubType}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="main">
          {selectedId && (
            <StompConfigurationDialog
              config={selectedId === 'new' ? null : datasources.find(ds => ds.configId === selectedId)?.config}
              onSave={handleSave}
              onCancel={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

#### STOMP Configuration Dialog (src/windows/datasource-config/components/StompConfigurationDialog.tsx)
```typescript
// This will be ported from the existing StompConfigurationInline.tsx
// with the following key modifications:

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ConnectionTab } from './tabs/ConnectionTab';
import { FieldsTab } from './tabs/FieldsTab';
import { ColumnsTab } from './tabs/ColumnsTab';
import { StompDatasourceProvider } from '../../../providers/StompDatasourceProvider';
import { ProviderManager } from '../../../services/providers/providerManager';

interface StompConfigurationDialogProps {
  config: any;
  onSave: (config: any) => void;
  onCancel: () => void;
}

export function StompConfigurationDialog({ config, onSave, onCancel }: StompConfigurationDialogProps) {
  const [formData, setFormData] = useState(config || getDefaultConfig());
  const [activeTab, setActiveTab] = useState('connection');
  const [testing, setTesting] = useState(false);
  
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const provider = new StompDatasourceProvider();
      const result = await provider.checkConnection(formData);
      // Show success notification
    } catch (error) {
      // Show error notification
    } finally {
      setTesting(false);
    }
  };
  
  const handleStartProvider = async () => {
    // Save first
    await onSave(formData);
    
    // Then start provider in headless window
    await ProviderManager.startProvider({
      providerId: formData.id,
      config: formData,
      type: 'stomp'
    });
    
    // Show success notification
  };
  
  return (
    <div className="stomp-configuration-dialog">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="columns">Columns</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection">
          <ConnectionTab
            config={formData}
            onChange={setFormData}
            onTest={handleTestConnection}
            testing={testing}
          />
        </TabsContent>
        
        <TabsContent value="fields">
          <FieldsTab
            config={formData}
            onChange={setFormData}
          />
        </TabsContent>
        
        <TabsContent value="columns">
          <ColumnsTab
            config={formData}
            onChange={setFormData}
          />
        </TabsContent>
      </Tabs>
      
      <div className="dialog-footer">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>
          Save
        </Button>
        <Button variant="default" onClick={handleStartProvider}>
          Save & Start Provider
        </Button>
      </div>
    </div>
  );
}
```

### 5. Headless STOMP Provider

#### Provider Window HTML (src/windows/provider/index.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>STOMP Provider</title>
  <meta charset="UTF-8" />
</head>
<body>
  <div id="status">Loading provider...</div>
  <script type="module" src="/src/windows/provider/main.ts"></script>
</body>
</html>
```

#### Provider Main (src/windows/provider/main.ts)
```typescript
import { StompDatasourceProvider } from '../../providers/StompDatasourceProvider';
import { ChannelPublisher } from '../../services/channels/channelPublisher';
import { StorageClient } from '../../services/storage/storageClient';

class HeadlessProvider {
  private provider: StompDatasourceProvider;
  private publisher: ChannelPublisher;
  private config: any;
  private providerId: string;
  
  async initialize() {
    // Get config from window options
    const options = await fin.Window.getCurrentSync().getOptions();
    this.providerId = options.customData.providerId;
    this.config = options.customData.config;
    
    // Create channel for this provider
    const channelName = `data-provider-${this.providerId}`;
    this.publisher = new ChannelPublisher(channelName);
    await this.publisher.initialize();
    
    // Create provider instance
    this.provider = new StompDatasourceProvider();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Register control handlers
    await this.registerControlHandlers();
    
    // Start provider
    await this.start();
  }
  
  private setupEventHandlers() {
    // Handle snapshot data
    this.provider.on('snapshot', async (data: any[], count: number, isLast: boolean) => {
      await this.publisher.publish('snapshot', {
        rows: data,
        count,
        isLast,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle real-time updates
    this.provider.on('update', async (updates: any[]) => {
      await this.publisher.publish('update', {
        updates,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle errors
    this.provider.on('error', async (error: Error) => {
      await this.publisher.publish('error', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle statistics
    this.provider.on('statistics', async (stats: any) => {
      await this.publisher.publish('statistics', stats);
    });
  }
  
  private async registerControlHandlers() {
    this.publisher.registerHandler('control', async (command: any) => {
      switch (command.action) {
        case 'start':
          return await this.start();
        case 'stop':
          return await this.stop();
        case 'restart':
          return await this.restart();
        case 'getStatus':
          return this.getStatus();
      }
    });
    
    this.publisher.registerHandler('getSnapshot', async () => {
      return {
        rows: this.provider.getSnapshot(),
        timestamp: new Date().toISOString()
      };
    });
  }
  
  private async start() {
    try {
      await this.provider.start(this.config);
      await this.updateStatus('running');
      return { success: true };
    } catch (error) {
      await this.updateStatus('error', error.message);
      throw error;
    }
  }
  
  private async stop() {
    await this.provider.stop();
    await this.updateStatus('stopped');
    return { success: true };
  }
  
  private async restart() {
    await this.stop();
    await this.start();
    return { success: true };
  }
  
  private getStatus() {
    return {
      providerId: this.providerId,
      status: this.provider.getStatus(),
      statistics: this.provider.getStatistics(),
      config: this.config
    };
  }
  
  private async updateStatus(status: string, error?: string) {
    // Update status in storage
    await StorageClient.update(this.config.configId, {
      'config.status': status,
      'config.lastError': error,
      'config.lastStatusUpdate': new Date().toISOString()
    });
  }
}

// Initialize when window loads
window.addEventListener('DOMContentLoaded', async () => {
  const provider = new HeadlessProvider();
  await provider.initialize();
  
  // Update UI
  document.getElementById('status')!.textContent = 'Provider running';
});
```

### 6. DataTable with Channel Integration

#### DataTable Window (src/windows/datatable/App.tsx)
```typescript
import React, { useState, useEffect, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ChannelSubscriber } from '../../services/channels/channelSubscriber';
import { ProviderSelector } from './components/ProviderSelector';
import { CellFlashService } from './services/cellFlashService';
import 'ag-grid-enterprise';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './styles.css';

export function DataTableApp() {
  const gridRef = useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const subscriberRef = useRef<ChannelSubscriber | null>(null);
  const flashServiceRef = useRef<CellFlashService | null>(null);
  
  useEffect(() => {
    if (selectedProvider) {
      connectToProvider(selectedProvider);
    } else {
      disconnectFromProvider();
    }
    
    return () => {
      disconnectFromProvider();
    };
  }, [selectedProvider]);
  
  const connectToProvider = async (providerId: string) => {
    // Disconnect existing
    disconnectFromProvider();
    
    // Create new subscriber
    const channelName = `data-provider-${providerId}`;
    subscriberRef.current = new ChannelSubscriber(channelName);
    
    // Initialize flash service
    flashServiceRef.current = new CellFlashService(gridRef.current!.api);
    
    try {
      await subscriberRef.current.connect();
      
      // Handle snapshot data
      subscriberRef.current.on('snapshot', (data: any) => {
        setRowData(data.rows);
        
        // Set column definitions from first row
        if (data.rows.length > 0 && columnDefs.length === 0) {
          const cols = Object.keys(data.rows[0]).map(field => ({
            field,
            headerName: field,
            filter: true,
            sortable: true,
            resizable: true,
            enableCellChangeFlash: true
          }));
          setColumnDefs(cols);
        }
      });
      
      // Handle real-time updates
      subscriberRef.current.on('update', (data: any) => {
        if (gridRef.current?.api) {
          // Apply updates using AG-Grid transaction
          const transaction = {
            update: data.updates
          };
          
          gridRef.current.api.applyTransaction(transaction);
          
          // Flash updated cells
          flashServiceRef.current?.flashUpdatedCells(data.updates);
        }
      });
      
      // Handle statistics
      subscriberRef.current.on('statistics', (stats: any) => {
        setStatistics(stats);
      });
      
      // Request initial snapshot
      const snapshot = await subscriberRef.current.request('getSnapshot');
      if (snapshot) {
        setRowData(snapshot.rows);
      }
      
    } catch (error) {
      console.error('Failed to connect to provider:', error);
    }
  };
  
  const disconnectFromProvider = () => {
    if (subscriberRef.current) {
      subscriberRef.current.disconnect();
      subscriberRef.current = null;
    }
    if (flashServiceRef.current) {
      flashServiceRef.current.destroy();
      flashServiceRef.current = null;
    }
  };
  
  const getRowId = (params: any) => {
    // Use the key column defined in the datasource config
    return params.data.id || params.data._id;
  };
  
  return (
    <div className="datatable-app">
      <div className="toolbar">
        <ProviderSelector
          value={selectedProvider}
          onChange={setSelectedProvider}
        />
        
        {statistics && (
          <div className="statistics">
            <span>Rows: {statistics.totalRows}</span>
            <span>Updates/sec: {statistics.updateRate}</span>
            <span>Status: {statistics.connectionStatus}</span>
          </div>
        )}
      </div>
      
      <div className="ag-theme-alpine grid-container">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={getRowId}
          animateRows={true}
          rowSelection="multiple"
          enableCellChangeFlash={true}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            filter: true,
            sortable: true,
            resizable: true
          }}
        />
      </div>
    </div>
  );
}
```

#### Cell Flash Service (src/windows/datatable/services/cellFlashService.ts)
```typescript
export class CellFlashService {
  private api: any;
  private flashDuration = 1000;
  private flashClass = 'cell-updated';
  
  constructor(api: any) {
    this.api = api;
    this.injectStyles();
  }
  
  flashUpdatedCells(updates: any[]) {
    updates.forEach(update => {
      const rowNode = this.api.getRowNode(update.id);
      if (rowNode) {
        // Get columns that changed
        const changedColumns = this.getChangedColumns(rowNode.data, update);
        
        // Flash each changed cell
        changedColumns.forEach(colId => {
          this.flashCell(rowNode, colId);
        });
      }
    });
  }
  
  private getChangedColumns(oldData: any, newData: any): string[] {
    const changed: string[] = [];
    
    Object.keys(newData).forEach(key => {
      if (oldData[key] !== newData[key]) {
        changed.push(key);
      }
    });
    
    return changed;
  }
  
  private flashCell(rowNode: any, colId: string) {
    const column = this.api.getColumn(colId);
    if (!column) return;
    
    // Add flash class
    this.api.flashCells({
      rowNodes: [rowNode],
      columns: [column],
      flashDelay: 0,
      fadeDelay: this.flashDuration
    });
  }
  
  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ag-theme-alpine .ag-cell.ag-cell-flash {
        background-color: #4CAF50 !important;
        transition: background-color 1s ease-out;
      }
    `;
    document.head.appendChild(style);
  }
  
  destroy() {
    // Cleanup if needed
  }
}
```

### 7. Provider Management Service

#### Provider Manager (src/services/providers/providerManager.ts)
```typescript
export class ProviderManager {
  private static providers = new Map<string, ProviderInfo>();
  
  static async startProvider(options: {
    providerId: string;
    config: any;
    type: 'stomp' | 'rest';
  }): Promise<void> {
    // Create headless window for provider
    const window = await fin.Window.create({
      name: `provider-${options.providerId}`,
      url: `http://localhost:5173/provider.html`,
      defaultWidth: 0,
      defaultHeight: 0,
      defaultTop: -1000,
      defaultLeft: -1000,
      frame: false,
      autoShow: false,
      showTaskbarIcon: false,
      saveWindowState: false,
      customData: {
        providerId: options.providerId,
        config: options.config
      }
    });
    
    // Track provider
    this.providers.set(options.providerId, {
      window,
      config: options.config,
      type: options.type,
      status: 'starting',
      startTime: new Date()
    });
    
    // Monitor provider health
    this.monitorProvider(options.providerId);
  }
  
  static async stopProvider(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      await provider.window.close();
      this.providers.delete(providerId);
    }
  }
  
  static async getActiveProviders(): Promise<ProviderInfo[]> {
    return Array.from(this.providers.values());
  }
  
  private static async monitorProvider(providerId: string) {
    const checkHealth = async () => {
      const provider = this.providers.get(providerId);
      if (!provider) return;
      
      try {
        // Check if window is still alive
        const info = await provider.window.getInfo();
        if (!info) {
          provider.status = 'error';
        }
      } catch (error) {
        // Window is gone, remove from tracking
        this.providers.delete(providerId);
      }
    };
    
    // Check every 5 seconds
    setInterval(checkHealth, 5000);
  }
}

interface ProviderInfo {
  window: OpenFin.Window;
  config: any;
  type: string;
  status: string;
  startTime: Date;
}
```

### Key Features Preserved

1. **STOMP Connection Management**
   - WebSocket URL with HTTP discovery
   - Connection/disconnection handling
   - Heartbeat configuration
   - Reconnection logic

2. **Field Inference**
   - Analyze JSON message structure
   - Detect field types
   - Build hierarchical field tree
   - 60-second timeout

3. **Column Definition Generation**
   - Convert inferred fields to AG-Grid columns
   - Type mapping (text, number, date, etc.)
   - Width calculations
   - Filter configurations

4. **Real-time Updates**
   - Snapshot collection with batching
   - Incremental updates via transactions
   - Duplicate detection using key column
   - Cell flashing on changes

5. **Statistics Tracking**
   - Connection status
   - Message rates
   - Data volumes
   - Performance metrics

### Next Steps

1. Implement the OpenFin manifest and provider window
2. Create the dock with datasource button
3. Build the storage service with local adapter
4. Port the STOMP configuration dialog
5. Implement the headless provider
6. Create the DataTable with channel subscription
7. Add cell flashing for real-time updates
8. Test end-to-end data flow

## Summary

This blueprint provides a comprehensive plan for building a clean OpenFin implementation of AGV1. The key improvements include:

1. **Clear Architecture**: Purpose-built for OpenFin's multi-window paradigm
2. **Unified Configuration**: Single schema for all component types
3. **Proper Separation**: Headless providers, UI windows, and data channels
4. **Enterprise Ready**: MongoDB support, versioning, and audit trails
5. **Migration Path**: Tools to move from the current system

The implementation focuses on maintainability, performance, and extensibility while leveraging OpenFin's strengths for financial desktop applications.