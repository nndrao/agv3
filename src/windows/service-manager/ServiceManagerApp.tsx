import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw, Play, Square } from 'lucide-react';
import { withOpenFinServices } from '@/utils/withOpenFinServices';
import { useOpenFinServices } from '@/services/openfin/useOpenFinServices';
import { ServiceManager } from './ServiceManager';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
  description: string;
  lastUpdate?: Date;
  error?: string;
  actions?: string[];
}

const ServiceManagerContent: React.FC = () => {
  const { logger } = useOpenFinServices();
  const [serviceManager, setServiceManager] = useState<ServiceManager | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Configuration Service',
      status: 'stopped',
      description: 'Centralized configuration management via OpenFin IAB',
      actions: ['start', 'restart']
    },
    {
      name: 'Logging Service',
      status: 'running',
      description: 'Structured logging with IndexedDB persistence',
      lastUpdate: new Date(),
      actions: ['stop', 'restart', 'clear']
    },
    {
      name: 'Event Bus Service',
      status: 'running',
      description: 'Cross-window event broadcasting and subscription',
      lastUpdate: new Date(),
      actions: ['stop', 'restart']
    },
    {
      name: 'App Variables Service',
      status: 'stopped',
      description: 'Dynamic variable resolution and template processing',
      actions: ['start']
    },
    {
      name: 'Theme Manager',
      status: 'running',
      description: 'Application-wide theme synchronization',
      lastUpdate: new Date(),
      actions: ['stop', 'restart']
    },
    {
      name: 'Channel Manager',
      status: 'stopped',
      description: 'OpenFin channel communication management',
      actions: ['start']
    }
  ]);

  const [selectedService, setSelectedService] = useState<ServiceStatus | null>(null);

  useEffect(() => {
    logger.info('[ServiceManager] Component mounted');
    initializeServices();
    
    // Cleanup on unmount
    return () => {
      logger.info('[ServiceManager] Component unmounting, cleaning up...');
      // Don't shutdown services on unmount - they should stay running
      // ServiceManager.resetInstance();
    };
  }, [logger]);

  const initializeServices = async () => {
    try {
      logger.info('[ServiceManagerApp] Initializing Service Manager...');
      
      // Reset any existing instance first
      await ServiceManager.resetInstance();
      
      // Get singleton instance and initialize
      const manager = ServiceManager.getInstance();
      await manager.initialize();
      setServiceManager(manager);
      
      // Update UI to show services are running
      setServices(prev => prev.map(service => {
        switch (service.name) {
          case 'Configuration Service':
          case 'Logging Service':
          case 'Event Bus Service':
          case 'App Variables Service':
          case 'Channel Manager':
            return {
              ...service,
              status: 'running',
              lastUpdate: new Date()
            };
          default:
            return service;
        }
      }));
      
      logger.info('[ServiceManagerApp] All services initialized successfully');
      
      // Make ServiceManager available globally for debugging
      (window as any).serviceManager = manager;
      
      // Periodically check service statuses
      const interval = setInterval(() => {
        checkServiceStatuses();
      }, 5000);
      
      return () => clearInterval(interval);
    } catch (error) {
      logger.error('[ServiceManagerApp] Failed to initialize services:', error);
      
      // Update UI to show error state
      setServices(prev => prev.map(service => ({
        ...service,
        status: 'error',
        error: 'Failed to initialize'
      })));
    }
  };

  const checkServiceStatuses = async () => {
    // Check if Configuration Service channel exists
    try {
      const channels = await fin.InterApplicationBus.Channel.getAllChannels();
      const configServiceRunning = channels.some(ch => ch.name === 'agv3-configuration-service');
      
      setServices(prev => prev.map(service => {
        if (service.name === 'Configuration Service') {
          return {
            ...service,
            status: configServiceRunning ? 'running' : 'stopped',
            lastUpdate: configServiceRunning ? new Date() : undefined
          };
        }
        return service;
      }));
    } catch (error) {
      logger.error('[ServiceManager] Failed to check service statuses:', error);
    }
  };

  const handleServiceAction = async (serviceName: string, action: string) => {
    logger.info(`[ServiceManager] Executing ${action} on ${serviceName}`);
    
    // For now, just simulate the action
    setServices(prev => prev.map(service => {
      if (service.name === serviceName) {
        if (action === 'start' || action === 'restart') {
          return { ...service, status: 'starting' };
        } else if (action === 'stop') {
          return { ...service, status: 'stopped', lastUpdate: undefined };
        }
      }
      return service;
    }));

    // Simulate service starting
    if (action === 'start' || action === 'restart') {
      setTimeout(() => {
        setServices(prev => prev.map(service => {
          if (service.name === serviceName) {
            return { ...service, status: 'running', lastUpdate: new Date() };
          }
          return service;
        }));
      }, 1000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stopped':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'starting':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'stopped':
        return <Badge variant="secondary">Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'starting':
        return <Badge className="bg-blue-500">Starting</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="h-screen w-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Service Manager</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage AGV3 platform services
          </p>
        </div>

        <Tabs defaultValue="services" className="w-full">
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <Card 
                  key={service.name} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedService(service)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(service.status)}
                        {service.name}
                      </CardTitle>
                      {getStatusBadge(service.status)}
                    </div>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {service.lastUpdate && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Last updated: {service.lastUpdate.toLocaleTimeString()}
                      </p>
                    )}
                    {service.error && (
                      <p className="text-sm text-red-500 mb-3">{service.error}</p>
                    )}
                    <div className="flex gap-2">
                      {service.actions?.map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === 'stop' ? 'destructive' : 'default'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleServiceAction(service.name, action);
                          }}
                        >
                          {action === 'start' && <Play className="h-3 w-3 mr-1" />}
                          {action === 'stop' && <Square className="h-3 w-3 mr-1" />}
                          {action === 'restart' && <RefreshCw className="h-3 w-3 mr-1" />}
                          {action.charAt(0).toUpperCase() + action.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Logs</CardTitle>
                <CardDescription>
                  Real-time logs from all services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full rounded-md border p-4">
                  <div className="space-y-2 font-mono text-sm">
                    <div className="text-green-600">[2025-08-24 18:40:18] Configuration Service started</div>
                    <div className="text-blue-600">[2025-08-24 18:40:18] Logging Service initialized</div>
                    <div className="text-blue-600">[2025-08-24 18:40:18] Event Bus Service connected</div>
                    <div className="text-yellow-600">[2025-08-24 18:40:19] Channel Manager waiting for connections</div>
                    <div className="text-green-600">[2025-08-24 18:40:19] Theme Manager synchronized</div>
                    <div className="text-gray-600">[2025-08-24 18:40:20] Health check completed</div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Configuration</CardTitle>
                <CardDescription>
                  Configure service startup and behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Auto-start Services</h3>
                    <div className="space-y-2">
                      {services.map((service) => (
                        <div key={service.name} className="flex items-center justify-between">
                          <span>{service.name}</span>
                          <input type="checkbox" defaultChecked={service.status === 'running'} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Button onClick={checkServiceStatuses}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Export wrapped with OpenFinServiceProvider
export const ServiceManagerApp = withOpenFinServices(ServiceManagerContent, {
  services: ['logging', 'events'],
  logLevel: 'info'
});