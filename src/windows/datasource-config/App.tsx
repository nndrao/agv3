import { useState, useEffect } from 'react';
import { StompConfigurationDialog } from './components/StompConfigurationDialog';
import { AppVariablesConfiguration } from './components/AppVariablesConfiguration';
import { StorageClient } from '../../services/storage/storageClient';
import { UnifiedConfig } from '../../services/storage/types';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Database, Variable } from 'lucide-react';
import { withOpenFinServices } from '@/utils/withOpenFinServices';
import { useOpenFinServices } from '@/services/openfin/useOpenFinServices';
import './datasource-config.css';

function DatasourceConfigApp() {
  const { logger, configuration } = useOpenFinServices();
  const [datasources, setDatasources] = useState<UnifiedConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<'stomp' | 'variables' | null>(null);
  
  useEffect(() => {
    // Add class to body for specific styling
    document.body.classList.add('datasource-config-window');
    return () => {
      document.body.classList.remove('datasource-config-window');
    };
  }, []);
  
  useEffect(() => {
    loadDatasources();
  }, []);
  
  const loadDatasources = async () => {
    try {
      setLoading(true);
      logger.info('[DatasourceConfig] Loading datasources');
      const configs = await StorageClient.query({
        componentType: 'datasource',
        appId: 'agv3'
      });
      setDatasources(configs);
      logger.info('[DatasourceConfig] Loaded datasources', { count: configs.length });
    } catch (error) {
      logger.error('[DatasourceConfig] Failed to load datasources:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async (config: any) => {
    try {
      // Check if this is an update or create
      const isUpdate = config.id && selectedId !== 'new';
      
      if (isUpdate) {
        // Update existing configuration
        await StorageClient.update(config.id, {
          name: config.name,
          description: config.description || '',
          config: config,
          componentSubType: config.type || 'stomp',
          lastUpdated: new Date(),
          lastUpdatedBy: 'current-user'
        });
        logger.info('[DatasourceConfig] Updated datasource', { id: config.id });
      } else {
        // Create new configuration
        const unifiedConfig: UnifiedConfig = {
          configId: config.id || '',
          appId: 'agv3',
          userId: 'current-user',
          componentType: 'datasource',
          componentSubType: config.type || 'stomp',
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
        logger.info('[DatasourceConfig] Created new datasource', { id: config.id });
      }
      
      await loadDatasources();
      setSelectedId(null);
    } catch (error) {
      logger.error('[DatasourceConfig] Failed to save datasource:', error);
      // You could add a toast notification here to show the error to the user
      alert(`Failed to save datasource: ${error.message}`);
    }
  };
  
  const handleNewDatasource = (type: 'stomp' | 'variables') => {
    setSelectedType(type);
    setSelectedId('new');
    setShowTypeSelector(false);
  };
  
  const handleDelete = async (configId: string) => {
    if (confirm('Are you sure you want to delete this datasource?')) {
      await StorageClient.delete(configId);
      await loadDatasources();
      setSelectedId(null);
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden bg-[#1a1a1a]">
      {/* Sidebar */}
      <div className="w-80 border-r border-[#3a3a3a] bg-[#242424] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Datasources</h2>
            <button
              onClick={() => setShowTypeSelector(true)}
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
                  onClick={() => {
                    setSelectedId(ds.configId);
                    setSelectedType(ds.componentSubType as 'stomp' | 'variables');
                  }}
                >
                  <div className="font-medium">{ds.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    {ds.componentSubType === 'variables' ? (
                      <>
                        <Variable className="h-3 w-3" />
                        Variables
                      </>
                    ) : (
                      <>
                        <Database className="h-3 w-3" />
                        {ds.componentSubType?.toUpperCase()}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 bg-background overflow-hidden">
        {selectedId ? (
          selectedType === 'variables' ? (
            <AppVariablesConfiguration
              config={
                selectedId === 'new' 
                  ? null 
                  : datasources.find(ds => ds.configId === selectedId)?.config
              }
              onSave={handleSave}
              onCancel={() => setSelectedId(null)}
            />
          ) : (
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
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a datasource or create a new one
          </div>
        )}
      </div>
      
      {/* Type Selector Dialog */}
      <Dialog open={showTypeSelector} onOpenChange={setShowTypeSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Datasource Type</DialogTitle>
            <DialogDescription>
              Choose the type of datasource you want to create
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleNewDatasource('stomp')}
            >
              <Database className="h-8 w-8" />
              <span>STOMP Datasource</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => handleNewDatasource('variables')}
            >
              <Variable className="h-8 w-8" />
              <span>App Variables</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export wrapped with OpenFinServiceProvider
export const App = withOpenFinServices(DatasourceConfigApp, {
  services: ['configuration', 'logging', 'events'],
  logLevel: 'info'
});