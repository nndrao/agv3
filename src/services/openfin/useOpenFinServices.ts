/**
 * useOpenFinServices Hook
 * 
 * React hook for accessing OpenFin services from the context
 */

import { useContext } from 'react';
import { OpenFinServiceContext, ServiceProviderContext } from './ServiceContext';

/**
 * Hook to access OpenFin services
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { configuration, logger, events } = useOpenFinServices();
 *   
 *   useEffect(() => {
 *     logger.info('Component mounted');
 *     
 *     const unsubscribe = events.on('theme:changed', (theme) => {
 *       logger.info('Theme changed', { theme });
 *     });
 *     
 *     return unsubscribe;
 *   }, []);
 * }
 * ```
 */
export function useOpenFinServices(): ServiceProviderContext {
  const context = useContext(OpenFinServiceContext);

  if (!context) {
    throw new Error(
      'useOpenFinServices must be used within an OpenFinServiceProvider. ' +
      'Make sure your component is wrapped with <OpenFinServiceProvider>.'
    );
  }

  return context;
}

/**
 * Hook to access specific services with type safety
 * 
 * @example
 * ```typescript
 * const logger = useService('logger');
 * const config = useService('configuration');
 * ```
 */
export function useService<K extends keyof ServiceProviderContext>(
  serviceName: K
): ServiceProviderContext[K] {
  const services = useOpenFinServices();
  return services[serviceName];
}

/**
 * Hook to access configuration service
 */
export function useConfiguration() {
  return useService('configuration');
}

/**
 * Hook to access logging service
 */
export function useLogger() {
  return useService('logger');
}

/**
 * Hook to access app variables service
 */
export function useAppVariables() {
  return useService('appVariables');
}

/**
 * Hook to access window operations
 */
export function useWindowOperations() {
  return useService('window');
}

/**
 * Hook to access event bus
 */
export function useEventBus() {
  return useService('events');
}

/**
 * Hook to access theme manager
 */
export function useTheme() {
  return useService('theme');
}

/**
 * Hook to access channel manager
 */
export function useChannels() {
  return useService('channels');
}

/**
 * Hook to access service metadata
 */
export function useServiceMetadata() {
  return useService('metadata');
}

/**
 * Hook to access service health
 */
export function useServiceHealth() {
  return useService('health');
}