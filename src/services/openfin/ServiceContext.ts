/**
 * OpenFin Service Provider Context
 * 
 * Defines the structure and types for all services available
 * through the OpenFinServiceProvider wrapper component
 */

import { EventEmitter } from 'events';

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Configuration Service Client Interface
 */
export interface ConfigurationClient {
  get(id: string): Promise<ConfigurationRecord | null>;
  create(record: Omit<ConfigurationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConfigurationRecord>;
  update(id: string, updates: Partial<ConfigurationRecord>): Promise<ConfigurationRecord>;
  delete(id: string): Promise<boolean>;
  query(filter: ConfigurationFilter): Promise<ConfigurationRecord[]>;
  subscribe(filter: ConfigurationFilter, callback: (event: ConfigurationEvent) => void): () => void;
}

/**
 * Logging Service Client Interface
 */
export interface LoggingClient {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  query(filter: LogFilter): Promise<LogEntry[]>;
  export(format: 'json' | 'csv', filter?: LogFilter): Promise<string>;
  clear(filter?: LogFilter): Promise<number>;
}

/**
 * App Variables Client Interface
 */
export interface AppVariablesClient {
  get(datasourceName: string, key: string): Promise<any>;
  set(datasourceName: string, key: string, value: any): Promise<void>;
  getAll(datasourceName: string): Promise<Record<string, any>>;
  setAll(datasourceName: string, variables: Record<string, any>): Promise<void>;
  delete(datasourceName: string, key: string): Promise<void>;
  subscribe(datasourceName: string, callback: (variables: Record<string, any>) => void): () => void;
  resolveTemplate(template: string, datasourceName: string): Promise<string>;
}

/**
 * Window Operations Interface
 */
export interface WindowOperations {
  // Tab operations
  renameTab(name: string): Promise<void>;
  getTabName(): string;
  
  // Window metadata
  getViewId(): string;
  getWindowId(): string;
  getInstanceId(): string;
  
  // Window state
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  restore(): Promise<void>;
  close(): Promise<void>;
  focus(): Promise<void>;
  
  // Inter-window communication
  sendToWindow(targetId: string, message: any): Promise<void>;
  broadcast(message: any): Promise<void>;
  onMessage(callback: (message: any) => void): () => void;
}

/**
 * Event Bus Interface
 */
export interface EventBus extends EventEmitter {
  // Workspace events
  on(event: 'workspace:saving', listener: () => void): this;
  on(event: 'workspace:saved', listener: (snapshot: any) => void): this;
  on(event: 'workspace:loading', listener: () => void): this;
  on(event: 'workspace:loaded', listener: (snapshot: any) => void): this;
  
  // Theme events
  on(event: 'theme:changed', listener: (theme: ThemeInfo) => void): this;
  on(event: 'theme:toggled', listener: (isDark: boolean) => void): this;
  
  // Profile events
  on(event: 'profile:changed', listener: (profile: any) => void): this;
  on(event: 'profile:saved', listener: (profile: any) => void): this;
  on(event: 'profile:deleted', listener: (profileId: string) => void): this;
  
  // Provider events
  on(event: 'provider:connected', listener: (providerId: string) => void): this;
  on(event: 'provider:disconnected', listener: (providerId: string) => void): this;
  on(event: 'provider:error', listener: (error: ProviderError) => void): this;
  
  // Tab events
  on(event: 'tab:renamed', listener: (data: { oldName: string; newName: string }) => void): this;
  on(event: 'tab:selected', listener: (tabId: string) => void): this;
  on(event: 'tab:closed', listener: (tabId: string) => void): this;
  
  // Generic event handler
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

/**
 * Theme Manager Interface
 */
export interface ThemeManager {
  getCurrentTheme(): ThemeInfo;
  setTheme(theme: 'light' | 'dark' | 'system'): Promise<void>;
  toggleTheme(): Promise<void>;
  subscribe(callback: (theme: ThemeInfo) => void): () => void;
  getAvailableThemes(): ThemeOption[];
}

/**
 * Channel Manager Interface
 */
export interface ChannelManager {
  create(channelName: string): Promise<any>;
  connect(channelName: string): Promise<any>;
  dispatch(channelName: string, topic: string, payload: any): Promise<any>;
  publish(channelName: string, topic: string, payload: any): Promise<void>;
  subscribe(channelName: string, topic: string, handler: (payload: any) => void): () => void;
  destroy(channelName: string): Promise<void>;
}

// ============================================================================
// Data Types
// ============================================================================

export interface ConfigurationRecord {
  id: string;
  componentType: string;
  componentSubType?: string;
  componentId: string;
  viewId?: string;
  userId?: string;
  appId: string;
  name: string;
  description?: string;
  config: Record<string, any>;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  version: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ConfigurationFilter {
  componentType?: string;
  componentSubType?: string;
  componentId?: string;
  viewId?: string;
  userId?: string;
  appId?: string;
  name?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
}

export interface ConfigurationEvent {
  type: 'created' | 'updated' | 'deleted';
  record: ConfigurationRecord;
  timestamp: Date;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  viewId: string;
  userId?: string;
  sessionId: string;
  source?: string;
  stack?: string;
}

export interface LogFilter {
  level?: 'debug' | 'info' | 'warn' | 'error';
  startTime?: Date;
  endTime?: Date;
  viewId?: string;
  userId?: string;
  sessionId?: string;
  source?: string;
  search?: string;
  limit?: number;
}

export interface ThemeInfo {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  custom?: Record<string, string>;
}

export interface ThemeOption {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  preview: string;
}

export interface ProviderError {
  providerId: string;
  error: Error;
  timestamp: Date;
  recoverable: boolean;
}

// ============================================================================
// Service Provider Context
// ============================================================================

export interface ServiceProviderContext {
  // Core services
  configuration: ConfigurationClient;
  logger: LoggingClient;
  appVariables: AppVariablesClient;
  
  // OpenFin specific
  window: WindowOperations;
  events: EventBus;
  theme: ThemeManager;
  channels: ChannelManager;
  
  // Metadata
  metadata: ServiceMetadata;
  
  // Service health
  health: ServiceHealth;
}

export interface ServiceMetadata {
  viewId: string;
  windowId: string;
  instanceId: string;
  userId?: string;
  sessionId: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  startTime: Date;
}

export interface ServiceHealth {
  isConnected: boolean;
  services: Record<string, ServiceStatus>;
  lastError?: Error;
  checkHealth(): Promise<HealthCheckResult>;
}

export interface ServiceStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'initializing';
  lastActivity?: Date;
  error?: Error;
}

export interface HealthCheckResult {
  healthy: boolean;
  services: ServiceStatus[];
  timestamp: Date;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ServiceProviderConfig {
  // Required
  viewId: string;
  
  // Service selection
  services?: ServiceType[];
  
  // Logging configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logToConsole?: boolean;
  logToIndexedDB?: boolean;
  
  // Event subscriptions
  subscribeToWorkspaceEvents?: boolean;
  subscribeToThemeEvents?: boolean;
  subscribeToProfileEvents?: boolean;
  subscribeToProviderEvents?: boolean;
  
  // Performance
  enableCaching?: boolean;
  cacheTimeout?: number;
  
  // Error handling
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
  
  // Custom services
  customServices?: Record<string, any>;
}

export type ServiceType = 
  | 'configuration'
  | 'logging'
  | 'appVariables'
  | 'window'
  | 'events'
  | 'theme'
  | 'channels';

// ============================================================================
// React Context
// ============================================================================

import { createContext } from 'react';

export const OpenFinServiceContext = createContext<ServiceProviderContext | null>(null);