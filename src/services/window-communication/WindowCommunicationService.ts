/**
 * Window Communication Service
 * 
 * A unified communication protocol for OpenFin windows that provides:
 * 1. Direct callback-based communication (for same-origin React portals)
 * 2. IAB-based communication (for cross-origin or standalone windows)
 * 3. Automatic fallback between communication methods
 */

import { v4 as uuidv4 } from 'uuid';

export interface WindowCommunicationConfig {
  windowType: 'portal' | 'standalone' | 'auto';
  channelName?: string;
  viewId: string;
  timeout?: number;
}

export interface CommunicationMessage<T = any> {
  id: string;
  type: string;
  viewId: string;
  payload?: T;
  timestamp: number;
}

export interface CommunicationResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
}

type MessageHandler<T = any, R = any> = (message: CommunicationMessage<T>) => Promise<R> | R;
type DirectCallback = (...args: any[]) => any;

export class WindowCommunicationService {
  private static instances = new Map<string, WindowCommunicationService>();
  
  private config: WindowCommunicationConfig;
  private messageHandlers = new Map<string, MessageHandler>();
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private directCallbacks = new Map<string, DirectCallback>();
  private iabChannel: any | null = null;
  private isProvider = false;
  private communicationMode: 'direct' | 'iab' | 'none' = 'none';
  
  private constructor(config: WindowCommunicationConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
  }
  
  /**
   * Get or create a service instance for a specific view
   */
  static getInstance(config: WindowCommunicationConfig): WindowCommunicationService {
    const key = `${config.viewId}-${config.windowType}`;
    
    if (!WindowCommunicationService.instances.has(key)) {
      WindowCommunicationService.instances.set(key, new WindowCommunicationService(config));
    }
    
    return WindowCommunicationService.instances.get(key)!;
  }
  
  /**
   * Initialize the communication service
   */
  async initialize(options?: {
    directCallbacks?: Record<string, DirectCallback>;
    isProvider?: boolean;
  }): Promise<void> {
    const { directCallbacks, isProvider = false } = options || {};
    
    // Store direct callbacks if provided (for portal mode)
    if (directCallbacks) {
      Object.entries(directCallbacks).forEach(([key, callback]) => {
        this.directCallbacks.set(key, callback);
      });
      this.communicationMode = 'direct';
      console.log(`[WindowCommunication] Initialized in DIRECT mode for view ${this.config.viewId}`);
      return;
    }
    
    // Try to initialize IAB if available
    if (this.config.windowType === 'standalone' || this.config.windowType === 'auto') {
      try {
        await this.initializeIAB(isProvider);
        this.communicationMode = 'iab';
        console.log(`[WindowCommunication] Initialized in IAB mode for view ${this.config.viewId}`);
      } catch (error) {
        console.warn(`[WindowCommunication] IAB initialization failed for view ${this.config.viewId}:`, error);
        
        if (this.config.windowType === 'standalone') {
          throw new Error('Failed to initialize IAB communication in standalone mode');
        }
        
        // For auto mode, continue without communication
        this.communicationMode = 'none';
      }
    }
  }
  
  /**
   * Initialize Inter-Application Bus communication
   */
  private async initializeIAB(isProvider: boolean): Promise<void> {
    if (typeof fin === 'undefined' || !fin.InterApplicationBus) {
      throw new Error('OpenFin IAB not available');
    }
    
    const channelName = this.config.channelName || `window-comm-${this.config.viewId}`;
    
    if (isProvider) {
      // Try to create channel as provider
      try {
        this.iabChannel = await fin.InterApplicationBus.Channel.create(channelName);
        this.isProvider = true;
        
        // Set up message handler
        this.iabChannel.register('message', async (message: CommunicationMessage) => {
          return this.handleIncomingMessage(message);
        });
        
        console.log(`[WindowCommunication] IAB provider created on channel ${channelName}`);
      } catch (error) {
        console.error(`[WindowCommunication] Failed to create IAB provider:`, error);
        throw error;
      }
    } else {
      // Connect as client with retry logic
      const maxRetries = 10;
      const retryDelay = 500;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          this.iabChannel = await fin.InterApplicationBus.Channel.connect(channelName);
          console.log(`[WindowCommunication] IAB client connected to channel ${channelName}`);
          return;
        } catch (error) {
          if (attempt === maxRetries) {
            throw new Error(`Failed to connect to IAB channel ${channelName} after ${maxRetries} attempts`);
          }
          
          console.log(`[WindowCommunication] IAB connection attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }
  
  /**
   * Register a message handler
   */
  onMessage<T = any, R = any>(type: string, handler: MessageHandler<T, R>): void {
    this.messageHandlers.set(type, handler);
  }
  
  /**
   * Send a message and wait for response
   */
  async sendMessage<T = any, R = any>(type: string, payload?: T): Promise<R> {
    const message: CommunicationMessage<T> = {
      id: uuidv4(),
      type,
      viewId: this.config.viewId,
      payload,
      timestamp: Date.now()
    };
    
    // Use direct callback if available
    if (this.communicationMode === 'direct') {
      const callback = this.directCallbacks.get(type);
      if (callback) {
        try {
          const result = await callback(payload);
          return result as R;
        } catch (error) {
          throw new Error(`Direct callback error: ${error}`);
        }
      }
      throw new Error(`No direct callback registered for message type: ${type}`);
    }
    
    // Use IAB if available
    if (this.communicationMode === 'iab' && this.iabChannel) {
      return new Promise<R>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(message.id);
          reject(new Error(`Message timeout for type: ${type}`));
        }, this.config.timeout!);
        
        this.pendingRequests.set(message.id, { resolve, reject, timeout });
        
        // Send via IAB
        if (this.isProvider) {
          // Provider broadcasts to all clients
          this.iabChannel.publish('message', message);
        } else {
          // Client dispatches to provider
          this.iabChannel.dispatch('message', message)
            .then((response: CommunicationResponse<R>) => {
              clearTimeout(timeout);
              this.pendingRequests.delete(message.id);
              
              if (response.success) {
                resolve(response.data!);
              } else {
                reject(new Error(response.error || 'Unknown error'));
              }
            })
            .catch((error: Error) => {
              clearTimeout(timeout);
              this.pendingRequests.delete(message.id);
              reject(error);
            });
        }
      });
    }
    
    throw new Error(`No communication method available for message type: ${type}`);
  }
  
  /**
   * Handle incoming messages
   */
  private async handleIncomingMessage(message: CommunicationMessage): Promise<CommunicationResponse> {
    const handler = this.messageHandlers.get(message.type);
    
    if (!handler) {
      return {
        id: message.id,
        success: false,
        error: `No handler registered for message type: ${message.type}`
      };
    }
    
    try {
      const result = await handler(message);
      return {
        id: message.id,
        success: true,
        data: result
      };
    } catch (error) {
      return {
        id: message.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    // Clear pending requests
    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
    
    // Clear handlers
    this.messageHandlers.clear();
    this.directCallbacks.clear();
    
    // Clean up IAB
    if (this.iabChannel) {
      try {
        if (this.isProvider && 'destroy' in this.iabChannel) {
          await this.iabChannel.destroy();
        } else if (!this.isProvider && 'disconnect' in this.iabChannel) {
          await this.iabChannel.disconnect();
        }
      } catch (error) {
        console.warn('[WindowCommunication] Error during cleanup:', error);
      }
      this.iabChannel = null;
    }
    
    // Remove from instances
    const key = `${this.config.viewId}-${this.config.windowType}`;
    WindowCommunicationService.instances.delete(key);
  }
  
  /**
   * Get current communication mode
   */
  getCommunicationMode(): 'direct' | 'iab' | 'none' {
    return this.communicationMode;
  }
  
  /**
   * Check if service is connected
   */
  isConnected(): boolean {
    return this.communicationMode !== 'none';
  }
}

// Export types for easier use
export type { MessageHandler, DirectCallback };