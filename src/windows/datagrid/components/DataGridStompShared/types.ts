import { ColDef, GridApi } from "ag-grid-community";
import { BaseProfile } from "@/hooks/useProfileManagement";

// Row data interface
export interface RowData {
  [key: string]: any;
}

// Profile interface for DataGridStompShared
export interface DataGridStompSharedProfile extends BaseProfile {
  // Data source
  selectedProviderId: string | null;
  autoConnect: boolean;
  
  // Grid configuration
  columnState?: any;
  filterModel?: any;
  sortModel?: any;
  groupModel?: any;
  columnGroups?: any[]; // Column group definitions
  
  // UI preferences
  sidebarVisible: boolean;
  theme: 'light' | 'dark' | 'system';
  showColumnSettings: boolean;
  
  // Performance settings
  asyncTransactionWaitMillis: number;
  rowBuffer: number;
  
  // Custom settings
  messageCountLimit?: number;
  updateFrequency?: number;
  
  // Grid options (AG-Grid options)
  gridOptions?: Record<string, any>;
}

// Snapshot mode types
export type SnapshotMode = 'idle' | 'requesting' | 'receiving' | 'complete';

// Connection state interface
export interface ConnectionState {
  isConnected: boolean;
  currentClientId: string;
  isConnecting: boolean;
  wasManuallyDisconnected: boolean;
  hasShownDisconnectAlert: boolean;
}

// Snapshot data interface
export interface SnapshotData {
  mode: SnapshotMode;
  data: RowData[];
  messageCount: number;
  isComplete: boolean;
}

// Provider configuration interface
export interface ProviderConfig {
  websocketUrl: string;
  listenerTopic: string;
  requestMessage?: string;
  requestBody?: string;
  snapshotEndToken?: string;
  keyColumn?: string;
  messageRate?: string;
  snapshotTimeoutMs?: number;
  columnDefinitions?: ColDef[];
}

// Grid state interface
export interface GridState {
  gridApi: GridApi<RowData> | null;
  columnDefs: ColDef<RowData>[];
  rowData: RowData[];
}

// Theme state interface
export interface ThemeState {
  isDarkMode: boolean;
  className: string;
}

// Handler props interfaces
export interface ToolbarProps {
  connectionState: ConnectionState;
  selectedProviderId: string | null;
  onProviderChange: (providerId: string | null) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  profiles: any[];
  activeProfile: any;
  profilesLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges?: boolean;
  onProfileLoad: (versionId: string) => void;
  onProfileSave: () => void;
  onOpenSaveDialog: () => void;
  onOpenProfileDialog: () => void;
  sidebarVisible: boolean;
  onSidebarToggle: (visible: boolean) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onOpenRenameDialog: () => void;
  onOpenGridOptions: () => void;
  onOpenColumnGroups: () => void;
  viewInstanceId: string;
}

export interface BusyIndicatorProps {
  mode: SnapshotMode;
  messageCount: number;
}

export interface DataGridProps {
  theme: any;
  rowData: RowData[];
  columnDefs: ColDef<RowData>[];
  defaultColDef: ColDef<RowData>;
  sidebarVisible: boolean;
  onGridReady: (params: any) => void;
  getRowId: (params: any) => string;
  statusBarConfig: any;
  connectionState: ConnectionState;
  snapshotData: SnapshotData;
  gridOptions?: Record<string, any>;
}