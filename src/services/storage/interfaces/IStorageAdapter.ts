// import { UnifiedConfig } from '../types';

/**
 * Workspace data structure for OpenFin workspaces
 */
export interface WorkspaceData {
  workspaceId: string;
  name: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    version: string;
    tags?: string[];
  };
  snapshot: {
    windows: any[];  // OpenFin window states
    views: ViewState[];
    pages: any[];    // OpenFin page states
  };
}

/**
 * View state within a workspace
 */
export interface ViewState {
  viewId: string;
  name: string;
  url: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  componentType: string;
  customData?: Record<string, any>;
}

/**
 * Component configuration linked to a view
 */
export interface ComponentConfig {
  configId: string;        // Same as viewId for direct mapping
  workspaceId?: string;    // Optional link to workspace
  componentType: string;
  profiles: any[];         // Component-specific profiles
  activeProfile: string;
  settings: Record<string, any>;
  metadata?: {
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Storage adapter interface for flexible storage backends
 * Supports localStorage, IndexedDB, MongoDB, etc.
 */
export interface IStorageAdapter {
  // Initialization
  init?(): Promise<void>;
  
  // Workspace operations
  saveWorkspace(workspace: WorkspaceData): Promise<void>;
  getWorkspace(workspaceId: string): Promise<WorkspaceData | null>;
  listWorkspaces(userId?: string): Promise<WorkspaceData[]>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  updateWorkspace(workspaceId: string, updates: Partial<WorkspaceData>): Promise<void>;
  
  // Component config operations
  saveComponentConfig(config: ComponentConfig): Promise<void>;
  getComponentConfig(configId: string): Promise<ComponentConfig | null>;
  deleteComponentConfig(configId: string): Promise<void>;
  updateComponentConfig(configId: string, updates: Partial<ComponentConfig>): Promise<void>;
  
  // Bulk operations for efficiency
  getComponentConfigs(configIds: string[]): Promise<ComponentConfig[]>;
  saveComponentConfigs(configs: ComponentConfig[]): Promise<void>;
  
  // Query operations
  findComponentConfigsByWorkspace(workspaceId: string): Promise<ComponentConfig[]>;
  findComponentConfigsByType(componentType: string): Promise<ComponentConfig[]>;
  
  // Utility methods
  clear(): Promise<void>;
  export(): Promise<{ workspaces: WorkspaceData[]; configs: ComponentConfig[] }>;
  import(data: { workspaces: WorkspaceData[]; configs: ComponentConfig[] }): Promise<void>;
  
  // Health check
  isAvailable(): Promise<boolean>;
}

/**
 * Storage adapter factory
 */
export interface IStorageAdapterFactory {
  create(type: 'localStorage' | 'indexedDB' | 'mongodb' | 'hybrid', config?: any): IStorageAdapter;
}