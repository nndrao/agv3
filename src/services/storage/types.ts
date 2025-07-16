export interface UnifiedConfig {
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

export interface ConfigVersion {
  versionId: string;         // Unique version ID
  versionNumber: number;     // Sequential version number
  name: string;              // Version name
  config: any;              // Configuration snapshot
  createdTime: Date;        // When version was created
  createdBy: string;        // Who created version
  comment?: string;         // Version comment
  isActive: boolean;        // Is this the active version
}

export type ComponentType = 'datasource' | 'grid' | 'profile' | 'workspace' | 'theme' | 'settings';

export interface StorageAdapter {
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

export interface ConfigQuery {
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