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
  isActive?: boolean; // Whether this group is actively applied to the grid
}

export interface ColumnDefinition {
  colId: string;
  field: string;
  headerName: string;
  isGrouped: boolean;
  groupId?: string;
}

export interface ColumnGroupConfiguration {
  version: string;
  groups: ColumnGroupDefinition[];
  timestamp: number;
}

import { ColDef } from 'ag-grid-community';

export interface ColumnGroupEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gridApi: any; // AG-Grid API instance
  columnApi: any; // AG-Grid Column API instance
  columnDefs: ColDef[]; // Column definitions
  onApply: (groups: ColumnGroupDefinition[]) => void;
}

export interface ColumnGroupEditorContentProps {
  gridApi: any;
  columnApi: any;
  columnDefs: ColDef[]; // Column definitions
  currentGroups?: ColumnGroupDefinition[]; // Current column groups
  onApply: (groups: ColumnGroupDefinition[]) => void;
  onClose: () => void;
}