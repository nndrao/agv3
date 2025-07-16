import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageClient } from '../../../services/storage/storageClient';
import { ProviderManager } from '../../../services/providers/providerManager';

interface ProviderSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProviders();
    
    // Refresh providers every 5 seconds
    const interval = setInterval(loadProviders, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const loadProviders = async () => {
    try {
      // Get datasource configs
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      
      // Get active providers
      const activeProviders = ProviderManager.getActiveProviders();
      const activeProviderIds = new Set(activeProviders.map(p => p.providerId));
      
      // Combine configs with active status
      const providersWithStatus = configs.map(config => ({
        id: config.config.id,
        name: config.name,
        type: config.componentSubType,
        isActive: activeProviderIds.has(config.config.id),
        status: activeProviders.find(p => p.providerId === config.config.id)?.status || 'stopped'
      }));
      
      setProviders(providersWithStatus);
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading providers...</div>;
  }
  
  return (
    <Select value={value || ''} onValueChange={(val) => onChange(val || null)}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select a datasource..." />
      </SelectTrigger>
      <SelectContent>
        {providers.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            No datasources configured. Please configure a datasource first.
          </div>
        ) : (
          providers.map(provider => (
            <SelectItem key={provider.id} value={provider.id}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  provider.isActive && provider.status === 'running' ? 'bg-green-500' :
                  provider.isActive && provider.status === 'error' ? 'bg-red-500' :
                  provider.isActive ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />
                <span>{provider.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({provider.type?.toUpperCase()})
                  {!provider.isActive && ' - Inactive'}
                </span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}