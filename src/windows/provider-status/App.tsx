import { useState, useEffect } from 'react';
import { ProviderManager } from '../../services/providers/providerManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function App() {
  const [providers, setProviders] = useState<any[]>([]);
  
  useEffect(() => {
    loadProviders();
    
    // Refresh every 2 seconds
    const interval = setInterval(loadProviders, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadProviders = () => {
    const activeProviders = ProviderManager.getActiveProviders();
    setProviders(activeProviders);
  };
  
  const handleStop = async (providerId: string) => {
    try {
      await ProviderManager.stopProvider(providerId);
      loadProviders();
    } catch (error) {
      alert('Failed to stop provider: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const handleRestart = async (providerId: string) => {
    try {
      await ProviderManager.restartProvider(providerId);
      loadProviders();
    } catch (error) {
      alert('Failed to restart provider: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const formatUptime = (startTime: Date) => {
    const uptime = Date.now() - new Date(startTime).getTime();
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Active Providers</h1>
          <p className="text-muted-foreground">
            Monitor and control active data providers
          </p>
        </div>
        
        {providers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No active providers. Start a provider from the datasource configuration.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {providers.map(provider => (
              <Card key={provider.providerId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{provider.config.name}</CardTitle>
                      <CardDescription>
                        {provider.type.toUpperCase()} • ID: {provider.providerId}
                      </CardDescription>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      provider.status === 'running' ? 'bg-green-500/20 text-green-500' :
                      provider.status === 'error' ? 'bg-red-500/20 text-red-500' :
                      provider.status === 'starting' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-gray-500/20 text-gray-500'
                    }`}>
                      {provider.status}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Uptime</div>
                      <div className="font-medium">{formatUptime(provider.startTime)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Topic</div>
                      <div className="font-medium">{provider.config.topic}</div>
                    </div>
                  </div>
                  
                  {provider.error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-500">
                      Error: {provider.error}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestart(provider.providerId)}
                      disabled={provider.status === 'starting'}
                    >
                      Restart
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStop(provider.providerId)}
                      disabled={provider.status === 'stopping'}
                    >
                      Stop
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}