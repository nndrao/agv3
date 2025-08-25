/**
 * withOpenFinServices HOC
 * 
 * Higher-Order Component for wrapping existing components with OpenFinServiceProvider
 * Allows easy migration of existing components without major refactoring
 */

import React, { ComponentType } from 'react';
import { OpenFinServiceProvider } from '../services/openfin/OpenFinServiceProvider';
import { ServiceProviderConfig } from '../services/openfin/ServiceContext';

/**
 * HOC to wrap a component with OpenFinServiceProvider
 * 
 * @example
 * ```typescript
 * // Before
 * export default DataGridStompShared;
 * 
 * // After - with default configuration
 * export default withOpenFinServices(DataGridStompShared);
 * 
 * // After - with custom configuration
 * export default withOpenFinServices(DataGridStompShared, {
 *   services: ['configuration', 'logging', 'events'],
 *   logLevel: 'debug'
 * });
 * ```
 */
export function withOpenFinServices<P extends object>(
  Component: ComponentType<P>,
  config?: Partial<ServiceProviderConfig>
): ComponentType<P> {
  // Get view ID from URL params or generate one
  const getViewId = (): string => {
    // Try to get from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('id') || urlParams.get('viewId');
    
    if (viewId) return viewId;
    
    // Try to get from component props (if passed)
    // This will be overridden by actual props when component is used
    return `view-${Date.now()}`;
  };

  // Create the wrapped component
  const WrappedComponent: React.FC<P> = (props: P) => {
    // Extract viewId from props if available
    const viewId = (props as any).viewId || getViewId();
    
    // Merge default config with provided config
    const finalConfig: ServiceProviderConfig = {
      viewId,
      services: ['configuration', 'logging', 'events', 'window'],
      logLevel: 'info',
      logToConsole: true,
      logToIndexedDB: true,
      subscribeToWorkspaceEvents: true,
      subscribeToThemeEvents: true,
      subscribeToProfileEvents: true,
      subscribeToProviderEvents: true,
      enableCaching: true,
      cacheTimeout: 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    return (
      <OpenFinServiceProvider {...finalConfig}>
        <Component {...props} />
      </OpenFinServiceProvider>
    );
  };

  // Set display name for debugging
  WrappedComponent.displayName = `withOpenFinServices(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

/**
 * HOC with preset configurations for common use cases
 */

/**
 * Wrap component with minimal services (just logging)
 */
export function withLogging<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return withOpenFinServices(Component, {
    services: ['logging'],
    logLevel: 'info'
  });
}

/**
 * Wrap component with configuration services
 */
export function withConfiguration<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return withOpenFinServices(Component, {
    services: ['configuration', 'logging']
  });
}

/**
 * Wrap component with event services
 */
export function withEvents<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return withOpenFinServices(Component, {
    services: ['events', 'logging'],
    subscribeToWorkspaceEvents: true,
    subscribeToThemeEvents: true,
    subscribeToProfileEvents: true,
    subscribeToProviderEvents: true
  });
}

/**
 * Wrap component with window operations
 */
export function withWindowOperations<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return withOpenFinServices(Component, {
    services: ['window', 'logging']
  });
}

/**
 * Wrap component with all services (full feature set)
 */
export function withAllServices<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return withOpenFinServices(Component, {
    services: ['configuration', 'logging', 'appVariables', 'window', 'events', 'theme', 'channels'],
    logLevel: 'info',
    subscribeToWorkspaceEvents: true,
    subscribeToThemeEvents: true,
    subscribeToProfileEvents: true,
    subscribeToProviderEvents: true,
    enableCaching: true
  });
}

/**
 * Custom hook to check if component is wrapped with OpenFinServices
 */
export function useIsWrapped(): boolean {
  try {
    // Try to access the context
    const { useOpenFinServices } = require('../services/openfin/useOpenFinServices');
    const services = useOpenFinServices();
    return services !== null;
  } catch {
    return false;
  }
}