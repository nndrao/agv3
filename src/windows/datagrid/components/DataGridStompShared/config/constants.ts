// Snapshot modes
export const SNAPSHOT_MODES = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  RECEIVING: 'receiving',
  COMPLETE: 'complete'
} as const;

// Connection timeouts
export const CONNECTION_TIMEOUTS = {
  SNAPSHOT: 60000, // 60 seconds
  REQUEST: 30000,  // 30 seconds
  RECONNECT: 5000  // 5 seconds
};

// UI constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  GRID_REFRESH_DELAY: 100,
  THEME_TRANSITION_DELAY: 50,
  TITLE_RESTORE_DELAY: 1000
};

// Local storage keys
export const STORAGE_KEYS = {
  VIEW_TITLE: (viewId: string) => `viewTitle_${viewId}`,
  ACTIVE_PROFILE: (viewId: string) => `activeProfile_${viewId}`
};

// Component types for profile management
export const COMPONENT_TYPE = 'DataGridStompShared';