import React, { useState, useEffect, useRef } from "react";
import { ModuleRegistry, themeQuartz, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { AgGridReact } from "ag-grid-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon, Sun, Play, Square, Save, Loader2, ChevronDown } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ProviderSelector } from "../../datatable/components/ProviderSelector";
import { StorageClient } from "../../../services/storage/storageClient";
import { StompClient, StompClientConfig } from "../../../services/stomp/StompClient";
import { useToast } from "@/hooks/use-toast";
import { getViewInstanceId } from "@/utils/viewUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import "@/index.css";

ModuleRegistry.registerModules([AllEnterpriseModule]);

// Simple profile structure
interface Profile {
  id: string;
  name: string;
  providerId?: string;
  autoConnect: boolean;
  gridState?: {
    columns?: any;
    filters?: any;
    sort?: any;
  };
  sidebarVisible?: boolean;
  showColumnSettings?: boolean;
}

interface ProfileStore {
  profiles: Profile[];
  activeProfileId: string;
}

interface RowData {
  [key: string]: any;
}

// Theme configuration
const theme = themeQuartz
  .withParams(
    {
      accentColor: "#8AAAA7",
      backgroundColor: "#E6E6E6",
      borderColor: "#23202029",
      browserColorScheme: "light",
      buttonBorderRadius: 2,
      cellTextColor: "#000000",
      fontSize: 14,
      headerBackgroundColor: "#D9D9D9D6",
      headerFontSize: 14,
      headerFontWeight: 500,
      oddRowBackgroundColor: "#DCDCDCE8",
      spacing: 6,
    },
    "light"
  )
  .withParams(
    {
      accentColor: "#8AAAA7",
      backgroundColor: "#171717",
      browserColorScheme: "dark",
      chromeBackgroundColor: {
        ref: "foregroundColor",
        mix: 0.07,
        onto: "backgroundColor",
      },
      fontSize: 14,
      foregroundColor: "#FFF",
      headerFontSize: 14,
      oddRowBackgroundColor: "#1f1f1f",
      spacing: 6,
    },
    "dark"
  );

function setDarkMode(enabled: boolean) {
  document.body.dataset.agThemeMode = enabled ? "dark" : "light";
}

export const DataGridStompSimplified = () => {
  const { theme: appTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const viewInstanceId = getViewInstanceId();
  
  // Core state
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [columnDefs, setColumnDefs] = useState<ColDef<RowData>[]>([]);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [snapshotMode, setSnapshotMode] = useState<'idle' | 'requesting' | 'receiving' | 'complete'>('idle');
  
  // Profile state
  const [profileStore, setProfileStore] = useState<ProfileStore>(() => {
    const stored = localStorage.getItem(`profiles_${viewInstanceId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored profiles:', e);
      }
    }
    
    // Default profile
    const defaultProfile: Profile = {
      id: 'default',
      name: 'Default',
      autoConnect: false,
      sidebarVisible: false,
      showColumnSettings: false
    };
    
    return {
      profiles: [defaultProfile],
      activeProfileId: 'default'
    };
  });
  
  // Dialog state
  const [showNewProfileDialog, setShowNewProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  
  // Refs
  const gridApiRef = useRef<GridApi<RowData> | null>(null);
  const stompClientRef = useRef<StompClient | null>(null);
  const wasManuallyDisconnected = useRef(false);
  
  // Get active profile
  const activeProfile = profileStore.profiles.find(p => p.id === profileStore.activeProfileId);
  
  // Dark mode
  const isDarkMode = appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  useEffect(() => {
    setDarkMode(isDarkMode);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  
  // Save profiles to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`profiles_${viewInstanceId}`, JSON.stringify(profileStore));
  }, [profileStore, viewInstanceId]);
  
  // Load provider config
  useEffect(() => {
    if (!selectedProviderId) {
      setProviderConfig(null);
      return;
    }
    
    loadProviderConfig(selectedProviderId);
  }, [selectedProviderId]);
  
  // Apply profile on load
  useEffect(() => {
    if (activeProfile) {
      if (activeProfile.providerId) {
        setSelectedProviderId(activeProfile.providerId);
      }
      setSidebarVisible(activeProfile.sidebarVisible || false);
      setShowColumnSettings(activeProfile.showColumnSettings || false);
      
      // Apply grid state if grid is ready
      if (gridApiRef.current && activeProfile.gridState) {
        applyGridState(activeProfile.gridState);
      }
    }
  }, [activeProfile?.id]); // Only re-run when profile ID changes
  
  // Auto-connect if enabled
  useEffect(() => {
    if (activeProfile?.autoConnect && providerConfig && !isConnected && !wasManuallyDisconnected.current) {
      connectToStomp();
    }
  }, [providerConfig, activeProfile?.autoConnect]);
  
  const loadProviderConfig = async (providerId: string) => {
    try {
      const config = await StorageClient.get(providerId);
      if (config) {
        const stompConfig = config.config || config;
        setProviderConfig(stompConfig);
        
        // Set column definitions if available
        if (stompConfig.columns && Array.isArray(stompConfig.columns)) {
          const colDefs = stompConfig.columns.map((col: any) => ({
            field: col.field,
            headerName: col.headerName || col.field,
            ...col
          }));
          setColumnDefs(colDefs);
        }
      }
    } catch (error) {
      console.error('Failed to load provider config:', error);
      toast({
        title: "Error",
        description: "Failed to load provider configuration",
        variant: "destructive"
      });
    }
  };
  
  const connectToStomp = async () => {
    if (!providerConfig || isConnected || stompClientRef.current) {
      return;
    }
    
    wasManuallyDisconnected.current = false;
    
    try {
      const stompConfig: StompClientConfig = {
        websocketUrl: providerConfig.websocketUrl,
        listenerTopic: providerConfig.listenerTopic,
        requestMessage: providerConfig.requestMessage,
        requestBody: providerConfig.requestBody,
        snapshotEndToken: providerConfig.snapshotEndToken,
        keyColumn: providerConfig.keyColumn,
        snapshotTimeoutMs: providerConfig.snapshotTimeoutMs || 60000
      };
      
      const client = new StompClient(stompConfig);
      stompClientRef.current = client;
      
      await client.connect();
      setIsConnected(true);
      
      // Get snapshot
      setSnapshotMode('requesting');
      const snapshotData: RowData[] = [];
      
      await client.getSnapshot((batch) => {
        snapshotData.push(...batch);
        setMessageCount(prev => prev + batch.length);
        setSnapshotMode('receiving');
      });
      
      setRowData(snapshotData);
      setSnapshotMode('complete');
      
      toast({
        title: "Connected",
        description: `Connected and received ${snapshotData.length} records`
      });
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive"
      });
      
      if (stompClientRef.current) {
        stompClientRef.current.disconnect();
        stompClientRef.current = null;
      }
      setIsConnected(false);
    }
  };
  
  const disconnectFromStomp = () => {
    if (stompClientRef.current) {
      stompClientRef.current.disconnect();
      stompClientRef.current = null;
      setIsConnected(false);
      setSnapshotMode('idle');
      wasManuallyDisconnected.current = true;
      toast({
        title: "Disconnected",
        description: "Disconnected from STOMP server"
      });
    }
  };
  
  const applyGridState = (gridState: any) => {
    if (!gridApiRef.current) return;
    
    try {
      if (gridState.columns) {
        gridApiRef.current.applyColumnState({
          state: gridState.columns,
          applyOrder: true
        });
      }
      if (gridState.filters) {
        gridApiRef.current.setFilterModel(gridState.filters);
      }
      if (gridState.sort && gridApiRef.current.setSortModel) {
        gridApiRef.current.setSortModel(gridState.sort);
      }
    } catch (error) {
      console.warn('Error applying grid state:', error);
    }
  };
  
  const getGridState = () => {
    if (!gridApiRef.current) return null;
    
    try {
      return {
        columns: gridApiRef.current.getColumnState(),
        filters: gridApiRef.current.getFilterModel(),
        sort: gridApiRef.current.getSortModel ? gridApiRef.current.getSortModel() : null
      };
    } catch (error) {
      console.warn('Error getting grid state:', error);
      return null;
    }
  };
  
  const saveCurrentProfile = () => {
    const currentProfile = profileStore.profiles.find(p => p.id === profileStore.activeProfileId);
    if (!currentProfile) return;
    
    const gridState = getGridState();
    const updatedProfile: Profile = {
      ...currentProfile,
      providerId: selectedProviderId || undefined,
      autoConnect: isConnected,
      sidebarVisible,
      showColumnSettings,
      gridState: gridState || undefined
    };
    
    setProfileStore(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => 
        p.id === prev.activeProfileId ? updatedProfile : p
      )
    }));
    
    toast({
      title: "Profile Saved",
      description: `Saved profile "${currentProfile.name}"`
    });
  };
  
  const createNewProfile = () => {
    if (!newProfileName.trim()) return;
    
    const newProfile: Profile = {
      id: `profile-${Date.now()}`,
      name: newProfileName,
      providerId: selectedProviderId || undefined,
      autoConnect: false,
      sidebarVisible,
      showColumnSettings,
      gridState: getGridState() || undefined
    };
    
    setProfileStore(prev => ({
      profiles: [...prev.profiles, newProfile],
      activeProfileId: newProfile.id
    }));
    
    setNewProfileName('');
    setShowNewProfileDialog(false);
    
    toast({
      title: "Profile Created",
      description: `Created new profile "${newProfile.name}"`
    });
  };
  
  const selectProfile = (profileId: string) => {
    setProfileStore(prev => ({
      ...prev,
      activeProfileId: profileId
    }));
  };
  
  const deleteProfile = (profileId: string) => {
    if (profileStore.profiles.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one profile",
        variant: "destructive"
      });
      return;
    }
    
    setProfileStore(prev => {
      const newProfiles = prev.profiles.filter(p => p.id !== profileId);
      const newActiveId = prev.activeProfileId === profileId 
        ? newProfiles[0].id 
        : prev.activeProfileId;
      
      return {
        profiles: newProfiles,
        activeProfileId: newActiveId
      };
    });
  };
  
  const onGridReady = (params: GridReadyEvent<RowData>) => {
    gridApiRef.current = params.api;
    
    // Apply saved grid state
    if (activeProfile?.gridState) {
      applyGridState(activeProfile.gridState);
    }
  };
  
  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'dark' : 'light'}`} data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Toolbar */}
      <div className="h-14 border-b bg-background flex items-center px-4 gap-2">
        {/* Profile selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {activeProfile?.name || 'Select Profile'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Profiles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profileStore.profiles.map(profile => (
              <DropdownMenuItem 
                key={profile.id}
                onClick={() => selectProfile(profile.id)}
                className={profile.id === activeProfile?.id ? 'bg-accent' : ''}
              >
                {profile.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowNewProfileDialog(true)}>
              New Profile...
            </DropdownMenuItem>
            {profileStore.profiles.length > 1 && (
              <DropdownMenuItem 
                onClick={() => deleteProfile(activeProfile!.id)}
                className="text-destructive"
              >
                Delete Current Profile
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button
          onClick={saveCurrentProfile}
          disabled={!activeProfile}
          variant="ghost"
          size="sm"
          title="Save current profile"
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <div className="h-6 w-px bg-border" />
        
        {/* Provider selection */}
        <ProviderSelector
          value={selectedProviderId}
          onChange={(id) => {
            setSelectedProviderId(id);
            wasManuallyDisconnected.current = false;
          }}
        />
        
        <Button
          onClick={isConnected ? disconnectFromStomp : connectToStomp}
          disabled={!selectedProviderId}
          variant={isConnected ? "destructive" : "default"}
          size="sm"
          className="gap-2"
        >
          {isConnected ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
        
        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-muted-foreground">
            {isConnected ? `Connected • ${messageCount} messages` : 'Disconnected'}
            {snapshotMode !== 'idle' && snapshotMode !== 'complete' && ` • ${snapshotMode}`}
          </span>
        </div>
        
        <div className="flex-1" />
        
        {/* Sidebar toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="sidebar-toggle"
            checked={sidebarVisible}
            onCheckedChange={setSidebarVisible}
          />
          <Label htmlFor="sidebar-toggle" className="text-sm">Sidebar</Label>
        </div>
        
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
          className="gap-2"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Grid */}
      <div className="flex-1 ag-theme-custom">
        <AgGridReact<RowData>
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            flex: 1,
            minWidth: 100,
            filter: true,
            sortable: true,
            resizable: true,
            enableCellChangeFlash: true
          }}
          getRowId={(params) => {
            const keyColumn = providerConfig?.keyColumn || 'id';
            return params.data[keyColumn]?.toString() || `row-${Math.random()}`;
          }}
          onGridReady={onGridReady}
          sideBar={sidebarVisible}
          enableRangeSelection={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          asyncTransactionWaitMillis={50}
          theme={theme}
          loadThemeGoogleFonts={true}
          suppressMenuHide={true}
          rowBuffer={10}
          statusBar={{
            statusPanels: [
              { statusPanel: 'agTotalAndFilteredRowCountComponent', align: 'left' },
              { statusPanel: 'agTotalRowCountComponent', align: 'center' },
              { statusPanel: 'agFilteredRowCountComponent', align: 'center' },
              { statusPanel: 'agSelectedRowCountComponent', align: 'center' }
            ]
          }}
        />
      </div>
      
      {/* New Profile Dialog */}
      <Dialog open={showNewProfileDialog} onOpenChange={setShowNewProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Profile name"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createNewProfile();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProfileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createNewProfile} disabled={!newProfileName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};