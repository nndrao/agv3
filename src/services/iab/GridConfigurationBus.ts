import { v4 as uuidv4 } from 'uuid';
import { ConditionalRule } from '@/components/conditional-formatting/types';

// Request types for grid configuration
export type GridConfigRequest = 
  | { type: 'GET_GRID_CONFIG'; viewId: string }
  | { type: 'UPDATE_GRID_CONFIG'; viewId: string; config: Partial<GridConfiguration> }
  | { type: 'GET_COLUMN_DEFS'; viewId: string }
  | { type: 'UPDATE_COLUMN_DEFS'; viewId: string; columnDefs: any[] }
  | { type: 'GET_PROFILE'; viewId: string }
  | { type: 'UPDATE_PROFILE'; viewId: string; profile: any }
  | { type: 'APPLY_CONDITIONAL_FORMATTING'; viewId: string; rules: ConditionalRule[] }
  | { type: 'GET_AVAILABLE_COLUMNS'; viewId: string }
  | { type: 'GET_AVAILABLE_VARIABLES'; viewId: string };

// Response types
export interface GridConfigResponse<T = any> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: string;
}

// Grid configuration interface
export interface GridConfiguration {
  gridOptions: any;
  columnDefs: any[];
  profile: any;
  conditionalFormatting?: ConditionalRule[];
}

// Column info for editor
export interface ColumnInfo {
  field: string;
  headerName: string;
  type?: string;
}

export class GridConfigurationBus {
  private static instance: GridConfigurationBus;
  private channelName = 'grid-configuration-bus';
  private channel: fin.InterApplicationBus.Channel | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  private viewConfigurations = new Map<string, GridConfiguration>();
  private isProvider = false;

  private constructor() {}

  static getInstance(): GridConfigurationBus {
    if (!GridConfigurationBus.instance) {
      GridConfigurationBus.instance = new GridConfigurationBus();
    }
    return GridConfigurationBus.instance;
  }

  // Initialize as provider (main grid window)
  async initializeAsProvider(viewId: string): Promise<void> {
    try {
      console.log(`[GridConfigurationBus] Initializing as provider for view ${viewId}`);
      
      // Check if channel already exists
      if (this.channel) {
        console.log('[GridConfigurationBus] Channel already exists, reusing it');
        return;
      }
      
      // Try to connect first to see if another provider exists
      try {
        const testChannel = await fin.InterApplicationBus.Channel.connect(this.channelName);
        await testChannel.disconnect();
        console.log('[GridConfigurationBus] Channel already exists with another provider, skipping creation');
        // Another provider exists, we'll act as a client instead
        this.isProvider = false;
        return;
      } catch (e) {
        // Channel doesn't exist, we can create it
        console.log('[GridConfigurationBus] No existing channel found, creating new one');
      }
      
      this.channel = await fin.InterApplicationBus.Channel.create(this.channelName);
      this.isProvider = true;
      
      this.channel.onConnection((identity) => {
        console.log(`[GridConfigurationBus] Client connected:`, identity);
      });

      this.channel.onDisconnection((identity) => {
        console.log(`[GridConfigurationBus] Client disconnected:`, identity);
      });

      // Register request handler
      this.channel.register('grid-config-request', async (request: GridConfigRequest & { requestId: string }) => {
        console.log(`[GridConfigurationBus] Received request:`, request);
        
        try {
          const response = await this.handleRequest(request, viewId);
          return response;
        } catch (error) {
          return {
            requestId: request.requestId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      console.log(`[GridConfigurationBus] Provider initialized for view ${viewId}`);
    } catch (error) {
      console.error('[GridConfigurationBus] Failed to initialize as provider:', error);
      // Don't throw, just log the error
      this.isProvider = false;
    }
  }

  // Initialize as client (dialog window)
  async initializeAsClient(): Promise<void> {
    try {
      console.log('[GridConfigurationBus] Initializing as client');
      
      this.channel = await fin.InterApplicationBus.Channel.connect(this.channelName);
      
      console.log('[GridConfigurationBus] Client connected to channel');
    } catch (error) {
      console.error('[GridConfigurationBus] Failed to initialize as client:', error);
      throw error;
    }
  }

  // Handle incoming requests (provider side)
  private async handleRequest(request: GridConfigRequest & { requestId: string }, viewId: string): Promise<GridConfigResponse> {
    const config = this.viewConfigurations.get(viewId);
    
    switch (request.type) {
      case 'GET_GRID_CONFIG':
        return {
          requestId: request.requestId,
          success: true,
          data: config
        };

      case 'UPDATE_GRID_CONFIG':
        if (config) {
          Object.assign(config, request.config);
          this.viewConfigurations.set(viewId, config);
        }
        return {
          requestId: request.requestId,
          success: true
        };

      case 'GET_COLUMN_DEFS':
        return {
          requestId: request.requestId,
          success: true,
          data: config?.columnDefs || []
        };

      case 'UPDATE_COLUMN_DEFS':
        if (config) {
          config.columnDefs = request.columnDefs;
          this.viewConfigurations.set(viewId, config);
        }
        return {
          requestId: request.requestId,
          success: true
        };

      case 'GET_PROFILE':
        return {
          requestId: request.requestId,
          success: true,
          data: config?.profile
        };

      case 'UPDATE_PROFILE':
        if (config) {
          config.profile = request.profile;
          this.viewConfigurations.set(viewId, config);
        }
        return {
          requestId: request.requestId,
          success: true
        };

      case 'APPLY_CONDITIONAL_FORMATTING':
        if (config) {
          config.conditionalFormatting = request.rules;
          this.viewConfigurations.set(viewId, config);
          // Note: The actual application of rules to AG-Grid would happen in the grid window
        }
        return {
          requestId: request.requestId,
          success: true
        };

      case 'GET_AVAILABLE_COLUMNS':
        // Extract column info from column defs
        const columns: ColumnInfo[] = config?.columnDefs?.map(col => ({
          field: col.field,
          headerName: col.headerName || col.field,
          type: col.type
        })) || [];
        return {
          requestId: request.requestId,
          success: true,
          data: columns
        };

      case 'GET_AVAILABLE_VARIABLES':
        // Return any available variables (could be extended based on requirements)
        return {
          requestId: request.requestId,
          success: true,
          data: []
        };

      default:
        return {
          requestId: request.requestId,
          success: false,
          error: `Unknown request type: ${(request as any).type}`
        };
    }
  }

  // Send request (client side)
  async sendRequest<T = any>(request: GridConfigRequest): Promise<T> {
    if (!this.channel) {
      throw new Error('GridConfigurationBus not initialized');
    }

    const requestId = uuidv4();
    const requestWithId = { ...request, requestId };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      this.channel!.dispatch('grid-config-request', requestWithId)
        .then((response: GridConfigResponse<T>) => {
          this.pendingRequests.delete(requestId);
          if (response.success) {
            resolve(response.data as T);
          } else {
            reject(new Error(response.error || 'Request failed'));
          }
        })
        .catch((error) => {
          this.pendingRequests.delete(requestId);
          reject(error);
        });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  // Register grid configuration (provider side)
  registerGridConfiguration(viewId: string, config: GridConfiguration): void {
    this.viewConfigurations.set(viewId, config);
    console.log(`[GridConfigurationBus] Registered configuration for view ${viewId}`);
  }

  // Update grid configuration (provider side)
  updateGridConfiguration(viewId: string, updates: Partial<GridConfiguration>): void {
    const config = this.viewConfigurations.get(viewId);
    if (config) {
      Object.assign(config, updates);
      this.viewConfigurations.set(viewId, config);
      console.log(`[GridConfigurationBus] Updated configuration for view ${viewId}`);
    }
  }

  // Get grid configuration (provider side)
  getConfiguration(viewId: string): GridConfiguration | undefined {
    return this.viewConfigurations.get(viewId);
  }

  // Cleanup
  async destroy(): Promise<void> {
    if (this.channel) {
      try {
        // Only destroy if we're the provider
        if (this.isProvider && 'destroy' in this.channel && typeof this.channel.destroy === 'function') {
          console.log('[GridConfigurationBus] Destroying provider channel');
          await this.channel.destroy();
        } else if (!this.isProvider && 'disconnect' in this.channel && typeof this.channel.disconnect === 'function') {
          console.log('[GridConfigurationBus] Disconnecting client channel');
          await this.channel.disconnect();
        }
      } catch (error) {
        console.warn('[GridConfigurationBus] Error during cleanup:', error);
      }
      this.channel = null;
      this.isProvider = false;
    }
    this.pendingRequests.clear();
    this.viewConfigurations.clear();
  }
}