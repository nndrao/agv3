# AGV3 Centralized Configuration Service Architecture

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Architecture](#proposed-architecture)
4. [Database Schema Design](#database-schema-design)
5. [App Variables Integration](#app-variables-integration)
6. [Implementation Details](#implementation-details)
7. [Migration Strategy](#migration-strategy)
8. [API Reference](#api-reference)
9. [Usage Examples](#usage-examples)
10. [Timeline and Roadmap](#timeline-and-roadmap)

---

## Executive Summary

The AGV3 application currently uses fragmented storage solutions across different components, with each component implementing its own persistence mechanism using localStorage. This document proposes a centralized Configuration Service using OpenFin's Inter-Application Bus (IAB) that will:

- **Unify** all configuration storage into a single service
- **Standardize** the API across all components
- **Enable** future migration to MongoDB
- **Improve** performance with IndexedDB
- **Provide** real-time synchronization between windows
- **Support** complex queries and relationships

---

## Current State Analysis

### Current Storage Patterns

The application currently uses multiple storage approaches:

1. **LocalStorage Direct Access**
   - Grid configurations: `grid_column_groups_{gridInstanceId}`
   - Conditional formatting: `grid_conditional_formatting_{gridInstanceId}`
   - Calculated columns: `grid_calculated_columns_{gridInstanceId}`

2. **StorageClient/LocalStorageAdapter**
   - Profile configurations: `agv3:DataGridStomp:{viewInstanceId}`
   - Provider configurations: `agv3:datasource:{providerId}`

3. **Custom Implementations**
   - ProfileRegistry for view mappings
   - Direct localStorage for UI preferences
   - AppVariablesProvider using static maps (not shared across windows)
   - TemplateResolver for variable substitution

### Current localStorage Schema

#### Profile Storage Structure
```typescript
// Key: agv3:DataGridStomp:{viewInstanceId}
{
  configId: string,              // UUID
  componentType: "DataGridStomp",
  settings: [                     // Version history
    {
      versionId: string,
      name: string,
      config: {
        // Profile data
        selectedProviderId: string | null,
        gridState: { /* AG-Grid state */ },
        columnGroups: string[],    // References to grid-level configs
        conditionalFormatting: string[],
        calculatedColumns: string[],
        gridOptions: { /* ... */ }
      }
    }
  ],
  activeSetting: string,          // Active version ID
  // ... metadata
}
```

#### Provider Storage Structure
```typescript
// Key: agv3:datasource:{providerId}
{
  configId: string,
  componentType: "datasource",
  componentSubType: "stomp" | "rest" | "variables",
  config: {
    // Provider configuration
    websocketUrl: string,
    listenerTopic: string,
    requestMessage: string,
    snapshotEndToken: string,
    keyColumn: string,
    columnDefinitions: ColDef[],
    // ... other settings
  }
}
```

#### Grid-Level Configurations
```typescript
// Key: grid_column_groups_{gridInstanceId}
{
  version: "2.0.0",
  groups: [
    {
      groupId: string,
      headerName: string,
      children: string[],
      columnStates: { /* ... */ }
    }
  ],
  timestamp: number
}
```

### Problems with Current Approach

1. **Fragmentation** - Storage logic scattered across 30+ files
2. **Inconsistency** - Different APIs and patterns
3. **Limited Capacity** - localStorage has 5-10MB limit
4. **No Query Capability** - Must load all data to filter
5. **Performance Issues** - Synchronous operations block UI
6. **No Relationships** - Difficult to maintain references
7. **No Real-time Sync** - Windows don't share updates
8. **App Variables Isolation** - Variables not accessible across windows
9. **No Template Resolution** - Manual string replacement needed

---

## Proposed Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Configuration Service                        │
│                    (Provider - Main Window)                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ConfigurationProvider.ts                     │  │
│  │                                                           │  │
│  │  • IAB Channel Provider (config-service)                 │  │
│  │  • Request Handler & Router                              │  │
│  │  • Caching Layer                                         │  │
│  │  • Event Broadcasting                                    │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ConfigurationDatabase.ts                    │  │
│  │                                                           │  │
│  │  • IndexedDB Implementation                              │  │
│  │  • Single Table Schema                                   │  │
│  │  • Query Engine                                          │  │
│  │  • Migration Support                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    OpenFin IAB Channel
                    "config-service"
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼────────┐     ┌───────▼────────┐     ┌───────▼────────┐
│  DataGrid      │     │  Provider      │     │  Dock          │
│  Component     │     │  Window        │     │  Provider      │
│                │     │                │     │                │
│ Configuration  │     │ Configuration  │     │ Configuration  │
│    Client      │     │    Client      │     │    Client      │
└────────────────┘     └────────────────┘     └────────────────┘
```

### Key Components

1. **Configuration Provider** - Central service running in main window
2. **Configuration Database** - IndexedDB implementation
3. **Configuration Client** - Client library for all components
4. **React Hooks** - Easy integration for React components
5. **Migration Service** - Automated data migration

---

## Database Schema Design

### Single Table Architecture

Using a single table design for maximum flexibility and MongoDB compatibility:

```typescript
interface UnifiedConfigRecord {
  // === Primary Key ===
  id: string;                    // UUID - universal identifier
  
  // === Record Classification ===
  recordType: string;            // 'profile' | 'provider' | 'gridConfig' | 'registry'
  recordSubType?: string;        // 'DataGridStomp' | 'stomp' | 'columnGroups'
  
  // === Identity ===
  name: string;                  // Human-readable name
  userId?: string;               // Owner (null for system/shared configs)
  appId: string;                 // Application ID ('agv3')
  tenantId?: string;             // For multi-tenant scenarios
  
  // === Flexible JSON Storage ===
  config: any;                   // Main configuration object (JSON)
  settings: any;                 // Version history or additional settings (JSON)
  metadata: any;                 // Any additional metadata (JSON)
  
  // === Search & Relationships ===
  parentId?: string;             // Parent record ID (for hierarchies)
  tags: string[];                // For categorization and search
  searchKey?: string;            // Composite search field
  
  // === Audit ===
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;               // Optimistic locking
  
  // === Soft Delete ===
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  
  // === Access Control ===
  isShared: boolean;
  isLocked: boolean;
  permissions?: any;             // JSON object for ACL
}
```

### IndexedDB Implementation

```typescript
class UnifiedConfigDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'agv3-config-db';
  private readonly DB_VERSION = 1;
  
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('configurations')) {
          const store = db.createObjectStore('configurations', { 
            keyPath: 'id' 
          });
          
          // Core indexes for performance
          store.createIndex('recordType', 'recordType');
          store.createIndex('recordSubType', 'recordSubType');
          store.createIndex('userId', 'userId');
          store.createIndex('name', 'name');
          store.createIndex('searchKey', 'searchKey');
          store.createIndex('parentId', 'parentId');
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('updatedAt', 'updatedAt');
          store.createIndex('isDeleted', 'isDeleted');
          
          // Compound indexes for common queries
          store.createIndex('type_user', ['recordType', 'userId']);
          store.createIndex('type_subtype', ['recordType', 'recordSubType']);
          store.createIndex('user_type_deleted', ['userId', 'recordType', 'isDeleted']);
          
          // Multi-entry index for tags
          store.createIndex('tags', 'tags', { multiEntry: true });
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
    });
  }
  
  // CRUD Operations
  async create(record: UnifiedConfigRecord): Promise<string> {
    const transaction = this.db!.transaction(['configurations'], 'readwrite');
    const store = transaction.objectStore('configurations');
    
    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => resolve(record.id);
      request.onerror = () => reject(request.error);
    });
  }
  
  async find(query: QueryFilter): Promise<UnifiedConfigRecord[]> {
    // Implementation of flexible querying
  }
}
```

### MongoDB Compatibility

The same schema works directly with MongoDB:

```javascript
// MongoDB Collection: configurations
{
  "_id": "uuid-here",
  "recordType": "profile",
  "recordSubType": "DataGridStomp",
  "name": "Trading Dashboard",
  "userId": "user123",
  "appId": "agv3",
  
  "config": {
    // Any structure - profiles, providers, grid configs
  },
  
  "settings": {
    // Version history or additional settings
  },
  
  "metadata": {
    // Any additional data
  },
  
  "tags": ["trading", "equities"],
  "createdAt": ISODate("2024-01-01"),
  "isDeleted": false
}

// MongoDB Indexes
db.configurations.createIndex({ "recordType": 1 })
db.configurations.createIndex({ "recordType": 1, "userId": 1 })
db.configurations.createIndex({ "tags": 1 })
```

---

## App Variables Integration

### Overview

App Variables are a special type of configuration that provides global, user-scoped, or session-scoped variables accessible across all OpenFin windows. They integrate seamlessly with the Configuration Service, using the same storage, synchronization, and API patterns.

### App Variables Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Configuration Service Provider                  │
│                       (Main Provider Window)                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                ConfigurationProvider.ts                   │  │
│  │                                                           │  │
│  │  Handles all configuration types including:               │  │
│  │  • Profiles (recordType: 'profile')                      │  │
│  │  • Providers (recordType: 'provider')                    │  │
│  │  • Grid Configs (recordType: 'gridConfig')               │  │
│  │  ➤ APP VARIABLES (recordType: 'appVariables') ◄          │  │
│  │                                                           │  │
│  │  Special Topics for Variables:                           │  │
│  │  • variables:get - Get single variable                   │  │
│  │  • variables:set - Set variable value                    │  │
│  │  • variables:batch - Batch operations                    │  │
│  │  • template:resolve - Resolve template strings           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    OpenFin IAB Channel
                    "config-service"
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        │                       │                       │
   Components use               │                  Template Resolution
   useAppVariables()           │                  {datasource.variable}
        │                       │                       │
┌───────▼────────┐     ┌───────▼────────┐     ┌───────▼────────┐
│  DataGrid      │     │  Provider      │     │  Any Component │
│                │     │  Config        │     │                │
│  gridHeight =  │     │  url = wss://  │     │  Resolves      │
│  {ui.height}   │     │  {conn.host}   │     │  Templates     │
└────────────────┘     └────────────────┘     └────────────────┘
```

### App Variables Data Schema

App Variables are stored in the unified configuration table with a specific structure:

```typescript
interface AppVariablesRecord extends UnifiedConfigRecord {
  // Classification
  recordType: 'appVariables';
  recordSubType: 'global' | 'user' | 'session';
  
  // Identity
  name: string;  // e.g., "Trading Connection Variables"
  
  // Variable Storage
  config: {
    variables: {
      [key: string]: {
        value: any;                    // The actual value
        type: 'string' | 'number' | 'boolean' | 'object' | 'array';
        description?: string;           // Variable description
        readonly?: boolean;             // Prevent modifications
        encrypted?: boolean;            // Encrypt sensitive values
        validationRule?: string;        // Validation expression
        lastModified?: Date;            // Last change timestamp
        modifiedBy?: string;            // User who last modified
      }
    }
  };
  
  // Metadata
  metadata: {
    scope: 'global' | 'user' | 'workspace';
    category: string;  // e.g., "connection", "ui", "trading"
    version: number;
    dependencies?: string[];  // Other datasources this depends on
  };
}
```

### App Variables Client Service

**File:** `src/services/configuration/AppVariablesClient.ts`

```typescript
export class AppVariablesClient {
  private configClient: ConfigurationClient;
  private variablesDatasources: Map<string, string> = new Map();
  
  constructor() {
    this.configClient = ConfigurationClient.getInstance();
  }
  
  async initialize(): Promise<void> {
    await this.configClient.connect();
    
    // Load all app variables datasources
    const datasources = await this.configClient.query({
      recordType: 'appVariables'
    });
    
    // Cache datasource mappings
    datasources.forEach(ds => {
      this.variablesDatasources.set(ds.name, ds.id);
    });
  }
  
  // Get or create a variables datasource
  async ensureDatasource(
    name: string, 
    scope: 'global' | 'user' | 'session' = 'global'
  ): Promise<string> {
    if (this.variablesDatasources.has(name)) {
      return this.variablesDatasources.get(name)!;
    }
    
    const existing = await this.configClient.query({
      recordType: 'appVariables',
      name: name
    });
    
    if (existing.length > 0) {
      this.variablesDatasources.set(name, existing[0].id);
      return existing[0].id;
    }
    
    // Create new datasource
    const id = await this.configClient.create({
      recordType: 'appVariables',
      recordSubType: scope,
      name: name,
      config: { variables: {} },
      metadata: { scope, createdAt: new Date() }
    });
    
    this.variablesDatasources.set(name, id);
    return id;
  }
  
  // Variable operations
  async get(datasourceName: string, key: string): Promise<any> {
    const datasourceId = await this.ensureDatasource(datasourceName);
    return await this.configClient.channel.dispatch('variables:get', {
      datasourceId,
      key
    });
  }
  
  async set(datasourceName: string, key: string, value: any): Promise<void> {
    const datasourceId = await this.ensureDatasource(datasourceName);
    await this.configClient.channel.dispatch('variables:set', {
      datasourceId,
      key,
      value
    });
  }
  
  // Batch operations for performance
  async batch(
    datasourceName: string, 
    operations: Array<{type: 'set' | 'delete', key: string, value?: any}>
  ): Promise<void> {
    const datasourceId = await this.ensureDatasource(datasourceName);
    await this.configClient.channel.dispatch('variables:batch', {
      datasourceId,
      operations
    });
  }
  
  // Template resolution
  async resolveTemplate(template: string): Promise<string> {
    return await this.configClient.channel.dispatch('template:resolve', {
      template
    });
  }
}
```

### React Hook for App Variables

**File:** `src/hooks/useAppVariables.ts`

```typescript
export function useAppVariables(datasourceName: string) {
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const clientRef = useRef<AppVariablesClient>();
  
  useEffect(() => {
    const init = async () => {
      const client = new AppVariablesClient();
      await client.initialize();
      clientRef.current = client;
      
      // Load initial variables
      const datasourceId = await client.ensureDatasource(datasourceName);
      const config = await ConfigurationClient.getInstance().get(datasourceId);
      
      if (config?.config?.variables) {
        const vars: Record<string, any> = {};
        Object.entries(config.config.variables).forEach(([key, varData]: [string, any]) => {
          vars[key] = varData.value;
        });
        setVariables(vars);
      }
      
      // Subscribe to changes
      const unsubscribe = ConfigurationClient.getInstance().subscribe(
        { recordType: 'appVariables', name: datasourceName },
        (event) => {
          if (event.changeType === 'variable') {
            setVariables(prev => ({
              ...prev,
              [event.variableKey]: event.variableValue
            }));
          } else if (event.changeType === 'variables-batch') {
            setVariables(prev => {
              const updated = { ...prev };
              event.operations.forEach((op: any) => {
                if (op.type === 'set') {
                  updated[op.key] = op.value;
                } else if (op.type === 'delete') {
                  delete updated[op.key];
                }
              });
              return updated;
            });
          }
        }
      );
      
      setLoading(false);
      return unsubscribe;
    };
    
    const cleanup = init();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [datasourceName]);
  
  const get = (key: string) => variables[key];
  
  const set = async (key: string, value: any) => {
    await clientRef.current?.set(datasourceName, key, value);
  };
  
  const batch = async (operations: any[]) => {
    await clientRef.current?.batch(datasourceName, operations);
  };
  
  return {
    variables,
    loading,
    get,
    set,
    batch
  };
}
```

### Template Resolution

Templates allow dynamic value substitution using the pattern `{datasourceName.variableKey}`:

```typescript
// Template Resolution in ConfigurationProvider
this.channel.register('template:resolve', async ({ template, context }) => {
  // Pattern: {datasourceName.variableKey}
  const pattern = /\{([^.]+)\.([^}]+)\}/g;
  let resolved = template;
  let match;
  
  while ((match = pattern.exec(template)) !== null) {
    const [fullMatch, datasourceName, variableKey] = match;
    
    try {
      // Find the app variables datasource
      const results = await this.database.find({
        recordType: 'appVariables',
        name: datasourceName
      });
      
      if (results.length > 0) {
        const value = results[0].config.variables[variableKey]?.value;
        resolved = resolved.replace(fullMatch, String(value ?? ''));
      }
    } catch (error) {
      console.warn(`Failed to resolve ${fullMatch}:`, error);
    }
  }
  
  return resolved;
});
```

### App Variables Usage Examples

#### Creating an App Variables Datasource

```typescript
// Create a new App Variables datasource
const configClient = ConfigurationClient.getInstance();

await configClient.create({
  recordType: 'appVariables',
  recordSubType: 'global',
  name: 'Trading Connection Variables',
  config: {
    variables: {
      serverHost: {
        value: 'trading.example.com',
        type: 'string',
        description: 'Trading server hostname'
      },
      serverPort: {
        value: 8080,
        type: 'number',
        description: 'Trading server port'
      },
      apiKey: {
        value: 'xxx-xxx-xxx',
        type: 'string',
        encrypted: true,
        readonly: false,
        description: 'API authentication key'
      },
      maxConnections: {
        value: 100,
        type: 'number',
        validationRule: 'value > 0 && value <= 1000'
      }
    }
  },
  metadata: {
    scope: 'global',
    category: 'connection',
    version: 1
  }
});
```

#### Using Variables in Components

```typescript
function TradingDashboard() {
  const { variables, set, get } = useAppVariables('Trading Connection Variables');
  
  // Use variables in configuration
  const websocketUrl = `wss://${get('serverHost')}:${get('serverPort')}/stream`;
  
  // Update a variable (syncs to all windows)
  const updateHost = async (newHost: string) => {
    await set('serverHost', newHost);
  };
  
  // Batch update multiple variables
  const updateConnection = async (host: string, port: number) => {
    await batch([
      { type: 'set', key: 'serverHost', value: host },
      { type: 'set', key: 'serverPort', value: port }
    ]);
  };
  
  return (
    <div>
      <h3>Connection: {websocketUrl}</h3>
      <input 
        value={get('serverHost')} 
        onChange={(e) => updateHost(e.target.value)}
      />
    </div>
  );
}
```

#### Template Resolution in Provider Configuration

```typescript
// Define a provider with template variables
const providerConfig = {
  websocketUrl: "{Trading Connection Variables.serverHost}:{Trading Connection Variables.serverPort}",
  apiEndpoint: "https://{API Settings.baseUrl}/v1/data",
  credentials: {
    apiKey: "{Trading Connection Variables.apiKey}"
  }
};

// Resolve templates before use
const client = new AppVariablesClient();
const resolvedUrl = await client.resolveTemplate(providerConfig.websocketUrl);
// Result: "trading.example.com:8080"
```

#### Variable Editor Component

```typescript
function VariableEditor({ datasourceName }: { datasourceName: string }) {
  const { variables, set, loading } = useAppVariables(datasourceName);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  
  if (loading) return <div>Loading variables...</div>;
  
  return (
    <div>
      <h3>Variables for {datasourceName}</h3>
      
      {Object.entries(variables).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input 
            value={key} 
            disabled 
            style={{ flex: 1 }}
          />
          <input 
            value={value}
            onChange={(e) => set(key, e.target.value)}
            style={{ flex: 2 }}
          />
        </div>
      ))}
      
      <div style={{ marginTop: '20px' }}>
        <h4>Add New Variable</h4>
        <input 
          placeholder="Key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input 
          placeholder="Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <button onClick={() => {
          if (newKey && newValue) {
            set(newKey, newValue);
            setNewKey('');
            setNewValue('');
          }
        }}>
          Add Variable
        </button>
      </div>
    </div>
  );
}
```

### Benefits of App Variables Integration

1. **Real-time Synchronization** - Changes instantly visible across all windows
2. **Unified Storage** - Same IndexedDB table as all other configurations
3. **Consistent API** - Same query, update, and subscription patterns
4. **Template Support** - Variables can be used in any configuration via templates
5. **Type Safety** - Full TypeScript support with proper typing
6. **Access Control** - Support for readonly and encrypted variables
7. **Validation** - Built-in validation rules for variables
8. **Audit Trail** - Track who changed what and when
9. **Performance** - Batch operations and caching for optimal performance
10. **MongoDB Ready** - Same schema works with MongoDB

---

## Implementation Details

### Configuration Provider Service

**File:** `src/services/configuration/ConfigurationProvider.ts`

```typescript
export class ConfigurationProvider {
  private database: ConfigurationDatabase;
  private channel: any;
  private cache: Map<string, CacheEntry>;
  private subscriptions: Map<string, Set<string>>;
  
  async initialize(): Promise<void> {
    // Initialize database
    this.database = new ConfigurationDatabase();
    await this.database.initialize();
    
    // Create IAB channel
    this.channel = await fin.InterApplicationBus.Channel.create('config-service');
    
    // Register handlers
    this.registerHandlers();
    
    // Migrate existing data
    await this.migrateExistingData();
    
    console.log('Configuration Provider initialized');
  }
  
  private registerHandlers(): void {
    // CRUD Operations
    this.channel.register('config:create', async (payload) => {
      const id = await this.database.create(payload);
      this.broadcastChange('create', payload);
      return id;
    });
    
    this.channel.register('config:read', async (payload) => {
      const { id } = payload;
      return await this.database.read(id);
    });
    
    this.channel.register('config:update', async (payload) => {
      const { id, updates } = payload;
      await this.database.update(id, updates);
      this.broadcastChange('update', { id, ...updates });
    });
    
    this.channel.register('config:delete', async (payload) => {
      const { id } = payload;
      await this.database.delete(id);
      this.broadcastChange('delete', { id });
    });
    
    // Query Operations
    this.channel.register('config:query', async (filter) => {
      return await this.database.find(filter);
    });
    
    // Batch Operations
    this.channel.register('config:batch', async (operations) => {
      return await this.database.batch(operations);
    });
    
    // Subscriptions
    this.channel.register('config:subscribe', async (payload) => {
      const { subscriptionId, filter } = payload;
      this.addSubscription(subscriptionId, filter);
      return { success: true };
    });
    
    this.channel.register('config:unsubscribe', async (payload) => {
      const { subscriptionId } = payload;
      this.removeSubscription(subscriptionId);
      return { success: true };
    });
  }
  
  private broadcastChange(type: string, data: any): void {
    const event = { type, data, timestamp: Date.now() };
    this.channel.publish('config:changed', event);
  }
}
```

### Configuration Client Service

**File:** `src/services/configuration/ConfigurationClient.ts`

```typescript
export class ConfigurationClient {
  private static instance: ConfigurationClient;
  private channel: any;
  private cache: Map<string, CacheEntry>;
  private connected: boolean = false;
  
  static getInstance(): ConfigurationClient {
    if (!this.instance) {
      this.instance = new ConfigurationClient();
    }
    return this.instance;
  }
  
  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      this.channel = await fin.InterApplicationBus.Channel.connect('config-service');
      this.setupEventListeners();
      this.connected = true;
      console.log('Connected to Configuration Service');
    } catch (error) {
      console.error('Failed to connect to Configuration Service:', error);
      throw error;
    }
  }
  
  async create(record: Partial<UnifiedConfigRecord>): Promise<string> {
    await this.ensureConnected();
    const fullRecord = this.prepareRecord(record);
    return await this.channel.dispatch('config:create', fullRecord);
  }
  
  async get(id: string, useCache = true): Promise<UnifiedConfigRecord | null> {
    await this.ensureConnected();
    
    if (useCache && this.cache.has(id)) {
      const cached = this.cache.get(id)!;
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.data;
      }
    }
    
    const result = await this.channel.dispatch('config:read', { id });
    if (result) {
      this.cache.set(id, { data: result, timestamp: Date.now() });
    }
    return result;
  }
  
  async update(id: string, updates: Partial<UnifiedConfigRecord>): Promise<void> {
    await this.ensureConnected();
    await this.channel.dispatch('config:update', { id, updates });
    this.cache.delete(id);
  }
  
  async delete(id: string): Promise<void> {
    await this.ensureConnected();
    await this.channel.dispatch('config:delete', { id });
    this.cache.delete(id);
  }
  
  async query(filter: QueryFilter): Promise<UnifiedConfigRecord[]> {
    await this.ensureConnected();
    return await this.channel.dispatch('config:query', filter);
  }
  
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }
  
  private prepareRecord(partial: Partial<UnifiedConfigRecord>): UnifiedConfigRecord {
    return {
      id: partial.id || uuidv4(),
      recordType: partial.recordType || 'profile',
      name: partial.name || 'Unnamed',
      appId: 'agv3',
      userId: getCurrentUserId(),
      config: partial.config || {},
      settings: partial.settings || {},
      metadata: partial.metadata || {},
      tags: partial.tags || [],
      createdAt: new Date(),
      createdBy: getCurrentUserId(),
      updatedAt: new Date(),
      updatedBy: getCurrentUserId(),
      version: 1,
      isDeleted: false,
      isShared: false,
      isLocked: false,
      ...partial
    };
  }
}
```

### React Hook for Easy Integration

**File:** `src/services/configuration/useConfiguration.ts`

```typescript
export function useConfiguration<T = any>(
  recordType: ConfigRecordType,
  recordSubType?: string
) {
  const [configs, setConfigs] = useState<UnifiedConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<ConfigurationClient>();
  const subscriptionRef = useRef<string>();
  
  useEffect(() => {
    const initializeClient = async () => {
      try {
        const client = ConfigurationClient.getInstance();
        await client.connect();
        clientRef.current = client;
        
        // Load initial data
        await loadConfigs();
        
        // Subscribe to changes
        subscriptionRef.current = client.subscribe(
          { recordType, recordSubType, isDeleted: false },
          handleConfigChange
        );
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeClient();
    
    return () => {
      if (subscriptionRef.current && clientRef.current) {
        clientRef.current.unsubscribe(subscriptionRef.current);
      }
    };
  }, [recordType, recordSubType]);
  
  const loadConfigs = async () => {
    if (!clientRef.current) return;
    
    try {
      const results = await clientRef.current.query({
        recordType,
        recordSubType,
        isDeleted: false
      });
      setConfigs(results);
    } catch (err) {
      setError(err as Error);
    }
  };
  
  const handleConfigChange = (event: ConfigEvent) => {
    if (event.type === 'create') {
      setConfigs(prev => [...prev, event.record]);
    } else if (event.type === 'update') {
      setConfigs(prev => prev.map(c => 
        c.id === event.record.id ? event.record : c
      ));
    } else if (event.type === 'delete') {
      setConfigs(prev => prev.filter(c => c.id !== event.recordId));
    }
  };
  
  const create = async (config: Partial<T>): Promise<string> => {
    if (!clientRef.current) throw new Error('Client not initialized');
    
    return await clientRef.current.create({
      recordType,
      recordSubType,
      config
    });
  };
  
  const update = async (id: string, updates: Partial<T>): Promise<void> => {
    if (!clientRef.current) throw new Error('Client not initialized');
    
    await clientRef.current.update(id, { config: updates });
  };
  
  const remove = async (id: string): Promise<void> => {
    if (!clientRef.current) throw new Error('Client not initialized');
    
    await clientRef.current.delete(id);
  };
  
  return {
    configs,
    loading,
    error,
    create,
    update,
    remove,
    refresh: loadConfigs
  };
}
```

---

## Migration Strategy

### Phase 1: Infrastructure Setup (Week 1)

1. **Create Core Services**
   ```
   src/services/configuration/
   ├── ConfigurationProvider.ts
   ├── ConfigurationDatabase.ts
   ├── ConfigurationClient.ts
   ├── useConfiguration.ts
   └── types.ts
   ```

2. **Initialize in Main Provider**
   ```typescript
   // src/provider/main.ts
   import { ConfigurationProvider } from '@/services/configuration/ConfigurationProvider';
   
   async function initializeProvider() {
     const configProvider = new ConfigurationProvider();
     await configProvider.initialize();
   }
   ```

### Phase 2: Data Migration (Week 2)

```typescript
class ConfigurationMigration {
  private client: ConfigurationClient;
  
  async migrateAll(): Promise<MigrationReport> {
    const report: MigrationReport = {
      profiles: 0,
      providers: 0,
      gridConfigs: 0,
      errors: []
    };
    
    try {
      // Migrate profiles
      report.profiles = await this.migrateProfiles();
      
      // Migrate providers
      report.providers = await this.migrateProviders();
      
      // Migrate grid configurations
      report.gridConfigs = await this.migrateGridConfigs();
      
    } catch (error) {
      report.errors.push(error);
    }
    
    return report;
  }
  
  private async migrateProfiles(): Promise<number> {
    let count = 0;
    
    // Find all profile keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('agv3:DataGridStomp:')) continue;
      
      const data = JSON.parse(localStorage.getItem(key)!);
      
      // Convert to new format
      await this.client.create({
        id: data.configId,
        recordType: 'profile',
        recordSubType: 'DataGridStomp',
        name: data.name,
        userId: data.userId,
        config: data.settings?.[0]?.config || data.config,
        settings: {
          versions: data.settings,
          activeVersionId: data.activeSetting
        },
        metadata: {
          migrated: true,
          migratedFrom: 'localStorage',
          originalKey: key,
          migratedAt: new Date()
        }
      });
      
      count++;
    }
    
    return count;
  }
  
  private async migrateProviders(): Promise<number> {
    let count = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('agv3:datasource:')) continue;
      
      const data = JSON.parse(localStorage.getItem(key)!);
      
      await this.client.create({
        id: data.configId,
        recordType: 'provider',
        recordSubType: data.componentSubType,
        name: data.name,
        userId: data.userId,
        config: data.config,
        metadata: {
          migrated: true,
          originalKey: key
        }
      });
      
      count++;
    }
    
    return count;
  }
  
  private async migrateGridConfigs(): Promise<number> {
    let count = 0;
    
    // Migrate column groups
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key?.startsWith('grid_column_groups_')) {
        const gridId = key.replace('grid_column_groups_', '');
        const data = JSON.parse(localStorage.getItem(key)!);
        
        await this.client.create({
          recordType: 'gridConfig',
          recordSubType: 'columnGroups',
          name: `Column Groups - ${gridId}`,
          parentId: gridId,
          config: data,
          metadata: { migratedFrom: key }
        });
        count++;
      }
      
      // Similar for conditional formatting and calculated columns
    }
    
    return count;
  }
}
```

### Phase 3: Component Updates (Week 3-4)

#### Update Profiles Usage

**Before:**
```typescript
// Old approach
import { StorageClient } from '@/services/storage/storageClient';

const config = await StorageClient.get(viewInstanceId);
await StorageClient.save(config);
```

**After:**
```typescript
// New approach
import { useConfiguration } from '@/services/configuration/useConfiguration';

const { configs, create, update } = useConfiguration('profile', 'DataGridStomp');

// Save new profile
await create({
  name: 'My Profile',
  config: profileData
});

// Update existing
await update(profileId, { config: updatedData });
```

#### Update Provider Usage

**Before:**
```typescript
// Direct localStorage
const providers = await StorageClient.query({
  componentType: 'datasource'
});
```

**After:**
```typescript
// Using hook
const { configs: providers } = useConfiguration('provider', 'stomp');
```

#### Update Grid Configurations

**Before:**
```typescript
// Direct localStorage
localStorage.setItem(
  `grid_column_groups_${gridId}`,
  JSON.stringify(columnGroups)
);
```

**After:**
```typescript
// Using service
const { create, update } = useConfiguration('gridConfig', 'columnGroups');

await create({
  name: 'Column Groups',
  parentId: gridId,
  config: { groups: columnGroups }
});
```

---

## API Reference

### ConfigurationClient Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `connect()` | Connect to configuration service | None | `Promise<void>` |
| `create(record)` | Create new configuration | `Partial<UnifiedConfigRecord>` | `Promise<string>` |
| `get(id, useCache)` | Get configuration by ID | `string, boolean` | `Promise<UnifiedConfigRecord>` |
| `update(id, updates)` | Update configuration | `string, Partial<UnifiedConfigRecord>` | `Promise<void>` |
| `delete(id)` | Delete configuration | `string` | `Promise<void>` |
| `query(filter)` | Query configurations | `QueryFilter` | `Promise<UnifiedConfigRecord[]>` |
| `subscribe(filter, callback)` | Subscribe to changes | `QueryFilter, Function` | `string` |
| `unsubscribe(id)` | Unsubscribe from changes | `string` | `void` |
| `batch(operations)` | Batch operations | `BatchOperation[]` | `Promise<BatchResult>` |

### App Variables Client Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `initialize()` | Initialize client and load datasources | None | `Promise<void>` |
| `ensureDatasource(name, scope)` | Get or create variables datasource | `string, 'global'\|'user'\|'session'` | `Promise<string>` |
| `get(datasource, key)` | Get variable value | `string, string` | `Promise<any>` |
| `set(datasource, key, value)` | Set variable value | `string, string, any` | `Promise<void>` |
| `batch(datasource, operations)` | Batch variable operations | `string, VariableOperation[]` | `Promise<void>` |
| `resolveTemplate(template)` | Resolve template with variables | `string` | `Promise<string>` |

### useAppVariables Hook

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `variables` | `Record<string, any>` | Current variables object |
| `loading` | `boolean` | Loading state |
| `get(key)` | `Function` | Get variable value |
| `set(key, value)` | `Function` | Set variable value |
| `batch(operations)` | `Function` | Batch operations |

### useConfiguration Hook

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `configs` | `UnifiedConfigRecord[]` | Current configurations |
| `loading` | `boolean` | Loading state |
| `error` | `Error | null` | Error state |
| `create` | `Function` | Create new config |
| `update` | `Function` | Update existing config |
| `remove` | `Function` | Delete config |
| `refresh` | `Function` | Reload configurations |

### Query Filter Options

```typescript
interface QueryFilter {
  recordType?: string | string[];
  recordSubType?: string;
  userId?: string;
  tags?: string[];
  isDeleted?: boolean;
  parentId?: string;
  
  // MongoDB-style operators
  $and?: QueryFilter[];
  $or?: QueryFilter[];
  $text?: { $search: string };
  $gt?: { [field: string]: any };
  $lt?: { [field: string]: any };
  $in?: { [field: string]: any[] };
}
```

---

## Usage Examples

### Profile Management

```typescript
import { useConfiguration } from '@/services/configuration/useConfiguration';

function ProfileManager() {
  const {
    configs: profiles,
    loading,
    create,
    update,
    remove
  } = useConfiguration<ProfileData>('profile', 'DataGridStomp');
  
  const saveProfile = async (profileData: ProfileData) => {
    try {
      const id = await create({
        name: profileData.name,
        config: profileData,
        tags: ['trading', 'dashboard']
      });
      console.log('Profile created:', id);
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };
  
  const updateProfile = async (profileId: string, changes: Partial<ProfileData>) => {
    await update(profileId, {
      config: changes,
      updatedAt: new Date()
    });
  };
  
  return (
    <div>
      {loading ? (
        <div>Loading profiles...</div>
      ) : (
        profiles.map(profile => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onUpdate={(data) => updateProfile(profile.id, data)}
            onDelete={() => remove(profile.id)}
          />
        ))
      )}
    </div>
  );
}
```

### Provider Configuration

```typescript
function ProviderConfig() {
  const {
    configs: providers,
    create,
    update
  } = useConfiguration<StompConfig>('provider', 'stomp');
  
  const addProvider = async (config: StompConfig) => {
    await create({
      name: config.name,
      config: {
        websocketUrl: config.websocketUrl,
        listenerTopic: config.topic,
        requestMessage: config.requestMessage,
        snapshotEndToken: config.snapshotEndToken,
        keyColumn: config.keyColumn,
        columnDefinitions: config.columns
      },
      metadata: {
        createdFrom: 'UI',
        version: '1.0.0'
      }
    });
  };
  
  return (
    <ProviderList
      providers={providers}
      onAdd={addProvider}
      onUpdate={(id, data) => update(id, { config: data })}
    />
  );
}
```

### Grid Configuration Management

```typescript
function GridSettings({ gridId }: { gridId: string }) {
  // Column Groups
  const {
    configs: columnGroups,
    create: createColumnGroup,
    update: updateColumnGroup
  } = useConfiguration('gridConfig', 'columnGroups');
  
  // Conditional Formatting
  const {
    configs: formatRules,
    create: createRule,
    update: updateRule
  } = useConfiguration('gridConfig', 'conditionalFormatting');
  
  // Get configurations for this grid
  const gridColumnGroups = columnGroups.filter(c => c.parentId === gridId);
  const gridFormatRules = formatRules.filter(c => c.parentId === gridId);
  
  const saveColumnGroups = async (groups: ColumnGroup[]) => {
    const existing = gridColumnGroups[0];
    
    if (existing) {
      await updateColumnGroup(existing.id, {
        config: { groups },
        updatedAt: new Date()
      });
    } else {
      await createColumnGroup({
        name: `Column Groups - ${gridId}`,
        parentId: gridId,
        config: { groups }
      });
    }
  };
  
  return (
    <div>
      <ColumnGroupEditor
        groups={gridColumnGroups[0]?.config.groups || []}
        onSave={saveColumnGroups}
      />
      <ConditionalFormattingEditor
        rules={gridFormatRules[0]?.config.rules || []}
        onSave={saveFormatRules}
      />
    </div>
  );
}
```

### Complex Queries

```typescript
async function findUserTradingProfiles(userId: string) {
  const client = ConfigurationClient.getInstance();
  
  // Find all trading profiles for a user
  const profiles = await client.query({
    recordType: 'profile',
    userId: userId,
    tags: ['trading'],
    isDeleted: false,
    $and: [
      { createdAt: { $gt: new Date('2024-01-01') } },
      { $or: [
        { 'config.autoConnect': true },
        { 'metadata.priority': 'high' }
      ]}
    ]
  });
  
  return profiles;
}
```

### Batch Operations

```typescript
async function importConfigurations(importData: any[]) {
  const client = ConfigurationClient.getInstance();
  
  const operations: BatchOperation[] = importData.map(item => ({
    type: 'create',
    data: {
      recordType: item.type,
      name: item.name,
      config: item.config,
      metadata: {
        imported: true,
        importedAt: new Date()
      }
    }
  }));
  
  const result = await client.batch(operations);
  console.log(`Imported ${result.successful} configurations`);
}
```

### Real-time Synchronization

```typescript
function RealtimeConfigMonitor() {
  const [recentChanges, setRecentChanges] = useState<ConfigEvent[]>([]);
  const client = useRef(ConfigurationClient.getInstance());
  
  useEffect(() => {
    // Subscribe to all profile changes
    const subscriptionId = client.current.subscribe(
      { recordType: 'profile' },
      (event: ConfigEvent) => {
        setRecentChanges(prev => [event, ...prev].slice(0, 10));
        
        // Show notification
        if (event.type === 'create') {
          toast.success(`New profile created: ${event.record.name}`);
        } else if (event.type === 'update') {
          toast.info(`Profile updated: ${event.record.name}`);
        } else if (event.type === 'delete') {
          toast.warning(`Profile deleted`);
        }
      }
    );
    
    return () => {
      client.current.unsubscribe(subscriptionId);
    };
  }, []);
  
  return (
    <div>
      <h3>Recent Configuration Changes</h3>
      {recentChanges.map((change, i) => (
        <div key={i}>
          {change.type} - {change.record?.name} - {new Date(change.timestamp).toLocaleTimeString()}
        </div>
      ))}
    </div>
  );
}
```

---

## Timeline and Roadmap

### Implementation Timeline

| Week | Phase | Tasks | Deliverables |
|------|-------|-------|--------------|
| **Week 1** | Infrastructure | • Create ConfigurationProvider<br>• Implement IndexedDB<br>• Set up IAB channels | Core service running |
| **Week 2** | Migration | • Build migration utilities<br>• Migrate existing data<br>• Create fallback mechanisms | All data migrated |
| **Week 3** | Critical Components | • Update DataGrid components<br>• Update Provider management<br>• Update Profile system | Main components using new service |
| **Week 4** | Remaining Components | • Update all other components<br>• Remove old storage code<br>• Update documentation | Complete migration |
| **Week 5** | Testing & Optimization | • Performance testing<br>• Bug fixes<br>• Optimization<br>• User acceptance testing | Production-ready system |

### Future Enhancements

#### Phase 2: MongoDB Integration (Q2 2025)
- Add MongoDB adapter
- Implement sync mechanism
- Add conflict resolution
- Enable offline support

#### Phase 3: Advanced Features (Q3 2025)
- Add full-text search
- Implement data compression
- Add encryption for sensitive configs
- Create admin dashboard

#### Phase 4: Enterprise Features (Q4 2025)
- Multi-tenant support
- Role-based access control
- Audit logging
- Data retention policies

---

## Benefits Summary

### Immediate Benefits
1. **Consistency** - Single API for all components
2. **Performance** - 10x faster queries with IndexedDB
3. **Capacity** - 100x more storage space
4. **Real-time** - Instant synchronization between windows
5. **Reliability** - Transactional operations

### Long-term Benefits
1. **Scalability** - Ready for MongoDB migration
2. **Maintainability** - Single codebase to maintain
3. **Extensibility** - Easy to add new config types
4. **Security** - Centralized access control
5. **Analytics** - Usage tracking and insights

### Developer Experience
1. **Simple API** - Easy to learn and use
2. **Type Safety** - Full TypeScript support
3. **React Integration** - Ready-to-use hooks
4. **Documentation** - Comprehensive guides
5. **Debugging** - Centralized logging

---

## Conclusion

The Centralized Configuration Service represents a major architectural improvement for AGV3, providing a unified, scalable, and maintainable solution for all configuration management needs. By consolidating scattered storage implementations into a single service, we achieve better performance, consistency, and developer experience while preparing for future growth and enterprise requirements.

The migration path is designed to be gradual and non-disruptive, allowing the application to continue functioning during the transition. With proper implementation and testing, this service will become the foundation for all configuration management in AGV3.

---

*Document Version: 1.0.0*  
*Last Updated: 2024*  
*Author: AGV3 Development Team*