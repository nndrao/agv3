import { WindowManager } from '../window/windowManager';
import { StorageClient } from '../storage/storageClient';

interface ProviderInfo {
  providerId: string;
  configId: string;
  config: any;
  type: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime: Date;
  window?: any;
  error?: string;
}

export class ProviderManager {
  private static providers = new Map<string, ProviderInfo>();
  
  static async startProvider(options: {
    providerId: string;
    configId: string;
    config: any;
    type: 'stomp' | 'rest' | 'variables';
  }): Promise<void> {
    console.log('🚀 Starting provider:', options.providerId);
    console.log('Provider config:', options.config);
    
    // Check if already running
    if (this.providers.has(options.providerId)) {
      console.warn('Provider already running:', options.providerId);
      return;
    }
    
    // Create provider info
    const providerInfo: ProviderInfo = {
      providerId: options.providerId,
      configId: options.configId,
      config: options.config,
      type: options.type,
      status: 'starting',
      startTime: new Date()
    };
    
    // Track provider
    this.providers.set(options.providerId, providerInfo);
    
    try {
      // Check if window already exists
      const existingWindow = await WindowManager.getWindow(`provider-${options.providerId}`);
      if (existingWindow) {
        console.log('Provider window already exists, checking if it\'s responsive...');
        
        // Check if the window is actually running by trying to get its state
        try {
          const state = await existingWindow.getState();
          console.log('Window state:', state);
          
          // If window exists but channel is not ready, it might need to be reloaded
          const channelReady = await this.isChannelReady(options.providerId);
          if (!channelReady) {
            console.log('Window exists but channel not ready, reloading window...');
            await existingWindow.reload();
            // Give it time to reload and initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          providerInfo.window = existingWindow;
          providerInfo.status = 'running';
          
          // Wait for the channel to be ready
          console.log('Waiting for existing provider to be ready...');
          await ProviderManager.waitForProviderChannel(options.providerId);
        } catch (error) {
          console.error('Existing window not responsive, creating new one:', error);
          // Window exists but is not responsive, close it and create a new one
          try {
            await existingWindow.close();
          } catch (e) {
            // Ignore close errors
          }
          // Remove from WindowManager's tracking
          await WindowManager.closeWindow(`provider-${options.providerId}`);
          
          // Create new window
          const window = await WindowManager.createHeadlessProvider(
            options.providerId,
            options.config
          );
          
          providerInfo.window = window;
          
          // Monitor provider window
          window.on('closed', () => {
            console.log('Provider window closed:', options.providerId);
            this.providers.delete(options.providerId);
          });
          
          // Wait for the provider to initialize its channel
          console.log('Waiting for new provider to initialize...');
          await ProviderManager.waitForProviderChannel(options.providerId);
          
          providerInfo.status = 'running';
        }
      } else {
        // Create headless window for provider
        const window = await WindowManager.createHeadlessProvider(
          options.providerId,
          options.config
        );
        
        providerInfo.window = window;
        
        // Monitor provider window
        window.on('closed', () => {
          console.log('Provider window closed:', options.providerId);
          this.providers.delete(options.providerId);
        });
        
        // Wait for the provider to initialize its channel
        console.log('Waiting for new provider to initialize...');
        await ProviderManager.waitForProviderChannel(options.providerId);
        
        providerInfo.status = 'running';
      }
      
      // Update status in storage
      await this.updateProviderStatus(options.configId, 'running');
      
    } catch (error) {
      console.error('Failed to start provider:', error);
      providerInfo.status = 'error';
      providerInfo.error = error instanceof Error ? error.message : String(error);
      
      // Update status in storage
      await this.updateProviderStatus(options.configId, 'error', error instanceof Error ? error.message : String(error));
      
      throw error;
    }
  }
  
  static async stopProvider(providerId: string): Promise<void> {
    console.log('⏹️ Stopping provider:', providerId);
    
    const provider = this.providers.get(providerId);
    if (!provider) {
      console.warn('Provider not found:', providerId);
      return;
    }
    
    provider.status = 'stopping';
    
    try {
      // Close the window
      if (provider.window) {
        await provider.window.close();
      }
      
      // Update status in storage
      await this.updateProviderStatus(provider.configId, 'stopped');
      
    } catch (error) {
      console.error('Failed to stop provider:', error);
      provider.status = 'error';
      provider.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      // Remove from tracking
      this.providers.delete(providerId);
    }
  }
  
  static async restartProvider(providerId: string): Promise<void> {
    console.log('🔄 Restarting provider:', providerId);
    
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }
    
    const { configId, config, type } = provider;
    
    // Stop the provider
    await this.stopProvider(providerId);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start it again
    await this.startProvider({
      providerId,
      configId,
      config,
      type: type as 'stomp' | 'rest'
    });
  }
  
  static getProvider(providerId: string): ProviderInfo | undefined {
    return this.providers.get(providerId);
  }
  
  static getActiveProviders(): ProviderInfo[] {
    return Array.from(this.providers.values());
  }
  
  static getProvidersByType(type: string): ProviderInfo[] {
    return Array.from(this.providers.values())
      .filter(p => p.type === type);
  }
  
  static getProvidersByStatus(status: ProviderInfo['status']): ProviderInfo[] {
    return Array.from(this.providers.values())
      .filter(p => p.status === status);
  }
  
  static async getProviderStatistics(providerId: string): Promise<any> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.window) {
      return null;
    }
    
    try {
      // TODO: Implement channel communication to get statistics
      return {
        providerId,
        status: provider.status,
        uptime: Date.now() - provider.startTime.getTime(),
        error: provider.error
      };
    } catch (error) {
      console.error('Failed to get provider statistics:', error);
      return null;
    }
  }
  
  private static async updateProviderStatus(
    configId: string, 
    status: string, 
    error?: string
  ): Promise<void> {
    try {
      const existingConfig = await StorageClient.get(configId);
      if (existingConfig) {
        await StorageClient.update(configId, {
          config: {
            ...existingConfig.config,
            providerStatus: status,
            lastError: error,
            lastStatusUpdate: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      console.error('Failed to update provider status in storage:', err);
    }
  }
  
  private static async isChannelReady(providerId: string): Promise<boolean> {
    const channelName = `data-provider-${providerId}`;
    try {
      const testClient = await fin.InterApplicationBus.Channel.connect(channelName);
      await testClient.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  private static async waitForProviderChannel(providerId: string, maxAttempts: number = 30): Promise<void> {
    const channelName = `data-provider-${providerId}`;
    console.log(`Waiting for channel ${channelName} to be ready...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to connect to the channel
        const testClient = await fin.InterApplicationBus.Channel.connect(channelName);
        console.log(`✅ Channel ${channelName} is ready`);
        await testClient.disconnect();
        return;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error(`Channel ${channelName} not ready after ${maxAttempts} attempts`);
        }
        console.log(`Channel not ready yet, attempt ${i + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // Cleanup on shutdown
  static async shutdown(): Promise<void> {
    console.log('Shutting down all providers...');
    
    const providers = Array.from(this.providers.keys());
    
    for (const providerId of providers) {
      try {
        await this.stopProvider(providerId);
      } catch (error) {
        console.error(`Failed to stop provider ${providerId}:`, error);
      }
    }
    
    this.providers.clear();
  }
}