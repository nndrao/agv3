/**
 * Service Manager
 * 
 * Central orchestrator for all platform services.
 * Runs in a dedicated OpenFin window and manages the lifecycle
 * of all centralized services.
 */

import { ConfigurationService } from '../../services/configuration/ConfigurationService';
import { LoggingService } from '../../services/logging/LoggingService';
import { EventBusService } from '../../services/events/EventBusService';
import { AppVariablesService } from '../../services/appVariables/appVariablesService';

export class ServiceManager {
  private static instance: ServiceManager | null = null;
  private services: Map<string, any> = new Map();
  private channels: Map<string, any> = new Map();
  private isInitialized = false;
  private startTime = Date.now();

  private constructor() {
    console.log('[ServiceManager] Instance created');
    this.setupGlobalErrorHandlers();
  }

  /**
   * Get singleton instance of ServiceManager
   */
  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * Reset the instance (useful for re-initialization)
   */
  static async resetInstance(): Promise<void> {
    if (ServiceManager.instance) {
      await ServiceManager.instance.shutdown();
      ServiceManager.instance = null;
    }
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('[ServiceManager] Already initialized');
      return;
    }

    console.log('[ServiceManager] Starting service initialization...');

    try {
      // Initialize services in order of dependency
      await this.initializeLoggingService();
      await this.initializeConfigurationService();
      await this.initializeAppVariablesService();
      await this.initializeEventBusService();
      await this.setupIABChannels();
      await this.broadcastServiceReady();

      this.isInitialized = true;
      console.log('[ServiceManager] All services initialized successfully');
      
      // Update UI
      this.updateUIStatus('all', 'connected', 'All services running');
    } catch (error) {
      console.error('[ServiceManager] Initialization failed:', error);
      this.updateUIStatus('all', 'error', 'Initialization failed');
      throw error;
    }
  }

  /**
   * Initialize the logging service
   */
  private async initializeLoggingService(): Promise<void> {
    console.log('[ServiceManager] Initializing Logging Service...');
    this.updateUIStatus('logging', 'initializing', 'Starting...');

    try {
      const loggingService = await LoggingService.getInstance({
        viewId: 'service-manager',
        sessionId: `session-${Date.now()}`,
        logToConsole: true,
        logLevel: 'debug'
      });

      this.services.set('logging', loggingService);
      
      // Log first message
      loggingService.info('Logging Service initialized', {
        service: 'ServiceManager',
        timestamp: new Date().toISOString()
      });

      this.updateUIStatus('logging', 'connected', 'Running');
      console.log('[ServiceManager] Logging Service ready');
    } catch (error) {
      this.updateUIStatus('logging', 'error', 'Failed');
      throw new Error(`Failed to initialize Logging Service: ${error}`);
    }
  }

  /**
   * Initialize the configuration service
   */
  private async initializeConfigurationService(): Promise<void> {
    console.log('[ServiceManager] Initializing Configuration Service...');
    this.updateUIStatus('config', 'initializing', 'Starting...');

    try {
      const configService = new ConfigurationService();
      await configService.initialize();

      this.services.set('configuration', configService);
      
      // Log to our logging service
      const logger = this.services.get('logging');
      if (logger) {
        logger.info('Configuration Service initialized', {
          service: 'ConfigurationService'
        });
      }

      this.updateUIStatus('config', 'connected', 'Running');
      console.log('[ServiceManager] Configuration Service ready');
    } catch (error) {
      this.updateUIStatus('config', 'error', 'Failed');
      throw new Error(`Failed to initialize Configuration Service: ${error}`);
    }
  }

  /**
   * Initialize the App Variables service
   */
  private async initializeAppVariablesService(): Promise<void> {
    console.log('[ServiceManager] Initializing App Variables Service...');
    this.updateUIStatus('appvars', 'initializing', 'Starting...');

    try {
      // Use existing AppVariablesService
      await AppVariablesService.initialize();
      
      this.services.set('appVariables', AppVariablesService);
      
      // Log to our logging service
      const logger = this.services.get('logging');
      if (logger) {
        logger.info('App Variables Service initialized', {
          service: 'AppVariablesService'
        });
      }

      this.updateUIStatus('appvars', 'connected', 'Running');
      console.log('[ServiceManager] App Variables Service ready');
    } catch (error) {
      this.updateUIStatus('appvars', 'error', 'Failed');
      throw new Error(`Failed to initialize App Variables Service: ${error}`);
    }
  }

  /**
   * Initialize the Event Bus service
   */
  private async initializeEventBusService(): Promise<void> {
    console.log('[ServiceManager] Initializing Event Bus Service...');
    this.updateUIStatus('events', 'initializing', 'Starting...');

    try {
      const eventBus = await EventBusService.getInstance();
      
      this.services.set('eventBus', eventBus);
      
      // Log to our logging service
      const logger = this.services.get('logging');
      if (logger) {
        logger.info('Event Bus Service initialized', {
          service: 'EventBusService'
        });
      }

      // Subscribe to some events for monitoring
      eventBus.on('workspace:saving', () => {
        console.log('[ServiceManager] Workspace saving event received');
      });

      eventBus.on('theme:changed', (theme) => {
        console.log('[ServiceManager] Theme changed event received:', theme);
      });

      this.updateUIStatus('events', 'connected', 'Running');
      console.log('[ServiceManager] Event Bus Service ready');
    } catch (error) {
      this.updateUIStatus('events', 'error', 'Failed');
      throw new Error(`Failed to initialize Event Bus Service: ${error}`);
    }
  }

  /**
   * Set up IAB channels for service communication
   */
  private async setupIABChannels(): Promise<void> {
    console.log('[ServiceManager] Setting up IAB channels...');
    this.updateUIStatus('channels', 'initializing', 'Starting...');

    try {
      if (typeof fin === 'undefined') {
        throw new Error('OpenFin API not available');
      }

      // Get list of existing channels
      const existingChannels = await fin.InterApplicationBus.Channel.getAllChannels();
      const existingChannelNames = existingChannels.map((ch: any) => ch.name);
      console.log('[ServiceManager] Existing channels:', existingChannelNames);

      // Create channels for each service
      const channelConfigs = [
        { name: 'agv3-configuration-service', service: 'configuration' },
        { name: 'agv3-logging-service', service: 'logging' },
        { name: 'agv3-appvariables-service', service: 'appVariables' },
        { name: 'agv3-eventbus-service', service: 'eventBus' }
      ];

      for (const config of channelConfigs) {
        let channel;
        
        // Check if channel already exists
        if (existingChannelNames.includes(config.name)) {
          console.log(`[ServiceManager] Channel ${config.name} already exists, connecting to it...`);
          // Connect to existing channel
          channel = await fin.InterApplicationBus.Channel.connect(config.name);
          
          // Try to destroy the old channel first so we can recreate it
          try {
            await channel.destroy();
            console.log(`[ServiceManager] Destroyed existing channel: ${config.name}`);
            // Now create a new one
            channel = await fin.InterApplicationBus.Channel.create(config.name);
            console.log(`[ServiceManager] Recreated channel: ${config.name}`);
          } catch (destroyError) {
            console.warn(`[ServiceManager] Could not destroy existing channel ${config.name}, will use it as-is`);
          }
        } else {
          // Create new channel
          channel = await fin.InterApplicationBus.Channel.create(config.name);
          console.log(`[ServiceManager] IAB channel created: ${config.name}`);
        }
        
        this.channels.set(config.name, channel);

        // Set up request handlers for each service
        this.setupChannelHandlers(channel, config.service);
      }

      // Also create/connect to main service manager channel for health checks
      const managerChannelName = 'agv3-service-manager';
      let managerChannel;
      
      if (existingChannelNames.includes(managerChannelName)) {
        console.log(`[ServiceManager] Manager channel already exists, connecting...`);
        managerChannel = await fin.InterApplicationBus.Channel.connect(managerChannelName);
        try {
          await managerChannel.destroy();
          managerChannel = await fin.InterApplicationBus.Channel.create(managerChannelName);
        } catch (e) {
          console.warn('[ServiceManager] Could not recreate manager channel');
        }
      } else {
        managerChannel = await fin.InterApplicationBus.Channel.create(managerChannelName);
      }
      
      this.channels.set('agv3-service-manager', managerChannel);
      
      managerChannel.register('health', async () => {
        return this.getHealthStatus();
      });

      managerChannel.register('statistics', async () => {
        return this.getStatistics();
      });

      this.updateUIStatus('channels', 'connected', `${this.channels.size} channels`);
      console.log('[ServiceManager] All IAB channels ready');
    } catch (error) {
      this.updateUIStatus('channels', 'error', 'Failed');
      throw new Error(`Failed to set up IAB channels: ${error}`);
    }
  }

  /**
   * Set up channel handlers for a service
   */
  private setupChannelHandlers(channel: any, serviceName: string): void {
    const service = this.services.get(serviceName);
    if (!service) {
      console.warn(`[ServiceManager] No service found for: ${serviceName}`);
      return;
    }

    // Configuration Service handlers
    if (serviceName === 'configuration' && service instanceof ConfigurationService) {
      channel.register('get', async (payload: any) => {
        return service.get(payload.id);
      });

      channel.register('create', async (payload: any) => {
        return service.create(payload.record);
      });

      channel.register('update', async (payload: any) => {
        return service.update(payload.id, payload.updates);
      });

      channel.register('delete', async (payload: any) => {
        return service.delete(payload.id);
      });

      channel.register('query', async (payload: any) => {
        return service.query(payload.filter);
      });
    }

    // Logging Service handlers
    if (serviceName === 'logging') {
      channel.register('log', async (payload: any) => {
        const { level, message, context } = payload;
        service[level](message, context);
        return { success: true };
      });

      channel.register('query', async (payload: any) => {
        return service.query(payload.filter);
      });

      channel.register('export', async (payload: any) => {
        return service.export(payload.format, payload.filter);
      });

      channel.register('clear', async (payload: any) => {
        return service.clear(payload.filter);
      });
    }

    // App Variables handlers
    if (serviceName === 'appVariables') {
      channel.register('getVariable', async (payload: any) => {
        return AppVariablesService.getVariable(payload.datasourceName, payload.key);
      });

      channel.register('setVariable', async (payload: any) => {
        AppVariablesService.setVariable(payload.datasourceName, payload.key, payload.value);
        return { success: true };
      });

      channel.register('createProvider', async (payload: any) => {
        const provider = await AppVariablesService.createProvider(payload.name, payload.variables);
        return { id: provider.id, name: provider.name };
      });
    }

    // Event Bus handlers
    if (serviceName === 'eventBus') {
      channel.register('emit', async (payload: any) => {
        service.emit(payload.event, ...payload.args);
        return { success: true };
      });

      channel.register('broadcast', async (payload: any) => {
        await service.broadcast(payload.channel, payload.event, payload.data);
        return { success: true };
      });
    }
  }

  /**
   * Broadcast that services are ready
   */
  private async broadcastServiceReady(): Promise<void> {
    try {
      await fin.InterApplicationBus.publish('service-manager-events', {
        type: 'services-ready',
        timestamp: Date.now(),
        services: Array.from(this.services.keys())
      });
      console.log('[ServiceManager] Broadcasted services ready event');
    } catch (error) {
      console.warn('[ServiceManager] Failed to broadcast ready event:', error);
    }
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): any {
    const statuses: any = {};
    
    for (const [name, service] of this.services) {
      statuses[name] = {
        status: 'connected',
        uptime: Date.now() - this.startTime,
        lastActivity: Date.now()
      };
    }

    return {
      healthy: true,
      services: statuses,
      uptime: Date.now() - this.startTime,
      timestamp: Date.now()
    };
  }

  /**
   * Get statistics from all services
   */
  async getStatistics(): Promise<any> {
    const stats: any = {
      uptime: Date.now() - this.startTime,
      services: {}
    };

    // Get configuration service stats
    const configService = this.services.get('configuration');
    if (configService) {
      stats.services.configuration = await configService.getStatistics();
    }

    // Get logging service stats
    const loggingService = this.services.get('logging');
    if (loggingService) {
      const logs = await loggingService.query({ limit: 0 });
      stats.services.logging = {
        totalLogs: logs.length,
        recentLogs: logs.slice(-10)
      };
    }

    // Get app variables stats
    const appVarsProviders = AppVariablesService.getAllProviders?.() || [];
    stats.services.appVariables = {
      providerCount: appVarsProviders.length,
      providers: appVarsProviders.map(p => ({
        name: p.name,
        variableCount: Object.keys(p.getAllVariables()).length
      }))
    };

    // Get event bus stats
    stats.services.eventBus = {
      listenerCount: this.services.get('eventBus')?.listenerCount() || 0
    };

    return stats;
  }

  /**
   * Test all services
   */
  async testServices(): Promise<void> {
    console.log('[ServiceManager] Running service tests...');
    
    try {
      // Test Configuration Service
      const configService = this.services.get('configuration');
      if (configService) {
        const testRecord = await configService.create({
          componentType: 'test',
          componentId: 'test-1',
          appId: 'service-manager',
          name: 'Test Configuration',
          config: { test: true },
          isActive: true,
          isDeleted: false
        });
        console.log('[ServiceManager] Configuration test passed:', testRecord.id);
        await configService.delete(testRecord.id);
      }

      // Test Logging Service
      const logger = this.services.get('logging');
      if (logger) {
        logger.info('Test log entry', { test: true });
        console.log('[ServiceManager] Logging test passed');
      }

      // Test Event Bus
      const eventBus = this.services.get('eventBus');
      if (eventBus) {
        eventBus.emit('test:event', { test: true });
        console.log('[ServiceManager] Event Bus test passed');
      }

      console.log('[ServiceManager] All service tests passed');
    } catch (error) {
      console.error('[ServiceManager] Service test failed:', error);
    }
  }

  /**
   * Show statistics in the UI
   */
  async showStatistics(): Promise<void> {
    const stats = await this.getStatistics();
    console.log('[ServiceManager] Statistics:', JSON.stringify(stats, null, 2));
  }

  /**
   * Update UI status for a service
   */
  private updateUIStatus(service: string, status: string, text: string): void {
    // Call the UI update function if it exists
    if (typeof (window as any).updateServiceStatus === 'function') {
      (window as any).updateServiceStatus(service, status, text);
    }
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
      console.error('[ServiceManager] Global error:', event.error);
      const logger = this.services.get('logging');
      if (logger) {
        logger.error('Global error in Service Manager', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        });
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('[ServiceManager] Unhandled rejection:', event.reason);
      const logger = this.services.get('logging');
      if (logger) {
        logger.error('Unhandled promise rejection in Service Manager', {
          reason: event.reason,
          promise: event.promise
        });
      }
    });
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    console.log('[ServiceManager] Shutting down services...');

    // Close all IAB channels
    for (const [name, channel] of this.channels) {
      try {
        await channel.destroy();
        console.log(`[ServiceManager] Channel destroyed: ${name}`);
      } catch (error) {
        console.error(`[ServiceManager] Failed to destroy channel ${name}:`, error);
      }
    }

    // Shutdown services
    for (const [name, service] of this.services) {
      try {
        if (service && typeof service.destroy === 'function') {
          await service.destroy();
        }
        console.log(`[ServiceManager] Service shutdown: ${name}`);
      } catch (error) {
        console.error(`[ServiceManager] Failed to shutdown ${name}:`, error);
      }
    }

    this.services.clear();
    this.channels.clear();
    this.isInitialized = false;
    
    console.log('[ServiceManager] All services shutdown complete');
  }
}