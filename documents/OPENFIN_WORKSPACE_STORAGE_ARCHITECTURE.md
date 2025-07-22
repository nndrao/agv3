# OpenFin Workspace Storage Architecture

## Overview
This document outlines the storage architecture for OpenFin workspaces in AGV3, designed to be flexible enough to support multiple storage backends including future MongoDB integration. The architecture maintains a clear separation between OpenFin workspace data and UI component configurations while using IDs to keep them synchronized.

## Core Principles

1. **Separation of Concerns**: OpenFin workspace data (layout, positions) is stored separately from component-specific configurations (profiles, settings)
2. **Storage Agnostic**: Abstract storage interface allows switching between localStorage, IndexedDB, and MongoDB
3. **ID-based Synchronization**: Views and their configurations are linked through stable IDs
4. **Future-ready**: Architecture supports both local and remote storage scenarios

## Data Model

### 1. OpenFin Workspace Data
Stores the structural and layout information of the workspace:

```typescript
interface WorkspaceData {
  workspaceId: string;
  name: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    version: string;
  };
  snapshot: {
    windows: WindowState[];
    views: ViewState[];
    pages: PageState[];
  };
}

interface ViewState {
  viewId: string;                    // Unique ID for the view
  name: string;                      // e.g., "datagrid-stomp-trading-view"
  url: string;                       // e.g., "/datagrid-stomp?id=abc123"
  bounds: { x: number; y: number; width: number; height: number };
  componentType: string;             // e.g., "DataGridStomp"
  customData?: Record<string, any>;
}
```

### 2. Component Configuration Data
Stores the component-specific settings and profiles:

```typescript
interface ComponentConfig {
  configId: string;        // Same as viewId for direct mapping
  componentType: string;   // e.g., "DataGridStomp"
  profiles: Profile[];
  activeProfile: string;
  settings: ComponentSettings;
}

interface Profile {
  profileId: string;
  name: string;
  config: Record<string, any>;  // Component-specific configuration
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}
```

### 3. ID Synchronization
The key to keeping workspace and component data in sync:

```typescript
// View ID is used as the primary key for both systems
viewId === configId  // This ensures 1:1 mapping

// Example:
// OpenFin View: { viewId: "datagrid-stomp-trading-123", ... }
// Component Config: { configId: "datagrid-stomp-trading-123", ... }
```

## Storage Architecture

### Storage Adapter Interface
All storage implementations must conform to this interface:

```typescript
interface IStorageAdapter {
  // Workspace operations
  saveWorkspace(workspace: WorkspaceData): Promise<void>;
  getWorkspace(workspaceId: string): Promise<WorkspaceData | null>;
  listWorkspaces(): Promise<WorkspaceData[]>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  
  // Component config operations
  saveComponentConfig(config: ComponentConfig): Promise<void>;
  getComponentConfig(configId: string): Promise<ComponentConfig | null>;
  deleteComponentConfig(configId: string): Promise<void>;
  
  // Bulk operations for efficiency
  getComponentConfigs(configIds: string[]): Promise<ComponentConfig[]>;
  
  // Utility methods
  clear(): Promise<void>;
  export(): Promise<any>;
  import(data: any): Promise<void>;
}
```

### Storage Implementations

#### 1. LocalStorageAdapter (Current)
```typescript
class LocalStorageAdapter implements IStorageAdapter {
  private workspacePrefix = 'agv3:workspace:';
  private configPrefix = 'agv3:config:';
  
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    const key = `${this.workspacePrefix}${workspace.workspaceId}`;
    localStorage.setItem(key, JSON.stringify(workspace));
  }
  
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    const key = `${this.configPrefix}${config.configId}`;
    localStorage.setItem(key, JSON.stringify(config));
  }
}
```

#### 2. IndexedDBAdapter (Enhanced Local)
```typescript
class IndexedDBAdapter implements IStorageAdapter {
  private db: IDBDatabase;
  
  async init(): Promise<void> {
    // Initialize IndexedDB with workspace and config object stores
  }
  
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    // Save to IndexedDB with better performance and storage capacity
  }
}
```

#### 3. MongoDBAdapter (Future)
```typescript
class MongoDBAdapter implements IStorageAdapter {
  private apiUrl: string;
  private authToken: string;
  
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    const response = await fetch(`${this.apiUrl}/workspaces`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workspace)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save workspace');
    }
  }
  
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    // Save component config separately for better performance
    await fetch(`${this.apiUrl}/configs`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
}
```

#### 4. HybridAdapter (Local + Remote)
```typescript
class HybridAdapter implements IStorageAdapter {
  constructor(
    private localAdapter: IStorageAdapter,
    private remoteAdapter: IStorageAdapter
  ) {}
  
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    // Save locally first for immediate access
    await this.localAdapter.saveWorkspace(workspace);
    
    // Then sync to remote in background
    this.remoteAdapter.saveWorkspace(workspace).catch(err => {
      console.error('Remote sync failed:', err);
      // Queue for later sync
    });
  }
}
```

## Storage Manager
Central coordinator for all storage operations:

```typescript
class StorageManager {
  private adapter: IStorageAdapter;
  
  constructor(adapter: IStorageAdapter) {
    this.adapter = adapter;
  }
  
  // Save both workspace and related component configs
  async saveWorkspaceWithConfigs(workspace: WorkspaceData): Promise<void> {
    // Save workspace
    await this.adapter.saveWorkspace(workspace);
    
    // Extract view IDs from workspace
    const viewIds = workspace.snapshot.views.map(v => v.viewId);
    
    // Component configs are saved separately by each component
    // This method just ensures the workspace is saved
  }
  
  // Load workspace and notify components to load their configs
  async loadWorkspaceWithConfigs(workspaceId: string): Promise<{
    workspace: WorkspaceData;
    configs: ComponentConfig[];
  }> {
    const workspace = await this.adapter.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    // Get all component configs for the views in this workspace
    const viewIds = workspace.snapshot.views.map(v => v.viewId);
    const configs = await this.adapter.getComponentConfigs(viewIds);
    
    return { workspace, configs };
  }
}
```

## MongoDB Integration Plan

### 1. Database Schema
```javascript
// Workspaces Collection
{
  _id: ObjectId,
  workspaceId: String,
  userId: String,
  name: String,
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    createdBy: String,
    version: String,
    tags: [String]
  },
  snapshot: {
    windows: Array,
    views: Array,
    pages: Array
  }
}

// Component Configs Collection
{
  _id: ObjectId,
  configId: String,  // Same as viewId
  workspaceId: String,  // Foreign key to workspace
  userId: String,
  componentType: String,
  profiles: [{
    profileId: String,
    name: String,
    config: Object,
    metadata: Object
  }],
  activeProfile: String,
  settings: Object
}

// Indexes
db.workspaces.createIndex({ workspaceId: 1, userId: 1 })
db.configs.createIndex({ configId: 1 })
db.configs.createIndex({ workspaceId: 1 })
```

### 2. REST API Design
```yaml
# Workspace endpoints
POST   /api/workspaces                    # Create workspace
GET    /api/workspaces                    # List user workspaces
GET    /api/workspaces/:id                # Get workspace
PUT    /api/workspaces/:id                # Update workspace
DELETE /api/workspaces/:id                # Delete workspace
POST   /api/workspaces/:id/apply          # Apply workspace to current session

# Component config endpoints  
POST   /api/configs                       # Save component config
GET    /api/configs/:id                   # Get component config
PUT    /api/configs/:id                   # Update component config
DELETE /api/configs/:id                   # Delete component config
GET    /api/workspaces/:id/configs        # Get all configs for workspace

# Bulk operations
POST   /api/configs/bulk                  # Save multiple configs
POST   /api/configs/bulk-get              # Get multiple configs by IDs
```

### 3. Authentication & Security
```typescript
interface AuthConfig {
  provider: 'jwt' | 'oauth' | 'custom';
  endpoint: string;
  clientId?: string;
  scope?: string[];
}

// All API calls include auth header
headers: {
  'Authorization': `Bearer ${token}`,
  'X-User-Id': userId,
  'X-Workspace-Id': workspaceId
}
```

### 4. Offline Support & Sync
```typescript
class OfflineQueueManager {
  private queue: OperationQueue[] = [];
  
  async queueOperation(operation: Operation): Promise<void> {
    this.queue.push({
      id: generateId(),
      operation,
      timestamp: Date.now(),
      retries: 0
    });
  }
  
  async syncWhenOnline(): Promise<void> {
    // Process queued operations when connection restored
  }
}
```

## Implementation Roadmap

### Phase 1: Current Implementation (LocalStorage)
- [x] Basic LocalStorageAdapter
- [x] Component profile management
- [x] View instance ID management
- [ ] Workspace snapshot save/load

### Phase 2: Enhanced Local Storage
- [ ] Create IStorageAdapter interface
- [ ] Refactor LocalStorageAdapter to implement interface
- [ ] Add IndexedDB adapter for larger storage
- [ ] Implement StorageManager

### Phase 3: MongoDB Preparation
- [ ] Design MongoDB schemas
- [ ] Create REST API specification
- [ ] Build MongoDBAdapter
- [ ] Add authentication layer

### Phase 4: MongoDB Integration
- [ ] Deploy backend API
- [ ] Implement HybridAdapter
- [ ] Add offline queue support
- [ ] Migration tools for existing data

## Usage Examples

### Saving a Workspace
```typescript
// Get current workspace snapshot
const platform = fin.Platform.getCurrentSync();
const snapshot = await platform.getSnapshot();

// Create workspace data
const workspace: WorkspaceData = {
  workspaceId: generateId(),
  name: 'Morning Trading Setup',
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: currentUser.id,
    version: '1.0.0'
  },
  snapshot
};

// Save using storage manager
await storageManager.saveWorkspaceWithConfigs(workspace);
```

### Loading a Workspace
```typescript
// Load workspace and configs
const { workspace, configs } = await storageManager.loadWorkspaceWithConfigs(workspaceId);

// Apply OpenFin snapshot
await platform.applySnapshot(workspace.snapshot);

// Components will automatically load their configs using the view IDs
```

### Component Auto-Configuration
```typescript
// In DataGridStomp component
useEffect(() => {
  const loadConfig = async () => {
    // Get view ID from URL params
    const viewId = getViewInstanceId();
    
    // Load component config using the same ID
    const config = await storageManager.adapter.getComponentConfig(viewId);
    
    if (config) {
      // Apply saved configuration
      applyConfiguration(config);
    }
  };
  
  loadConfig();
}, [viewId]);
```

## Benefits of This Architecture

1. **Flexibility**: Easy to switch between storage backends
2. **Scalability**: MongoDB support for enterprise deployments  
3. **Performance**: Local caching with remote sync
4. **Reliability**: Offline support with queue management
5. **Maintainability**: Clear separation of concerns
6. **Security**: Centralized authentication for remote storage

## Security Considerations

1. **Local Storage**: No encryption by default, consider encrypting sensitive data
2. **MongoDB**: Use TLS, authentication, and field-level encryption
3. **API Security**: Implement rate limiting, CORS, and input validation
4. **Data Privacy**: Ensure GDPR compliance for user data

## Migration Strategy

### From LocalStorage to MongoDB
```typescript
async function migrateToMongoDB(localAdapter: LocalStorageAdapter, mongoAdapter: MongoDBAdapter) {
  // Export all data from local storage
  const data = await localAdapter.export();
  
  // Import to MongoDB
  for (const workspace of data.workspaces) {
    await mongoAdapter.saveWorkspace(workspace);
  }
  
  for (const config of data.configs) {
    await mongoAdapter.saveComponentConfig(config);
  }
}
```

## Conclusion
This architecture provides a robust foundation for OpenFin workspace storage that can scale from local single-user scenarios to enterprise multi-user deployments with centralized MongoDB storage. The ID-based synchronization ensures data consistency while maintaining flexibility in storage backends.