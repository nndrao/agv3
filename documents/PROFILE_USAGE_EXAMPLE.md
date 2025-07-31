# Profile Management Usage Example

This document shows how to integrate the Profile Management System into your OpenFin components.

## Quick Start Example

Here's a minimal example of adding profile management to a component:

```typescript
import React, { useState, useMemo } from 'react';
import { useProfileManagement, BaseProfile } from '@/hooks/useProfileManagement';
import { ProfileSelector } from '@/components/ProfileSelector';
import { SaveProfileDialog } from '@/components/SaveProfileDialog';
import { getViewInstanceId } from '@/utils/viewUtils';

// 1. Define your component's profile interface
interface MyComponentProfile extends BaseProfile {
  // Add your component-specific settings
  selectedOption: string;
  isFeatureEnabled: boolean;
  customSettings: {
    color: string;
    size: number;
  };
}

// 2. Your component
export function MyComponent() {
  // Component state
  const [selectedOption, setSelectedOption] = useState('default');
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(100);
  
  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  
  // Get view instance ID
  const viewInstanceId = useMemo(() => getViewInstanceId(), []);
  
  // 3. Use the profile management hook
  const {
    profiles,
    activeProfile,
    activeProfileData,
    isLoading,
    isSaving,
    saveProfile,
    loadProfile,
  } = useProfileManagement<MyComponentProfile>({
    viewInstanceId,
    componentType: 'MyComponent',
    defaultProfile: {
      name: 'Default',
      autoLoad: true,
      selectedOption: 'default',
      isFeatureEnabled: false,
      customSettings: {
        color: '#000000',
        size: 100
      }
    },
    onProfileChange: (profile) => {
      // 4. Apply profile settings when loaded
      setSelectedOption(profile.selectedOption);
      setIsFeatureEnabled(profile.isFeatureEnabled);
      setColor(profile.customSettings.color);
      setSize(profile.customSettings.size);
    }
  });
  
  // 5. Save current state function
  const saveCurrentState = async (saveAsNew: boolean, name?: string) => {
    const currentState: MyComponentProfile = {
      name: name || activeProfileData?.name || 'Profile',
      autoLoad: true,
      selectedOption,
      isFeatureEnabled,
      customSettings: {
        color,
        size
      }
    };
    
    await saveProfile(currentState, saveAsNew, name);
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      {/* 6. Add profile selector to your UI */}
      <div className="toolbar">
        <ProfileSelector
          profiles={profiles}
          activeProfileId={activeProfile?.versionId}
          onProfileChange={loadProfile}
          onCreateProfile={() => {
            setSaveAsNew(true);
            setShowSaveDialog(true);
          }}
        />
        
        <button onClick={() => saveCurrentState(false)}>
          Save Profile
        </button>
      </div>
      
      {/* Your component UI */}
      <div className="content">
        {/* Component content here */}
      </div>
      
      {/* 7. Save dialog */}
      <SaveProfileDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={(name) => {
          saveCurrentState(saveAsNew, name);
          setShowSaveDialog(false);
          setSaveAsNew(false);
        }}
        title={saveAsNew ? 'Create New Profile' : 'Save Profile'}
      />
    </div>
  );
}
```

## Key Points

1. **View Instance ID**: Always get the view ID from query parameters using `getViewInstanceId()`
2. **Profile Interface**: Extend `BaseProfile` with your component-specific fields
3. **Default Profile**: Provide sensible defaults for first-time users
4. **Profile Change Handler**: Apply profile settings when a profile is loaded
5. **Save State**: Capture current component state into the profile format
6. **UI Integration**: Add ProfileSelector and save buttons to your toolbar

## Advanced Features

### Auto-Save

Enable auto-save by passing an interval (in seconds):

```typescript
useProfileManagement({
  // ... other options
  autoSaveInterval: 300 // Auto-save every 5 minutes
});
```

### Track Unsaved Changes

```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

// Mark as changed when settings change
useEffect(() => {
  setHasUnsavedChanges(true);
}, [selectedOption, isFeatureEnabled, color, size]);

// Reset when saving
const saveCurrentState = async () => {
  // ... save logic
  setHasUnsavedChanges(false);
};
```

### Export/Import Profiles

```typescript
const handleExport = async () => {
  const exportData = await exportProfile(activeProfile.versionId);
  // Download as JSON file
  const blob = new Blob([exportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profile-${activeProfile.name}.json`;
  a.click();
};

const handleImport = async (file: File) => {
  const text = await file.text();
  await importProfile(text);
};
```

## Best Practices

1. **Profile Names**: Use descriptive names like "Morning Trading", "Analysis Mode"
2. **Auto-Connect**: For data components, save connection state in the profile
3. **Grid State**: For grids, save column state, filters, and sorts
4. **Theme Preferences**: Include UI preferences in profiles
5. **Validation**: Validate profile data before applying to prevent errors

## Troubleshooting

### Profile Not Loading
- Check that the view ID is being read correctly from query parameters
- Verify the component type matches between save and load
- Check browser console for storage errors

### Profile Not Saving
- Ensure you have proper permissions for storage
- Check that the profile name is not empty
- Verify the profile data size is within limits

### Auto-Save Not Working
- Check that autoSaveInterval is set (in seconds)
- Ensure activeProfileData is being updated
- Look for errors in the console