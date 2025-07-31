# Universal Profile Management System for OpenFin Views

## Overview

The Profile Management System provides a consistent way to save, load, and manage user configurations across all UI components in the OpenFin workspace. Each view instance maintains its own set of profiles, allowing users to quickly switch between different configurations.

### Key Benefits

- **Persistent State**: Save and restore component configurations across sessions
- **Multiple Profiles**: Create different profiles for different use cases (e.g., trading vs monitoring)
- **Version Control**: Track profile changes with built-in versioning
- **Seamless Integration**: Works with existing OpenFin view system
- **Type Safety**: Full TypeScript support with component-specific types

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenFin Workspace                        │
├─────────────────────────────────────────────────────────────┤
│  View Instance (with unique ID from query parameter)        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              UI Component (e.g., DataGridStomp)      │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │         useProfileManagement Hook             │  │   │
│  │  │  - Loads profiles for view instance          │  │   │
│  │  │  - Manages active profile                    │  │   │
│  │  │  - Handles save/load operations              │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  UnifiedConfig with:                                         │
│  - configId: View instance ID                               │
│  - componentType: Component name                            │
│  - settings[]: Array of profile versions                    │
│  - activeSetting: Current profile ID                        │
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### View Instance ID

Every OpenFin view receives a unique ID via query parameter:
```
http://localhost:5174/datagrid-stomp?id=a3f2c1b8-9d4e-4a6b-8c2d-1e3f4a5b6c7d
```

This ID serves as the `configId` in the storage system, ensuring each view instance has isolated profiles.

### Profile Versioning

Profiles are stored as versions in the `settings[]` array:
- Each profile is a `ConfigVersion` object
- Contains profile name, configuration data, and metadata
- Supports version history and rollback

### Component-Agnostic Design

The system provides:
- Base interfaces for common functionality
- Extension points for component-specific data
- Reusable UI components
- Consistent user experience

## Implementation Guide

### Step 1: Read View Instance ID

```typescript
// In your component
const getViewInstanceId = (): string => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || generateDefaultId();
};
```

### Step 2: Define Component Profile Interface

```typescript
// Extend the base profile interface
interface MyComponentProfile extends BaseProfile {
  // Component-specific fields
  selectedDataSource?: string;
  gridState?: any;
  customSettings?: {
    refreshInterval: number;
    theme: string;
  };
}
```

### Step 3: Use Profile Management Hook

```typescript
const MyComponent = () => {
  const viewInstanceId = getViewInstanceId();
  
  const {
    profiles,
    activeProfile,
    isLoading,
    saveProfile,
    loadProfile,
    deleteProfile,
    createProfile,
    setActiveProfile
  } = useProfileManagement<MyComponentProfile>({
    viewInstanceId,
    componentType: 'MyComponent',
    defaultProfile: {
      name: 'Default',
      autoLoad: true,
      // ... default values
    }
  });
  
  // Component logic...
};
```

### Step 4: Add Profile UI Controls

```typescript
<ProfileToolbar>
  <ProfileSelector 
    profiles={profiles}
    activeProfileId={activeProfile?.versionId}
    onProfileChange={setActiveProfile}
  />
  <Button onClick={() => saveProfile(currentState)}>Save</Button>
  <Button onClick={() => saveProfile(currentState, true)}>Save As...</Button>
</ProfileToolbar>
```

## Profile Structure

### Base Profile Interface

```typescript
interface BaseProfile {
  // Identity
  name: string;
  description?: string;
  
  // Behavior
  autoLoad: boolean;
  isDefault?: boolean;
  
  // Metadata
  tags?: string[];
  category?: string;
}
```

### Component Extensions

Each component extends the base profile with specific needs:

```typescript
// DataGrid Profile
interface DataGridProfile extends BaseProfile {
  selectedProviderId?: string;
  autoConnect: boolean;
  columnState?: any;
  filterModel?: any;
  sortModel?: any;
  sidebarVisible: boolean;
}

// Chart Profile
interface ChartProfile extends BaseProfile {
  chartType: string;
  indicators: string[];
  timeframe: string;
  symbolList: string[];
}
```

### Storage Schema

Profiles are stored using the UnifiedConfig structure:

```typescript
{
  configId: "view-instance-uuid",
  componentType: "DataGridStomp",
  componentSubType: "trading",
  name: "DataGrid Configuration",
  config: {}, // Optional metadata
  settings: [
    {
      versionId: "profile-uuid-1",
      versionNumber: 1,
      name: "Morning Trading",
      config: { /* profile data */ },
      createdTime: "2024-01-01T09:00:00Z",
      createdBy: "user123",
      isActive: true
    },
    {
      versionId: "profile-uuid-2",
      versionNumber: 2,
      name: "Afternoon Monitoring",
      config: { /* profile data */ },
      createdTime: "2024-01-01T14:00:00Z",
      createdBy: "user123",
      isActive: false
    }
  ],
  activeSetting: "profile-uuid-1"
}
```

## React Hook API

### useProfileManagement Hook

```typescript
interface UseProfileManagementOptions<T extends BaseProfile> {
  viewInstanceId: string;
  componentType: string;
  componentSubType?: string;
  defaultProfile: T;
  autoSaveInterval?: number; // Auto-save every N seconds
  onProfileChange?: (profile: T) => void;
}

interface UseProfileManagementResult<T extends BaseProfile> {
  // Profile data
  profiles: ConfigVersion[];
  activeProfile: ConfigVersion | null;
  activeProfileData: T | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  
  // Operations
  saveProfile: (data: T, saveAsNew?: boolean, name?: string) => Promise<void>;
  loadProfile: (versionId: string) => Promise<void>;
  deleteProfile: (versionId: string) => Promise<void>;
  createProfile: (name: string, data: T) => Promise<void>;
  setActiveProfile: (versionId: string) => Promise<void>;
  
  // Utilities
  exportProfile: (versionId: string) => Promise<string>;
  importProfile: (jsonData: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
}
```

### Usage Example

```typescript
const DataGridStomp = () => {
  const viewInstanceId = getViewInstanceId();
  const [gridState, setGridState] = useState<GridState>({});
  
  const {
    profiles,
    activeProfileData,
    saveProfile,
    setActiveProfile
  } = useProfileManagement<DataGridProfile>({
    viewInstanceId,
    componentType: 'DataGridStomp',
    defaultProfile: {
      name: 'Default',
      autoLoad: true,
      autoConnect: false,
      sidebarVisible: true
    },
    onProfileChange: (profile) => {
      // Apply profile settings
      applyProfileSettings(profile);
    }
  });
  
  // Save current state
  const handleSave = async () => {
    const currentProfile: DataGridProfile = {
      ...activeProfileData,
      gridState: captureGridState(),
      // ... other current values
    };
    await saveProfile(currentProfile);
  };
  
  return (
    <div>
      <ProfileSelector
        profiles={profiles}
        onSelect={setActiveProfile}
      />
      {/* Component UI */}
    </div>
  );
};
```

## UI Components

### ProfileSelector

A dropdown component for switching between profiles:

```typescript
interface ProfileSelectorProps {
  profiles: ConfigVersion[];
  activeProfileId?: string;
  onProfileChange: (versionId: string) => void;
  onManageProfiles?: () => void;
}
```

### ProfileManagementDialog

A dialog for comprehensive profile management:

```typescript
interface ProfileManagementDialogProps {
  profiles: ConfigVersion[];
  activeProfileId?: string;
  onSave: (profile: any, name: string) => Promise<void>;
  onDelete: (versionId: string) => Promise<void>;
  onRename: (versionId: string, newName: string) => Promise<void>;
  onSetDefault: (versionId: string) => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onExport: (versionId: string) => void;
}
```

### ProfileToolbar

A toolbar component with common profile actions:

```typescript
interface ProfileToolbarProps {
  onSave: () => void;
  onSaveAs: () => void;
  onManage: () => void;
  isSaving?: boolean;
  lastSaved?: Date;
}
```

## Example Implementations

### DataGridStomp Profile

```typescript
interface DataGridStompProfile extends BaseProfile {
  // Data source
  selectedProviderId: string | null;
  autoConnect: boolean;
  
  // Grid configuration
  columnState?: any;
  filterModel?: any;
  sortModel?: any;
  groupModel?: any;
  
  // UI preferences
  sidebarVisible: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Performance settings
  asyncTransactionWaitMillis: number;
  rowBuffer: number;
  
  // Custom settings
  messageCountLimit?: number;
  updateFrequency?: number;
}
```

### DataTable Profile

```typescript
interface DataTableProfile extends BaseProfile {
  // Connection
  selectedProviderId: string | null;
  autoConnect: boolean;
  
  // Table configuration  
  columnDefs: any[];
  defaultColDef: any;
  
  // Display settings
  animateRows: boolean;
  rowHeight: number;
  headerHeight: number;
  
  // Features
  enableRangeSelection: boolean;
  enableCharts: boolean;
  sideBar: boolean | any;
}
```

### Generic Component Profile

For simpler components:

```typescript
interface GenericComponentProfile extends BaseProfile {
  // Store any component state
  componentState: Record<string, any>;
  
  // Common UI preferences
  theme?: string;
  layout?: string;
  
  // Feature flags
  features?: Record<string, boolean>;
}
```

## Best Practices

### 1. Profile Naming

- Use descriptive names: "Morning Trading", "Risk Monitoring", "End of Day"
- Include timestamp for auto-saved profiles: "Auto-save 2024-01-15 14:30"
- Allow users to rename profiles

### 2. Default Profiles

- Always provide a sensible default profile
- Mark system defaults as non-deletable
- Allow users to reset to defaults

### 3. Auto-Save

- Implement debounced auto-save for critical changes
- Show auto-save status in UI
- Allow users to disable auto-save

### 4. Profile Migration

- Version your profile schemas
- Implement migration logic for schema changes
- Preserve user data during upgrades

### 5. Performance

- Load profiles asynchronously
- Cache active profile in memory
- Debounce profile switches

### 6. Security

- Validate profile data before applying
- Sanitize imported profiles
- Respect workspace permissions

## Migration Guide

### For Existing Components

1. **Identify State to Persist**
   - Component configuration
   - User preferences
   - UI state

2. **Define Profile Interface**
   ```typescript
   interface YourComponentProfile extends BaseProfile {
     // Your component's state
   }
   ```

3. **Integrate Hook**
   - Add `useProfileManagement` hook
   - Connect to component state
   - Add profile UI controls

4. **Test Profile Operations**
   - Save/load profiles
   - Switch between profiles
   - Import/export profiles

### Component Checklist

- [ ] Read view instance ID from query parameter
- [ ] Define profile interface extending BaseProfile
- [ ] Integrate useProfileManagement hook
- [ ] Add ProfileSelector to UI
- [ ] Implement profile save/load logic
- [ ] Test profile switching
- [ ] Document component-specific profile fields
- [ ] Add profile management to user documentation

## Future Enhancements

### Planned Features

1. **Profile Sharing**
   - Share profiles between users
   - Profile marketplace
   - Team profile templates

2. **Cloud Sync**
   - Sync profiles across devices
   - Backup to cloud storage
   - Profile versioning in cloud

3. **Advanced Features**
   - Profile scheduling (auto-switch by time)
   - Conditional profiles (based on market conditions)
   - Profile inheritance and composition

4. **Analytics**
   - Track profile usage
   - Recommend profiles based on usage patterns
   - A/B testing with profiles

## Support and Troubleshooting

### Common Issues

1. **Profile Not Loading**
   - Check view instance ID is being read correctly
   - Verify StorageClient is configured
   - Check browser console for errors

2. **Profile Not Saving**
   - Ensure proper permissions
   - Check profile data size limits
   - Verify network connectivity

3. **Profile Conflicts**
   - Handle concurrent edits
   - Implement conflict resolution
   - Show clear error messages

### Debug Mode

Enable debug logging:
```typescript
const { profiles, error } = useProfileManagement({
  // ... options
  debug: true // Logs all profile operations
});
```

### Support Channels

- GitHub Issues: Report bugs and feature requests
- Documentation: Check the wiki for detailed guides
- Community Forum: Ask questions and share profiles