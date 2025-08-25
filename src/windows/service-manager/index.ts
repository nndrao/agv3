/**
 * Service Manager Entry Point
 * 
 * This file is loaded by service-manager.html and initializes
 * all centralized services for the AGV3 platform
 */

import { ServiceManager } from './ServiceManager';

// Initialize the service manager when the window loads
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[Service Manager] DOM loaded, initializing services...');
  
  try {
    const serviceManager = new ServiceManager();
    
    // Make it available globally for debugging
    (window as any).serviceManager = serviceManager;
    
    // Initialize all services
    await serviceManager.initialize();
    
    console.log('[Service Manager] All services initialized successfully');
  } catch (error) {
    console.error('[Service Manager] Failed to initialize:', error);
  }
});