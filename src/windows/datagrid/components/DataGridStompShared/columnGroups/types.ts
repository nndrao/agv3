// Column Group Editor Types
export interface ColumnGroupDefinition {
  groupId: string;
  headerName: string;
  children: string[]; // Column IDs
  openByDefault?: boolean;
  marryChildren?: boolean;
  openState?: 'open' | 'closed' | 'undefined'; // Group open state
  // Map of column ID to columnGroupShow value
  columnStates?: Record<string, 'open' | 'closed' | undefined>;
  createdAt: number; // Timestamp when group was created
  updatedAt: number; // Timestamp when group was last modified
  description?: string; // Optional description for the group
}

export interface ColumnDefinition {
  colId: string;
  field: string;
  headerName: string;
  isGrouped: boolean;
  groupId?: string;
}

// Grid-level column group storage
export interface ColumnGroupConfiguration {
  version: string;
  groups: ColumnGroupDefinition[];
  timestamp: number;
}

// Profile-level column group reference
export interface ProfileColumnGroupReference {
  groupId: string;
  isActive: boolean; // Whether this group is active in this profile
  customOpenState?: boolean; // Profile-specific override for openByDefault
}

import { ColDef } from 'ag-grid-community';

export interface ColumnGroupEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gridApi: any; // AG-Grid API instance
  columnApi: any; // AG-Grid Column API instance
  columnDefs: ColDef[]; // Column definitions
  onApply: (activeGroupIds: string[], allGroups: ColumnGroupDefinition[]) => void;
}

export interface ColumnGroupEditorContentProps {
  gridApi: any;
  columnApi: any;
  columnDefs: ColDef[]; // Column definitions
  currentGroups?: ColumnGroupDefinition[]; // All available column groups
  activeGroupIds?: string[]; // Currently active group IDs for this profile
  onApply: (activeGroupIds: string[], allGroups: ColumnGroupDefinition[]) => void;
  onClose: () => void;
}