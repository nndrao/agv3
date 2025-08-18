# OpenFin Infrastructure Improvements Plan

## Current State Analysis

Based on your codebase analysis, you currently have:
- Basic OpenFin platform setup with dock provider
- Manual IAB usage in some components
- Direct localStorage access
- Limited workspace event handling
- Ad-hoc component communication

## Proposed Infrastructure Improvements

### 1. **Base React Component with OpenFin Services**

Create a foundational component that all OpenFin-hosted React components inherit from:

```typescript
// src/components/openfin/OpenFinBaseComponent.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useOpenFinServices } from './hooks/useOpenFinServices';
import { OpenFinServiceProvider } from './providers/OpenFinServiceProvider';

export interface OpenFinBaseComponentProps {
  viewId?: string;
  componentName: string;
  children: React.ReactNode;
}

export const OpenFinBaseComponent: React.FC<OpenFinBaseComponentProps> = ({
  viewId,
  componentName,
  children
}) => {
  return (
    <OpenFinServiceProvider viewId={viewId} componentName={componentName}>
      <OpenFinAwareWrapper>
        {children}
      </OpenFinAwareWrapper>
    </OpenFinServiceProvider>
  );
};

const OpenFinAwareWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    workspaceEvents,
    configService,
    loggingService,
    communicationService,
    viewService,
    themeService
  } = useOpenFinServices();

  // Auto-register for workspace events
  useEffect(() => {
    workspaceEvents.subscribe();
    return () => workspaceEvents.unsubscribe();
  }, [workspaceEvents]);

  return <>{children}</>;
};
```

### 2. **Comprehensive OpenFin Services Hook**

```typescript
// src/components/openfin/hooks/useOpenFinServices.ts
import { useContext } from 'react';
import { OpenFinServiceContext } from '../providers/OpenFinServiceProvider';

export interface OpenFinServices {
  // Workspace Events
  workspaceEvents: WorkspaceEventService;
  
  // Configuration Management
  configService: ConfigurationService;
  
  // Centralized Logging
  loggingService: LoggingService;
  
  // Inter-component Communication
  communicationService: CommunicationService;
  
  // View Management
  viewService: ViewManagementService;
  
  // Theme Management
  themeService: ThemeService;
  
  // Global Settings
  settingsService: GlobalSettingsService;
}

export const useOpenFinServices = (): OpenFinServices => {
  const context = useContext(OpenFinServiceContext);
  if (!context) {
    throw new Error('useOpenFinServices must be used within OpenFinServiceProvider');
  }
  return context;
};
```

### 3. **Workspace Event Service**

```typescript
// src/services/openfin/WorkspaceEventService.ts
export class WorkspaceEventService {
  private eventHandlers = new Map<string, Set<Function>>();
  private isSubscribed = false;

  async subscribe() {
    if (this.isSubscribed) return;

    try {
      // Subscribe to workspace events
      await fin.me.interop.joinSessionContextGroup('workspace-events');
      
      // Listen for workspace save events
      fin.me.interop.addContextHandler((context) => {
        this.handleWorkspaceEvent(context);
      });

      // Listen for platform events
      const platform = fin.Platform.getCurrentSync();
      
      platform.on('workspace-changed', this.handleWorkspaceChanged.bind(this));
      platform.on('view-created', this.handleViewCreated.bind(this));
      platform.on('view-destroyed', this.handleViewDestroyed.bind(this));
      platform.on('page-created', this.handlePageCreated.bind(this));
      platform.on('page-destroyed', this.handlePageDestroyed.bind(this));
      platform.on('theme-changed', this.handleThemeChanged.bind(this));

      this.isSubscribed = true;
    } catch (error) {
      console.error('Failed to subscribe to workspace events:', error);
    }
  }

  on(eventType: WorkspaceEventType, handler: Function) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  off(eventType: WorkspaceEventType, handler: Function) {
    this.eventHandlers.get(eventType)?.delete(handler);
  }

  private handleWorkspaceEvent(context: any) {
    const { type, data } = context;
    this.emit(type, data);
  }

  private emit(eventType: string, data: any) {
    this.eventHandlers.get(eventType)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in workspace event handler for ${eventType}:`, error);
      }
    });
  }

  // Event handlers
  private handleWorkspaceChanged(event: any) {
    this.emit('workspace-changed', event);
  }

  private handleViewCreated(event: any) {
    this.emit('view-created', event);
  }

  private handleViewDestroyed(event: any) {
    this.emit('view-destroyed', event);
  }

  private handlePageCreated(event: any) {
    this.emit('page-created', event);
  }

  private handlePageDestroyed(event: any) {
    this.emit('page-destroyed', event);
  }

  private handleThemeChanged(event: any) {
    this.emit('theme-changed', event);
  }
}

export type WorkspaceEventType = 
  | 'workspace-changed'
  | 'workspace-saved'
  | 'view-created'
  | 'view-destroyed'
  | 'page-created'
  | 'page-destroyed'
  | 'theme-changed';
```

### 4. **Configuration Service (IAB-based)**

```typescript
// src/services/openfin/ConfigurationService.ts
export class ConfigurationService {
  private configChannel = 'app-configuration';
  private interop: fin.Interop;

  constructor() {
    this.initializeInterop();
  }

  private async initializeInterop() {
    this.interop = fin.Interop.connectSync(fin.me.uuid, {});
    await this.interop.joinSessionContextGroup(this.configChannel);
  }

  async getConfiguration<T>(key: string): Promise<T | null> {
    try {
      const context = await this.interop.getContext();
      return context?.configurations?.[key] || null;
    } catch (error) {
      console.error(`Failed to get configuration for key: ${key}`, error);
      return null;
    }
  }

  async setConfiguration<T>(key: string, value: T): Promise<void> {
    try {
      const currentContext = await this.interop.getContext();
      const updatedContext = {
        ...currentContext,
        configurations: {
          ...currentContext?.configurations,
          [key]: value
        }
      };
      await this.interop.setContext(updatedContext);
    } catch (error) {
      console.error(`Failed to set configuration for key: ${key}`, error);
      throw error;
    }
  }

  async getAllConfigurations(): Promise<Record<string, any>> {
    try {
      const context = await this.interop.getContext();
      return context?.configurations || {};
    } catch (error) {
      console.error('Failed to get all configurations', error);
      return {};
    }
  }

  onConfigurationChanged(callback: (key: string, value: any) => void) {
    this.interop.addContextHandler((context) => {
      // Detect configuration changes and notify
      const configurations = context?.configurations || {};
      Object.entries(configurations).forEach(([key, value]) => {
        callback(key, value);
      });
    });
  }
}
```

### 5. **Centralized Logging Service**

```typescript
// src/services/openfin/LoggingService.ts
export class LoggingService {
  private logChannel = 'centralized-logging';
  private interop: fin.Interop;
  private componentName: string;
  private viewId: string;

  constructor(componentName: string, viewId: string) {
    this.componentName = componentName;
    this.viewId = viewId;
    this.initializeInterop();
  }

  private async initializeInterop() {
    this.interop = fin.Interop.connectSync(fin.me.uuid, {});
    await this.interop.joinSessionContextGroup(this.logChannel);
  }

  async log(level: LogLevel, message: string, data?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.componentName,
      viewId: this.viewId,
      message,
      data,
      sessionId: fin.me.uuid
    };

    try {
      // Send to centralized logging via IAB
      await this.interop.fireIntent({
        name: 'log-entry',
        context: {
          type: 'log-entry',
          logEntry
        }
      });

      // Also log to console for development
      console[level](
        `[${this.componentName}:${this.viewId}] ${message}`,
        data || ''
      );
    } catch (error) {
      console.error('Failed to send log entry:', error);
    }
  }

  info(message: string, data?: any) {
    return this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    return this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    return this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    return this.log('debug', message, data);
  }
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  viewId: string;
  message: string;
  data?: any;
  sessionId: string;
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
```

### 6. **Inter-Component Communication Service**

```typescript
// src/services/openfin/CommunicationService.ts
export class CommunicationService {
  private interop: fin.Interop;
  private messageHandlers = new Map<string, Set<Function>>();

  constructor() {
    this.initializeInterop();
  }

  private async initializeInterop() {
    this.interop = fin.Interop.connectSync(fin.me.uuid, {});
    
    // Join communication channel
    await this.interop.joinSessionContextGroup('component-communication');
    
    // Listen for messages
    this.interop.addContextHandler(this.handleMessage.bind(this));
  }

  async sendMessage(targetComponent: string, messageType: string, data: any) {
    try {
      await this.interop.fireIntent({
        name: 'component-message',
        context: {
          type: 'component-message',
          target: targetComponent,
          messageType,
          data,
          sender: fin.me.uuid,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  async broadcastMessage(messageType: string, data: any) {
    try {
      await this.interop.setContext({
        type: 'broadcast-message',
        messageType,
        data,
        sender: fin.me.uuid,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }

  onMessage(messageType: string, handler: (data: any, sender: string) => void) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  private handleMessage(context: any) {
    if (context.type === 'component-message' || context.type === 'broadcast-message') {
      const { messageType, data, sender } = context;
      const handlers = this.messageHandlers.get(messageType);
      
      handlers?.forEach(handler => {
        try {
          handler(data, sender);
        } catch (error) {
          console.error(`Error in message handler for ${messageType}:`, error);
        }
      });
    }
  }
}
```

### 7. **View Management Service**

```typescript
// src/services/openfin/ViewManagementService.ts
export class ViewManagementService {
  private currentView: fin.View;

  constructor() {
    this.currentView = fin.View.getCurrentSync();
  }

  async renameView(newTitle: string): Promise<void> {
    try {
      // Update view options
      await this.currentView.updateOptions({
        title: newTitle
      });

      // Update document title
      document.title = newTitle;

      // Broadcast rename event
      await fin.me.interop.fireIntent({
        name: 'view-renamed',
        context: {
          type: 'view-renamed',
          viewId: this.currentView.identity.name,
          newTitle,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to rename view:', error);
      throw error;
    }
  }

  async getViewInfo(): Promise<fin.ViewInfo> {
    return await this.currentView.getInfo();
  }

  async closeView(): Promise<void> {
    try {
      await this.currentView.close();
    } catch (error) {
      console.error('Failed to close view:', error);
      throw error;
    }
  }

  async duplicateView(newTitle?: string): Promise<void> {
    try {
      const viewInfo = await this.getViewInfo();
      const platform = fin.Platform.getCurrentSync();
      
      await platform.createView({
        ...viewInfo,
        name: `${viewInfo.name}-copy-${Date.now()}`,
        title: newTitle || `${viewInfo.title} (Copy)`
      });
    } catch (error) {
      console.error('Failed to duplicate view:', error);
      throw error;
    }
  }
}
```

### 8. **Enhanced Dock Provider**

```typescript
// src/provider/dock/EnhancedDockProvider.ts
export class EnhancedDockProvider {
  private static viewTemplates = new Map<string, ViewTemplate>();
  private static openViews = new Map<string, ViewInstance>();

  static async initialize() {
    // Load view templates from configuration
    await this.loadViewTemplates();
    
    // Register dock with enhanced buttons
    await this.registerDock();
    
    // Set up view management
    this.setupViewManagement();
  }

  private static async loadViewTemplates() {
    const configService = new ConfigurationService();
    const templates = await configService.getConfiguration<ViewTemplate[]>('viewTemplates') || [];
    
    templates.forEach(template => {
      this.viewTemplates.set(template.id, template);
    });
  }

  private static async registerDock() {
    const dockConfig = {
      title: 'AGV3 Workspace',
      icon: `${window.location.origin}/icon.png`,
      workspaceComponents: ['home', 'notifications', 'store', 'switchWorkspace'],
      buttons: [
        ...this.createViewCreationButtons(),
        ...this.createViewManagementButtons(),
        this.createSettingsButton()
      ]
    };

    await Dock.register({
      id: 'agv3-enhanced-dock',
      ...dockConfig
    });
  }

  private static createViewCreationButtons(): DockButton[] {
    const buttons: DockButton[] = [];
    
    this.viewTemplates.forEach((template, id) => {
      buttons.push({
        tooltip: `Create ${template.name}`,
        iconUrl: template.iconUrl,
        action: {
          id: `create-view-${id}`,
          customData: { templateId: id }
        }
      });
    });

    return buttons;
  }

  private static createViewManagementButtons(): DockButton[] {
    return [
      {
        tooltip: 'Open Views',
        iconUrl: `${window.location.origin}/icons/views.png`,
        action: {
          id: 'open-view-manager'
        }
      },
      {
        tooltip: 'Restore Closed Views',
        iconUrl: `${window.location.origin}/icons/restore.png`,
        action: {
          id: 'restore-views'
        }
      }
    ];
  }

  static async createViewFromTemplate(templateId: string, config?: any): Promise<string> {
    const template = this.viewTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const viewId = `${templateId}-${Date.now()}`;
    const platform = fin.Platform.getCurrentSync();

    const viewOptions = {
      name: viewId,
      title: template.name,
      url: `${template.baseUrl}?id=${viewId}&config=${encodeURIComponent(JSON.stringify(config || {}))}`,
      ...template.defaultOptions
    };

    await platform.createView(viewOptions);
    
    // Track the view
    this.openViews.set(viewId, {
      id: viewId,
      templateId,
      title: template.name,
      config: config || {},
      createdAt: new Date()
    });

    return viewId;
  }
}

interface ViewTemplate {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  baseUrl: string;
  defaultOptions: any;
  configSchema?: any;
}

interface ViewInstance {
  id: string;
  templateId: string;
  title: string;
  config: any;
  createdAt: Date;
}
```

### 9. **Global Settings Service**

```typescript
// src/services/openfin/GlobalSettingsService.ts
export class GlobalSettingsService {
  private settingsChannel = 'global-settings';
  private interop: fin.Interop;
  private cache = new Map<string, any>();

  constructor() {
    this.initializeInterop();
  }

  private async initializeInterop() {
    this.interop = fin.Interop.connectSync(fin.me.uuid, {});
    await this.interop.joinSessionContextGroup(this.settingsChannel);
    
    // Load initial settings
    await this.loadSettings();
    
    // Listen for setting changes
    this.interop.addContextHandler(this.handleSettingsChange.bind(this));
  }

  private async loadSettings() {
    try {
      const context = await this.interop.getContext();
      const settings = context?.globalSettings || {};
      
      Object.entries(settings).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
    } catch (error) {
      console.error('Failed to load global settings:', error);
    }
  }

  async getSetting<T>(key: string, defaultValue?: T): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const context = await this.interop.getContext();
      const value = context?.globalSettings?.[key];
      
      if (value !== undefined) {
        this.cache.set(key, value);
        return value;
      }
    } catch (error) {
      console.error(`Failed to get setting: ${key}`, error);
    }

    return defaultValue as T;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      this.cache.set(key, value);
      
      const currentContext = await this.interop.getContext();
      const updatedContext = {
        ...currentContext,
        globalSettings: {
          ...currentContext?.globalSettings,
          [key]: value
        }
      };
      
      await this.interop.setContext(updatedContext);
    } catch (error) {
      console.error(`Failed to set setting: ${key}`, error);
      throw error;
    }
  }

  private handleSettingsChange(context: any) {
    const settings = context?.globalSettings || {};
    
    Object.entries(settings).forEach(([key, value]) => {
      if (this.cache.get(key) !== value) {
        this.cache.set(key, value);
        this.emit('setting-changed', { key, value });
      }
    });
  }

  private eventHandlers = new Map<string, Set<Function>>();

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  private emit(event: string, data: any) {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in settings event handler:`, error);
      }
    });
  }
}
```

### 10. **Usage Example**

```typescript
// src/windows/datagrid/DataGridWithServices.tsx
import React from 'react';
import { OpenFinBaseComponent } from '@/components/openfin/OpenFinBaseComponent';
import { useOpenFinServices } from '@/components/openfin/hooks/useOpenFinServices';

const DataGridComponent: React.FC = () => {
  const {
    workspaceEvents,
    configService,
    loggingService,
    communicationService,
    viewService,
    settingsService
  } = useOpenFinServices();

  useEffect(() => {
    // Listen to workspace events
    workspaceEvents.on('workspace-saved', (data) => {
      loggingService.info('Workspace saved', data);
    });

    workspaceEvents.on('theme-changed', (theme) => {
      loggingService.info('Theme changed', { theme });
      // Handle theme change
    });

    // Load configuration
    configService.getConfiguration('gridSettings').then(settings => {
      if (settings) {
        loggingService.info('Loaded grid settings', settings);
      }
    });

    // Listen for messages from other components
    communicationService.onMessage('data-update', (data, sender) => {
      loggingService.info('Received data update', { data, sender });
    });

  }, []);

  const handleRenameView = async (newTitle: string) => {
    try {
      await viewService.renameView(newTitle);
      loggingService.info('View renamed', { newTitle });
    } catch (error) {
      loggingService.error('Failed to rename view', error);
    }
  };

  return (
    <div>
      {/* Your grid component */}
    </div>
  );
};

// Wrap with OpenFin services
export const DataGridWithServices: React.FC = () => {
  return (
    <OpenFinBaseComponent componentName="DataGrid" viewId="datagrid-1">
      <DataGridComponent />
    </OpenFinBaseComponent>
  );
};
```

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
1. Create base OpenFin service classes
2. Implement OpenFinBaseComponent
3. Set up centralized logging service
4. Create configuration service with IAB

### Phase 2: Communication & Events (Week 3-4)
1. Implement workspace event service
2. Create inter-component communication
3. Set up global settings service
4. Add view management capabilities

### Phase 3: Enhanced Dock (Week 5-6)
1. Upgrade dock provider with view templates
2. Implement view creation from templates
3. Add view restoration capabilities
4. Create view management UI

### Phase 4: Migration & Testing (Week 7-8)
1. Migrate existing components to use new services
2. Remove direct localStorage access
3. Add comprehensive testing
4. Performance optimization

## Benefits

1. **Standardized Architecture**: All components follow the same patterns
2. **Centralized Services**: Logging, configuration, and communication in one place
3. **Event-Driven**: Reactive to workspace changes
4. **Scalable**: Easy to add new components and features
5. **Maintainable**: Clear separation of concerns
6. **Testable**: Services can be mocked and tested independently

This infrastructure will transform your OpenFin application into a truly enterprise-grade workspace platform with seamless component communication and centralized management.