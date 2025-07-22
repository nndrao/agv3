import { IStorageAdapter, WorkspaceData, ComponentConfig } from '../interfaces/IStorageAdapter';

/**
 * MongoDB storage adapter for remote storage
 * This is a stub implementation that will be completed when backend API is ready
 */
export class MongoDBAdapter implements IStorageAdapter {
  private apiUrl: string;
  private authToken: string;
  private userId: string;
  
  constructor(config: {
    apiUrl: string;
    authToken: string;
    userId: string;
  }) {
    this.apiUrl = config.apiUrl;
    this.authToken = config.authToken;
    this.userId = config.userId;
  }
  
  private async fetchAPI(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        'X-User-Id': this.userId,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response;
  }
  
  // Workspace operations
  async saveWorkspace(workspace: WorkspaceData): Promise<void> {
    await this.fetchAPI('/workspaces', {
      method: 'POST',
      body: JSON.stringify(workspace)
    });
  }
  
  async getWorkspace(workspaceId: string): Promise<WorkspaceData | null> {
    try {
      const response = await this.fetchAPI(`/workspaces/${workspaceId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get workspace:', error);
      return null;
    }
  }
  
  async listWorkspaces(userId?: string): Promise<WorkspaceData[]> {
    const queryParams = userId ? `?userId=${userId}` : '';
    const response = await this.fetchAPI(`/workspaces${queryParams}`);
    return await response.json();
  }
  
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.fetchAPI(`/workspaces/${workspaceId}`, {
      method: 'DELETE'
    });
  }
  
  async updateWorkspace(workspaceId: string, updates: Partial<WorkspaceData>): Promise<void> {
    await this.fetchAPI(`/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
  
  // Component config operations
  async saveComponentConfig(config: ComponentConfig): Promise<void> {
    await this.fetchAPI('/configs', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
  
  async getComponentConfig(configId: string): Promise<ComponentConfig | null> {
    try {
      const response = await this.fetchAPI(`/configs/${configId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get component config:', error);
      return null;
    }
  }
  
  async deleteComponentConfig(configId: string): Promise<void> {
    await this.fetchAPI(`/configs/${configId}`, {
      method: 'DELETE'
    });
  }
  
  async updateComponentConfig(configId: string, updates: Partial<ComponentConfig>): Promise<void> {
    await this.fetchAPI(`/configs/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
  
  // Bulk operations
  async getComponentConfigs(configIds: string[]): Promise<ComponentConfig[]> {
    const response = await this.fetchAPI('/configs/bulk-get', {
      method: 'POST',
      body: JSON.stringify({ configIds })
    });
    return await response.json();
  }
  
  async saveComponentConfigs(configs: ComponentConfig[]): Promise<void> {
    await this.fetchAPI('/configs/bulk', {
      method: 'POST',
      body: JSON.stringify({ configs })
    });
  }
  
  // Query operations
  async findComponentConfigsByWorkspace(workspaceId: string): Promise<ComponentConfig[]> {
    const response = await this.fetchAPI(`/workspaces/${workspaceId}/configs`);
    return await response.json();
  }
  
  async findComponentConfigsByType(componentType: string): Promise<ComponentConfig[]> {
    const response = await this.fetchAPI(`/configs?type=${componentType}`);
    return await response.json();
  }
  
  // Utility methods
  async clear(): Promise<void> {
    // This would need special permissions
    await this.fetchAPI('/admin/clear', {
      method: 'POST'
    });
  }
  
  async export(): Promise<{ workspaces: WorkspaceData[]; configs: ComponentConfig[] }> {
    const response = await this.fetchAPI('/export');
    return await response.json();
  }
  
  async import(data: { workspaces: WorkspaceData[]; configs: ComponentConfig[] }): Promise<void> {
    await this.fetchAPI('/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchAPI('/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

/**
 * MongoDB storage configuration
 */
export interface MongoDBConfig {
  apiUrl: string;
  authToken: string;
  userId: string;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Create MongoDB adapter with configuration
 */
export function createMongoDBAdapter(config: MongoDBConfig): MongoDBAdapter {
  return new MongoDBAdapter(config);
}