/**
 * OpenFinServiceProvider Component
 * 
 * A lightweight wrapper that provides standardized access to all centralized services,
 * OpenFin platform events, and common functionality for components
 */

import React, { useEffect, useState, useRef, useMemo, ReactNode } from 'react';
import { 
  OpenFinServiceContext,
  ServiceProviderContext,
  ServiceProviderConfig,
  ServiceMetadata,
  ServiceHealth,
  ServiceStatus,
  HealthCheckResult,
  ConfigurationClient,
  LoggingClient,
  AppVariablesClient,
  WindowOperations,
  EventBus,
  ThemeManager,
  ChannelManager,
  ThemeInfo
} from './ServiceContext';
import { LoggingService } from '../logging/LoggingService';
import { EventBusService } from '../events/EventBusService';
import { WindowOperationsService } from '../window/WindowOperationsService';
import { ConfigurationClient as ConfigurationClientImpl } from '../configuration/ConfigurationClient';
import { v4 as uuidv4 } from 'uuid';

// Placeholder implementation for App Variables (to be replaced with real client)
class AppVariablesClientImpl implements AppVariablesClient {
  async get(datasourceName: string, key: string) { return null; }
  async set(datasourceName: string, key: string, value: any) {}
  async getAll(datasourceName: string) { return {}; }
  async setAll(datasourceName: string, variables: any) {}
  async delete(datasourceName: string, key: string) {}
  subscribe(datasourceName: string, callback: any) { return () => {}; }
  async resolveTemplate(template: string, datasourceName: string) { return template; }
}

class ThemeManagerImpl implements ThemeManager {
  getCurrentTheme(): ThemeInfo {
    return {
      mode: 'light',
      primary: '#1976d2',
      secondary: '#dc004e',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000'
    };
  }
  async setTheme(theme: 'light' | 'dark' | 'system') {}
  async toggleTheme() {}
  subscribe(callback: any) { return () => {}; }
  getAvailableThemes() { return []; }
}

class ChannelManagerImpl implements ChannelManager {
  async create(channelName: string) { return null; }
  async connect(channelName: string) { return null; }
  async dispatch(channelName: string, topic: string, payload: any) { return null; }
  async publish(channelName: string, topic: string, payload: any) {}
  subscribe(channelName: string, topic: string, handler: any) { return () => {}; }
  async destroy(channelName: string) {}
}

interface OpenFinServiceProviderProps extends ServiceProviderConfig {
  children: ReactNode;
}

export const OpenFinServiceProvider: React.FC<OpenFinServiceProviderProps> = ({
  children,
  viewId,
  services = ['configuration', 'logging', 'events', 'window'],
  logLevel = 'info',
  logToConsole = true,
  logToIndexedDB = true,
  subscribeToWorkspaceEvents = true,
  subscribeToThemeEvents = true,
  subscribeToProfileEvents = true,
  subscribeToProviderEvents = true,
  enableCaching = true,
  cacheTimeout = 60000,
  onError,
  retryAttempts = 3,
  retryDelay = 1000,
  customServices = {}
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const sessionId = useRef(uuidv4());
  
  // Service instances
  const servicesRef = useRef<{
    logger?: LoggingClient;
    events?: EventBus;
    window?: WindowOperations;
    configuration?: ConfigurationClient;
    appVariables?: AppVariablesClient;
    theme?: ThemeManager;
    channels?: ChannelManager;
  }>({});

  // Service health tracking
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceStatus>>({});

  /**
   * Initialize services
   */
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('[OpenFinServiceProvider] Initializing services...', { viewId, services });

        // Initialize logging service
        if (services.includes('logging')) {
          const logger = await LoggingService.getInstance({
            viewId,
            sessionId: sessionId.current,
            logToConsole,
            logLevel
          });
          servicesRef.current.logger = logger;
          updateServiceStatus('logging', 'connected');
          logger.info('OpenFinServiceProvider initialized', { viewId, services });
        }

        // Initialize event bus
        if (services.includes('events')) {
          const events = await EventBusService.getInstance();
          servicesRef.current.events = events;
          updateServiceStatus('events', 'connected');
        }

        // Initialize window operations
        if (services.includes('window')) {
          const windowOps = new WindowOperationsService(viewId);
          servicesRef.current.window = windowOps;
          updateServiceStatus('window', 'connected');
        }

        // Initialize configuration client - Connect to centralized service (non-blocking)
        if (services.includes('configuration')) {
          const configClient = new ConfigurationClientImpl();
          servicesRef.current.configuration = configClient;
          
          // Connect in background without blocking initialization
          configClient.connect().then(() => {
            updateServiceStatus('configuration', 'connected');
            logger.info('Configuration service connected');
          }).catch((error) => {
            logger.warn('Configuration service connection failed (will retry in background):', error);
            updateServiceStatus('configuration', 'error');
          });
          
          // Mark as initializing for now
          updateServiceStatus('configuration', 'connecting');
        }

        // Initialize app variables client (placeholder)
        if (services.includes('appVariables')) {
          servicesRef.current.appVariables = new AppVariablesClientImpl();
          updateServiceStatus('appVariables', 'connected');
        }

        // Initialize theme manager (placeholder)
        if (services.includes('theme')) {
          servicesRef.current.theme = new ThemeManagerImpl();
          updateServiceStatus('theme', 'connected');
        }

        // Initialize channel manager (placeholder)
        if (services.includes('channels')) {
          servicesRef.current.channels = new ChannelManagerImpl();
          updateServiceStatus('channels', 'connected');
        }

        // Add custom services
        Object.assign(servicesRef.current, customServices);

        setIsInitialized(true);
        console.log('[OpenFinServiceProvider] All services initialized successfully');
      } catch (err) {
        const error = err as Error;
        console.error('[OpenFinServiceProvider] Failed to initialize services:', error);
        setError(error);
        
        if (onError) {
          onError(error);
        }
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      console.log('[OpenFinServiceProvider] Cleaning up services...');
      
      // Clean up logging service
      if (servicesRef.current.logger && 'destroy' in servicesRef.current.logger) {
        (servicesRef.current.logger as any).destroy();
      }

      // Clean up event bus
      if (servicesRef.current.events && 'destroy' in servicesRef.current.events) {
        (servicesRef.current.events as any).destroy();
      }

      // Clean up window operations
      if (servicesRef.current.window && 'destroy' in servicesRef.current.window) {
        (servicesRef.current.window as any).destroy();
      }

      // Clean up configuration client
      if (servicesRef.current.configuration && 'disconnect' in servicesRef.current.configuration) {
        (servicesRef.current.configuration as any).disconnect();
      }
    };
  }, []); // Run once on mount

  /**
   * Update service status
   */
  const updateServiceStatus = (
    name: string,
    status: 'connected' | 'disconnected' | 'error' | 'initializing',
    error?: Error
  ) => {
    setServiceStatuses(prev => ({
      ...prev,
      [name]: {
        name,
        status,
        lastActivity: new Date(),
        error
      }
    }));
  };

  /**
   * Create service metadata
   */
  const metadata = useMemo<ServiceMetadata>(() => ({
    viewId,
    windowId: servicesRef.current.window?.getWindowId() || '',
    instanceId: viewId,
    sessionId: sessionId.current,
    environment: (import.meta.env.MODE || 'development') as any,
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    startTime: new Date()
  }), [viewId]);

  /**
   * Create service health object
   */
  const health = useMemo<ServiceHealth>(() => ({
    isConnected: isInitialized && !error,
    services: serviceStatuses,
    lastError: error || undefined,
    checkHealth: async (): Promise<HealthCheckResult> => {
      const healthy = Object.values(serviceStatuses).every(s => s.status === 'connected');
      return {
        healthy,
        services: Object.values(serviceStatuses),
        timestamp: new Date()
      };
    }
  }), [isInitialized, error, serviceStatuses]);

  /**
   * Create context value
   */
  const contextValue = useMemo<ServiceProviderContext | null>(() => {
    if (!isInitialized) return null;

    return {
      configuration: servicesRef.current.configuration || (() => {
        console.warn('[OpenFinServiceProvider] Configuration service not initialized');
        // Return a dummy implementation that logs warnings
        return {
          get: async () => null,
          create: async (record: any) => record,
          update: async (id: string, updates: any) => ({ ...updates, id }),
          delete: async () => true,
          query: async () => [],
          subscribe: () => () => {}
        } as ConfigurationClient;
      })(),
      logger: servicesRef.current.logger || {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        query: async () => [],
        export: async () => '',
        clear: async () => 0
      },
      appVariables: servicesRef.current.appVariables || new AppVariablesClientImpl(),
      window: servicesRef.current.window || ({
        renameTab: async () => {},
        getTabName: () => viewId,
        getViewId: () => viewId,
        getWindowId: () => '',
        getInstanceId: () => viewId,
        minimize: async () => {},
        maximize: async () => {},
        restore: async () => {},
        close: async () => {},
        focus: async () => {},
        sendToWindow: async () => {},
        broadcast: async () => {},
        onMessage: () => () => {}
      } as WindowOperations),
      events: servicesRef.current.events || new EventBusService(),
      theme: servicesRef.current.theme || new ThemeManagerImpl(),
      channels: servicesRef.current.channels || new ChannelManagerImpl(),
      metadata,
      health
    };
  }, [isInitialized, metadata, health, viewId]);

  // Show loading state
  if (!isInitialized && !error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div>Initializing OpenFin Services...</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {Object.entries(serviceStatuses).map(([name, status]) => (
            <div key={name}>{name}: {status.status}</div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        color: '#d32f2f'
      }}>
        <div>Failed to initialize OpenFin Services</div>
        <div style={{ fontSize: '12px' }}>{error.message}</div>
      </div>
    );
  }

  return (
    <OpenFinServiceContext.Provider value={contextValue}>
      {children}
    </OpenFinServiceContext.Provider>
  );
};