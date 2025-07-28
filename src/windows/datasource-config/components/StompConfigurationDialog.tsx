import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConnectionTab } from './tabs/ConnectionTab';
import { FieldsTab } from './tabs/FieldsTab';
import { ColumnsTab } from './tabs/ColumnsTab';
import { ProviderManager } from '../../../services/providers/providerManager';
import { StompDatasourceProvider, FieldInfo } from '../../../providers/StompDatasourceProvider';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { FieldNode } from './FieldSelector';
import { templateResolver } from '../../../services/template/templateResolver';

export interface ColumnDefinition {
  field: string;
  headerName: string;
  cellDataType?: 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'object';
  width?: number;
  filter?: string | boolean;
  sortable?: boolean;
  resizable?: boolean;
  hide?: boolean;
  type?: string;
  valueFormatter?: string;
}

interface StompConfigurationDialogProps {
  config: any;
  onSave: (config: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const getDefaultConfig = () => ({
  id: uuidv4(),
  name: 'New STOMP Datasource',
  websocketUrl: '',
  listenerTopic: '',
  requestMessage: 'START',
  requestBody: 'TriggerTopic',
  snapshotEndToken: 'Success',
  keyColumn: '',
  messageRate: '1000',
  snapshotTimeoutMs: 60000,
  autoStart: false,
  inferredFields: [],
  columnDefinitions: []
});

export function StompConfigurationDialog({ 
  config, 
  onSave, 
  onCancel,
  onDelete 
}: StompConfigurationDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(config || getDefaultConfig());
  const [activeTab, setActiveTab] = useState('connection');
  
  // Connection testing state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState('');
  
  // Field inference state
  const [inferring, setInferring] = useState(false);
  const [inferredFields, setInferredFields] = useState<FieldNode[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [selectAllIndeterminate, setSelectAllIndeterminate] = useState(false);
  
  // Column state
  const [manualColumns, setManualColumns] = useState<ColumnDefinition[]>([]);
  const [fieldColumnOverrides, setFieldColumnOverrides] = useState<Record<string, Partial<ColumnDefinition>>>({});
  
  // Listen for update datasource events
  useEffect(() => {
    const handleUpdate = () => {
      handleSave();
    };
    window.addEventListener('updateDatasource', handleUpdate);
    return () => window.removeEventListener('updateDatasource', handleUpdate);
  }, [formData, selectedFields, manualColumns, fieldColumnOverrides, inferredFields]);

  // Load existing configuration
  useEffect(() => {
    if (config) {
      setFormData(config);
      if (config.inferredFields) {
        const fieldNodes = config.inferredFields.map(convertFieldInfoToNode);
        setInferredFields(fieldNodes);
      }
      if (config.columnDefinitions) {
        // Separate manual columns from field-based columns
        const manual = config.columnDefinitions.filter((col: ColumnDefinition) => 
          !config.inferredFields?.some((field: any) => field.path === col.field)
        );
        setManualColumns(manual);
        
        // Build selected fields set
        const selected = new Set<string>(config.columnDefinitions
          .filter((col: ColumnDefinition) => 
            config.inferredFields?.some((field: any) => field.path === col.field)
          )
          .map((col: ColumnDefinition) => col.field)
        );
        setSelectedFields(selected);
      }
    }
  }, [config]);
  
  // Auto-expand all object fields when fields are inferred
  useEffect(() => {
    const objectPaths = new Set<string>();
    
    const findObjectFields = (fields: FieldNode[]) => {
      fields.forEach(field => {
        if (field.children) {
          objectPaths.add(field.path);
          findObjectFields(field.children);
        }
      });
    };
    
    findObjectFields(inferredFields);
    setExpandedFields(objectPaths);
  }, [inferredFields]);
  
  // Update select all checkbox state
  useEffect(() => {
    const allLeafPaths = new Set<string>();
    
    const collectAllLeafPaths = (fields: FieldNode[]) => {
      fields.forEach(field => {
        if (field.type !== 'object' || !field.children || field.children.length === 0) {
          allLeafPaths.add(field.path);
        }
        if (field.children) {
          collectAllLeafPaths(field.children);
        }
      });
    };
    
    collectAllLeafPaths(inferredFields);
    
    const selectedCount = Array.from(allLeafPaths).filter(path => selectedFields.has(path)).length;
    const totalCount = allLeafPaths.size;
    
    if (selectedCount === 0) {
      setSelectAllChecked(false);
      setSelectAllIndeterminate(false);
    } else if (selectedCount === totalCount) {
      setSelectAllChecked(true);
      setSelectAllIndeterminate(false);
    } else {
      setSelectAllChecked(false);
      setSelectAllIndeterminate(true);
    }
  }, [selectedFields, inferredFields]);
  
  const convertFieldInfoToNode = (fieldInfo: FieldInfo): FieldNode => {
    return {
      path: fieldInfo.path,
      name: fieldInfo.path.split('.').pop() || fieldInfo.path,
      type: fieldInfo.type,
      nullable: fieldInfo.nullable,
      sample: fieldInfo.sample,
      children: fieldInfo.children 
        ? Object.values(fieldInfo.children).map(convertFieldInfoToNode)
        : undefined,
    };
  };
  
  const convertToFieldNodes = (fields: Record<string, FieldInfo>): FieldNode[] => {
    // Filter to only root-level fields (no dots in the key)
    const rootFields = Object.entries(fields).filter(([key]) => !key.includes('.'));
    
    return rootFields.map(([key, field]) => ({
      path: field.path,
      name: key,
      type: field.type,
      nullable: field.nullable,
      sample: field.sample,
      children: field.children ? Object.entries(field.children).map(([childKey, childField]) => 
        convertFieldNodeRecursive(childField, childKey)
      ) : undefined,
    }));
  };
  
  const convertFieldNodeRecursive = (field: FieldInfo, name: string): FieldNode => {
    return {
      path: field.path,
      name: name,
      type: field.type,
      nullable: field.nullable,
      sample: field.sample,
      children: field.children ? Object.entries(field.children).map(([childKey, childField]) => 
        convertFieldNodeRecursive(childField, childKey)
      ) : undefined,
    };
  };
  
  const convertFieldNodeToInfo = (node: FieldNode): FieldInfo => {
    const info: FieldInfo = {
      path: node.path,
      type: node.type as FieldInfo['type'],
      nullable: node.nullable,
      sample: node.sample,
    };
    
    if (node.children) {
      info.children = {};
      node.children.forEach(child => {
        const childName = child.path.split('.').pop() || child.path;
        info.children![childName] = convertFieldNodeToInfo(child);
      });
    }
    
    return info;
  };
  
  // Helper function to collect all non-object leaf paths from a field
  const collectNonObjectLeaves = (field: FieldNode): string[] => {
    const leaves: string[] = [];
    
    if (!field.children || field.children.length === 0) {
      // Leaf node
      if (field.type !== 'object') {
        leaves.push(field.path);
      }
    } else {
      // Has children - recurse
      field.children.forEach(child => {
        leaves.push(...collectNonObjectLeaves(child));
      });
    }
    
    return leaves;
  };
  
  // Find a field node by path in the field tree
  const findFieldByPath = (path: string, fields: FieldNode[]): FieldNode | null => {
    for (const field of fields) {
      if (field.path === path) {
        return field;
      }
      if (field.children) {
        const found = findFieldByPath(path, field.children);
        if (found) return found;
      }
    }
    return null;
  };
  
  const handleTestConnection = async () => {
    setTesting(true);
    setTestError('');
    setTestResult(null);
    
    if (!formData.websocketUrl) {
      setTestError('WebSocket URL is required');
      setTesting(false);
      return;
    }
    
    // For test connection, we don't need topics - just test WebSocket connection
    const provider = new StompDatasourceProvider({
      websocketUrl: formData.websocketUrl,
      listenerTopic: '/test/connection', // Dummy topic for connection test
      requestMessage: '',
      requestBody: '',
      snapshotEndToken: formData.snapshotEndToken || 'Success',
      keyColumn: formData.keyColumn,
      messageRate: formData.messageRate,
      snapshotTimeoutMs: formData.snapshotTimeoutMs || 60000,
    });

    try {
      const connected = await provider.checkConnection();
      
      if (connected) {
        setTestResult({ success: true });
        toast({
          title: 'Connection successful',
          description: 'Successfully connected to STOMP server',
        });
      } else {
        setTestError('Failed to connect to server');
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      provider.disconnect();
      setTesting(false);
    }
  };
  
  const handleInferFields = async () => {
    setInferring(true);
    setTestError('');
    
    if (!formData.websocketUrl) {
      setTestError('WebSocket URL is required');
      setInferring(false);
      return;
    }
    
    // Create a session ID for consistent UUIDs during this operation
    const sessionId = uuidv4();
    
    let listenerTopic: string;
    let requestMessage: string;
    
    if (formData.manualTopics && formData.listenerTopic && formData.requestMessage) {
      // Use manual topics with template resolution
      listenerTopic = templateResolver.resolveTemplate(formData.listenerTopic, sessionId);
      requestMessage = templateResolver.resolveTemplate(formData.requestMessage, sessionId);
      
      console.log('[InferFields] Using manual topics with template resolution:', {
        originalListener: formData.listenerTopic,
        originalTrigger: formData.requestMessage,
        resolvedListener: listenerTopic,
        resolvedTrigger: requestMessage,
        sessionId
      });
    } else {
      // Generate auto topics
      const clientId = uuidv4();
      const dataType = formData.dataType || 'positions';
      const messageRate = formData.messageRate || 1000;
      const batchSize = formData.batchSize || '';
      
      listenerTopic = `/snapshot/${dataType}/${clientId}`;
      requestMessage = `/snapshot/${dataType}/${clientId}/${messageRate}${batchSize ? `/${batchSize}` : ''}`;
      
      console.log('[InferFields] Using auto-generated topics:', {
        listenerTopic,
        requestMessage,
        clientId
      });
    }
    
    const provider = new StompDatasourceProvider({
      websocketUrl: formData.websocketUrl,
      listenerTopic: listenerTopic,
      requestMessage: requestMessage,
      requestBody: 'START', // Fixed trigger body
      snapshotEndToken: formData.snapshotEndToken || 'Success',
      keyColumn: formData.keyColumn,
      messageRate: formData.messageRate,
      snapshotTimeoutMs: formData.snapshotTimeoutMs || 60000,
      dataType: formData.dataType,
      batchSize: formData.batchSize,
    });

    try {
      // Use Map to track unique rows if key column is specified
      const dataMap = formData.keyColumn ? new Map<string, any>() : null;
      let accumulatedData: any[] = [];
      
      const result = await provider.fetchSnapshot(100, (batch, _totalRows) => {
        // Handle duplicates based on key column
        if (formData.keyColumn && dataMap) {
          batch.forEach(row => {
            const key = row[formData.keyColumn];
            if (key !== undefined && key !== null) {
              dataMap.set(String(key), row);
            }
          });
          accumulatedData = Array.from(dataMap.values());
        } else {
          // No key column - just accumulate
          accumulatedData.push(...batch);
        }
      });
      
      if (result.success && result.data && result.data.length > 0) {
        // Infer fields
        const fields = StompDatasourceProvider.inferFields(result.data);
        console.log('[Field Inference] Raw fields:', fields);
        const fieldNodes = convertToFieldNodes(fields);
        console.log('[Field Inference] Converted field nodes:', fieldNodes);
        setInferredFields(fieldNodes);
        
        toast({
          title: 'Fields inferred successfully',
          description: `Analyzed ${result.data.length} rows and found ${fieldNodes.length} fields`,
        });
      } else {
        setTestError('No data received. Check your configuration.');
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      provider.disconnect();
      setInferring(false);
    }
  };
  
  const handleSave = () => {
    // Validate required fields
    if (!formData.name || !formData.websocketUrl) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Name and WebSocket URL',
        variant: 'destructive',
      });
      return;
    }
    
    // Handle topic configuration
    if (formData.manualTopics) {
      // Manual topics are already set, just ensure request body is set
      if (!formData.requestBody) {
        formData.requestBody = 'START';
      }
    } else {
      // Generate auto topics if not using manual configuration
      const clientId = uuidv4();
      const dataType = formData.dataType || 'positions';
      const messageRate = formData.messageRate || 1000;
      const batchSize = formData.batchSize || '';
      
      formData.listenerTopic = `/snapshot/${dataType}/${clientId}`;
      formData.requestMessage = `/snapshot/${dataType}/${clientId}/${messageRate}${batchSize ? `/${batchSize}` : ''}`;
      formData.requestBody = 'START';
      
      console.log('[Save] Generated auto topics:', {
        listenerTopic: formData.listenerTopic,
        requestMessage: formData.requestMessage,
        clientId
      });
    }
    
    // Build columns from selected fields + manual columns
    const columnsFromFields: ColumnDefinition[] = Array.from(selectedFields).map(path => {
      const override = fieldColumnOverrides[path] || {};
      const fieldNode = findFieldNode(inferredFields, path);
      const cellDataType = override.cellDataType || mapFieldTypeToCellType(fieldNode?.type || 'string');
      
      const column: ColumnDefinition = {
        field: path,
        headerName: override.headerName || path.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
        cellDataType: cellDataType,
      };
      
      // Apply date-specific settings
      if (cellDataType === 'date' || cellDataType === 'dateString') {
        column.filter = 'agDateColumnFilter';
        // Default to ISO DateTime format for date columns
        column.valueFormatter = 'YYYY-MM-DD HH:mm:ss';
      }
      
      // Apply number-specific settings
      if (cellDataType === 'number') {
        column.type = 'numericColumn';
        column.filter = 'agNumberColumnFilter';
      }
      
      return column;
    });
    
    const updatedConfig = {
      ...formData,
      columnDefinitions: [...columnsFromFields, ...manualColumns],
      inferredFields: inferredFields.map(field => convertFieldNodeToInfo(field)),
    };
    
    onSave(updatedConfig);
  };
  
  const findFieldNode = (fields: FieldNode[], path: string): FieldNode | undefined => {
    for (const field of fields) {
      if (field.path === path) return field;
      if (field.children) {
        const found = findFieldNode(field.children, path);
        if (found) return found;
      }
    }
    return undefined;
  };
  
  const mapFieldTypeToCellType = (type: string): ColumnDefinition['cellDataType'] => {
    switch (type) {
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'object': return 'object';
      case 'date': return 'date';
      default: return 'text';
    }
  };
  
  const handleStartProvider = async () => {
    // Save first
    handleSave();
    
    // Then start provider
    try {
      await ProviderManager.startProvider({
        providerId: formData.id,
        configId: formData.id,
        config: formData,
        type: 'stomp'
      });
      
      alert('Provider started successfully!');
    } catch (error) {
      alert('Failed to start provider: ' + (error instanceof Error ? error.message : String(error)));
    }
  };
  
  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData((prev: typeof formData) => ({ ...prev, ...updates }));
  };
  
  return (
    <div className="stomp-configuration-dialog h-full w-full bg-[#1a1a1a] text-white flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 rounded-none h-14 bg-[#2a2a2a] border-b border-[#3a3a3a]">
          <TabsTrigger 
            value="connection" 
            className="rounded-none data-[state=active]:bg-[#1a1a1a] data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-sm font-medium"
          >
            Connection
          </TabsTrigger>
          <TabsTrigger 
            value="fields" 
            className="rounded-none data-[state=active]:bg-[#1a1a1a] data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-sm font-medium flex items-center justify-center gap-2"
          >
            Fields
            {inferredFields.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                {inferredFields.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="columns" 
            className="rounded-none data-[state=active]:bg-[#1a1a1a] data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-sm font-medium flex items-center justify-center gap-2"
          >
            Columns
            {(selectedFields.size + manualColumns.length) > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
                {selectedFields.size + manualColumns.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1 overflow-hidden">
          <TabsContent value="connection" className="h-full overflow-hidden m-0">
            <ConnectionTab
              config={formData}
              onChange={updateFormData}
              onTest={handleTestConnection}
              onInferFields={handleInferFields}
              testing={testing}
              inferring={inferring}
              testResult={testResult}
              testError={testError}
            />
          </TabsContent>
          
          <TabsContent value="fields" className="h-full overflow-hidden m-0">
            <FieldsTab
              inferredFields={inferredFields}
              selectedFields={selectedFields}
              expandedFields={expandedFields}
              fieldSearchQuery={fieldSearchQuery}
              selectAllChecked={selectAllChecked}
              selectAllIndeterminate={selectAllIndeterminate}
              onFieldToggle={(path) => {
                const field = findFieldByPath(path, inferredFields);
                if (!field) return;
                
                const newSelected = new Set(selectedFields);
                
                if (field.type === 'object') {
                  // For object fields, toggle all non-object leaf children
                  const leafPaths = collectNonObjectLeaves(field);
                  
                  // Check if all leaves are currently selected
                  const allLeavesSelected = leafPaths.every(leafPath => newSelected.has(leafPath));
                  
                  if (allLeavesSelected) {
                    // Remove all leaves
                    leafPaths.forEach(leafPath => newSelected.delete(leafPath));
                  } else {
                    // Add all leaves
                    leafPaths.forEach(leafPath => newSelected.add(leafPath));
                  }
                } else {
                  // For non-object fields, toggle normally
                  if (newSelected.has(path)) {
                    newSelected.delete(path);
                  } else {
                    newSelected.add(path);
                  }
                }
                
                setSelectedFields(newSelected);
              }}
              onExpandToggle={(path) => {
                const newExpanded = new Set(expandedFields);
                if (newExpanded.has(path)) {
                  newExpanded.delete(path);
                } else {
                  newExpanded.add(path);
                }
                setExpandedFields(newExpanded);
              }}
              onSearchChange={setFieldSearchQuery}
              onSelectAllChange={(checked) => {
                if (checked) {
                  // Select all leaf fields
                  const allLeafPaths = new Set<string>();
                  const collectLeafPaths = (fields: FieldNode[]) => {
                    fields.forEach(field => {
                      if (field.type !== 'object' || !field.children || field.children.length === 0) {
                        allLeafPaths.add(field.path);
                      }
                      if (field.children) {
                        collectLeafPaths(field.children);
                      }
                    });
                  };
                  collectLeafPaths(inferredFields);
                  setSelectedFields(allLeafPaths);
                } else {
                  setSelectedFields(new Set());
                }
              }}
              onClearAll={() => {
                setInferredFields([]);
                setSelectedFields(new Set());
                setFieldSearchQuery('');
              }}
              onInferFields={handleInferFields}
              inferring={inferring}
            />
          </TabsContent>
          
          <TabsContent value="columns" className="h-full overflow-hidden m-0">
            <ColumnsTab
              selectedFields={selectedFields}
              inferredFields={inferredFields}
              manualColumns={manualColumns}
              fieldColumnOverrides={fieldColumnOverrides}
              onManualColumnsChange={setManualColumns}
              onFieldColumnOverridesChange={setFieldColumnOverrides}
              onClearAll={() => {
                setSelectedFields(new Set());
                setManualColumns([]);
                setFieldColumnOverrides({});
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}