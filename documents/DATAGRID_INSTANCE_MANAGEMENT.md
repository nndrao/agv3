# DataGrid STOMP Instance Management

## Overview
Each DataGridStomp instance now has its own unique ID and configuration, allowing multiple independent views with separate profiles.

## How It Works

### 1. Instance Creation
When you open a DataGridStomp view:
- **Default**: Creates a numbered instance (e.g., `datagrid-stomp-instance-1`)
- **Named**: Creates an instance with a specific name (e.g., `datagrid-stomp-trading`)

### 2. Instance IDs
Each instance gets a stable ID that persists across workspace reloads:
- `datagrid-stomp-instance-1` → First unnamed instance
- `datagrid-stomp-instance-2` → Second unnamed instance
- `datagrid-stomp-trading` → Named instance "Trading"
- `datagrid-stomp-monitoring` → Named instance "Monitoring"

### 3. Profile Storage
Profiles are stored using the instance ID as the key:
```
Storage Key: datagrid-stomp-instance-1
├── Profile: Default
├── Profile: Trading Setup
└── Profile: Risk Monitoring

Storage Key: datagrid-stomp-trading
├── Profile: Default
├── Profile: Morning Config
└── Profile: EOD Analysis
```

## API Usage

### Open Default Instance
```typescript
// Opens a new numbered instance or focuses existing
await WindowManager.openDataGridStomp();
```

### Open Named Instance
```typescript
// Opens or focuses a named instance
await WindowManager.openDataGridStomp('Trading View');
await WindowManager.openDataGridStomp('Risk Monitor');
```

### Get All Instances
```typescript
const instances = WindowManager.getDataGridStompInstances();
// Returns: [
//   { id: 'datagrid-stomp-instance-1', name: 'DataGrid STOMP 1', ... },
//   { id: 'datagrid-stomp-trading', name: 'Trading View', ... }
// ]
```

## Benefits

1. **Multiple Views**: Have different DataGrid views for different purposes
2. **Independent Profiles**: Each instance maintains its own set of profiles
3. **Persistence**: Instance IDs are stable across workspace reloads
4. **Named Instances**: Create meaningful names for specific use cases

## Use Cases

### Trading Floor Setup
```typescript
// Morning trading view
await WindowManager.openDataGridStomp('Morning Trading');
// Configure with specific columns, filters, data sources

// Risk monitoring view
await WindowManager.openDataGridStomp('Risk Monitor');
// Different configuration for risk analysis

// EOD reporting view
await WindowManager.openDataGridStomp('EOD Reports');
// Setup for end-of-day reporting
```

### Development/Testing
```typescript
// Production data view
await WindowManager.openDataGridStomp('Production');

// Test environment view
await WindowManager.openDataGridStomp('Testing');

// Each maintains separate configurations
```

## Instance Manager Component

The `DataGridStompManager` component provides a UI for:
- Viewing all instances
- Creating new named instances
- Opening existing instances
- Managing instance lifecycle

## Technical Details

### Instance Storage
Instances are persisted in localStorage:
```json
{
  "agv3-view-instances": [
    {
      "id": "datagrid-stomp-instance-1",
      "name": "DataGrid STOMP 1",
      "type": "DataGridStomp",
      "createdAt": "2025-07-21T12:00:00Z"
    },
    {
      "id": "datagrid-stomp-trading",
      "name": "Trading View",
      "type": "DataGridStomp",
      "createdAt": "2025-07-21T12:05:00Z"
    }
  ]
}
```

### View Lifecycle
1. **Create**: New instance ID generated based on name or number
2. **Open**: View created with unique ID in query parameter
3. **Focus**: If view exists, it's focused instead of recreated
4. **Persist**: Instance info saved to localStorage
5. **Reload**: On workspace reload, same IDs are used

This ensures each DataGridStomp instance maintains its own identity and configuration across sessions.