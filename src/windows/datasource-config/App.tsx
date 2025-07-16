import { useState, useEffect } from 'react';
import { StompConfigurationDialog } from './components/StompConfigurationDialog';
import { StorageClient } from '../../services/storage/storageClient';
import { UnifiedConfig } from '../../services/storage/types';

export function App() {
  const [datasources, setDatasources] = useState<UnifiedConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDatasources();
  }, []);
  
  const loadDatasources = async () => {
    try {
      setLoading(true);
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      setDatasources(configs);
    } catch (error) {
      console.error('Failed to load datasources:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async (config: any) => {
    const unifiedConfig: UnifiedConfig = {
      configId: config.id || '',
      appId: 'agv3',
      userId: 'current-user',
      componentType: 'datasource',
      componentSubType: 'stomp',
      name: config.name,
      description: config.description || '',
      config: config,
      settings: [],
      activeSetting: 'default',
      createdBy: 'current-user',
      lastUpdatedBy: 'current-user',
      creationTime: new Date(),
      lastUpdated: new Date()
    };
    
    await StorageClient.save(unifiedConfig);
    await loadDatasources();
    setSelectedId(null);
  };
  
  const handleDelete = async (configId: string) => {
    if (confirm('Are you sure you want to delete this datasource?')) {
      await StorageClient.delete(configId);
      await loadDatasources();
      setSelectedId(null);
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r bg-secondary flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Datasources</h2>
            <button
              onClick={() => setSelectedId('new')}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              + New
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading...</div>
          ) : datasources.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-8">
              No datasources configured.
              <br />
              Click "+ New" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {datasources.map(ds => (
                <div
                  key={ds.configId}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedId === ds.configId 
                      ? 'bg-accent text-accent-foreground' 
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedId(ds.configId)}
                >
                  <div className="font-medium">{ds.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {ds.componentSubType?.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 bg-background">
        {selectedId ? (
          <StompConfigurationDialog
            config={
              selectedId === 'new' 
                ? null 
                : datasources.find(ds => ds.configId === selectedId)?.config
            }
            onSave={handleSave}
            onCancel={() => setSelectedId(null)}
            onDelete={
              selectedId !== 'new' 
                ? () => handleDelete(selectedId)
                : undefined
            }
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a datasource or create a new one
          </div>
        )}
      </div>
    </div>
  );
}