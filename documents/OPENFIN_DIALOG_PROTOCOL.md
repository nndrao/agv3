# OpenFin Dialog Communication Protocol

## Overview

This document describes the robust one-to-one communication protocol for OpenFin dialog windows in the AGV3 application. This protocol replaces the problematic React Portal approach with a clean, route-based dialog system using OpenFin's Inter-Application Bus (IAB).

## Architecture

### Key Components

1. **OpenFinDialogService** (`/src/services/openfin/OpenFinDialogService.ts`)
   - Singleton service managing all dialog operations
   - Handles parent-child communication via IAB
   - Provides automatic cleanup and error handling

2. **Dialog Apps** (Standalone React components)
   - GridOptionsApp (`/src/windows/grid-options/GridOptionsApp.tsx`)
   - ColumnGroupsApp (`/src/windows/column-groups/ColumnGroupsApp.tsx`)  
   - ConditionalFormattingApp (`/src/windows/conditional-formatting/ConditionalFormattingApp.tsx`)

3. **Routes** (Defined in `/src/App.tsx`)
   - `/grid-options` - Grid options dialog
   - `/column-groups` - Column groups dialog
   - `/conditional-formatting` - Conditional formatting dialog

## Communication Flow

### 1. Opening a Dialog (Parent Side)

```typescript
import { dialogService } from '@/services/openfin/OpenFinDialogService';

// Open a dialog
await dialogService.openDialog({
  name: 'unique-dialog-name',
  route: '/grid-options',
  data: {
    // Initial data for the dialog
    options: currentOptions,
    profileName: 'My Profile'
  },
  windowOptions: {
    defaultWidth: 900,
    defaultHeight: 700
  },
  onApply: (data) => {
    // Handle when user clicks Apply
    console.log('User applied:', data);
  },
  onCancel: () => {
    // Handle when user cancels
    console.log('User cancelled');
  },
  onError: (error) => {
    // Handle errors
    console.error('Dialog error:', error);
  }
});
```

### 2. Receiving Data (Child Side)

```typescript
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';

// In your dialog component
useEffect(() => {
  const initialize = async () => {
    try {
      // Initialize communication
      await initializeDialog({
        onInitialize: (data) => {
          // Receive initial data from parent
          console.log('Received data:', data);
          setInitialData(data);
        },
        getData: () => {
          // Return current data when needed
          return currentData;
        }
      });
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  };
  
  initialize();
}, []);
```

### 3. Sending Response (Child Side)

```typescript
// When user clicks Apply
const handleApply = async () => {
  try {
    await sendDialogResponse('apply', {
      // Data to send back
      updatedOptions: localOptions
    });
  } catch (error) {
    console.error('Failed to send response:', error);
  }
};

// When user clicks Cancel
const handleCancel = async () => {
  await sendDialogResponse('cancel');
};

// On error
const handleError = async (errorMessage: string) => {
  await sendDialogResponse('error', null, errorMessage);
};
```

## Message Protocol

### DialogInitRequest
Sent from parent to child with initial data:
```typescript
{
  dialogId: string;           // Unique dialog instance ID
  parentIdentity: {          // Parent window identity
    uuid: string;
    name: string;
  };
  timestamp: number;         // Request timestamp
  data: any;                // Initial data payload
}
```

### DialogResponse
Sent from child to parent with results:
```typescript
{
  dialogId: string;          // Dialog instance ID
  action: 'apply' | 'cancel' | 'error';
  timestamp: number;         // Response timestamp
  data?: any;               // Response data (for apply)
  error?: string;           // Error message (for error)
}
```

## Creating a New Dialog

### Step 1: Create the Dialog Component

Create a new file `/src/windows/my-dialog/MyDialogApp.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { initializeDialog, sendDialogResponse } from '@/services/openfin/OpenFinDialogService';
import { ThemeProvider } from '@/components/theme-provider';
import { MyDialogContent } from './MyDialogContent';
import '@/index.css';

interface MyDialogData {
  // Define your data structure
  someOption: string;
  anotherOption: number;
}

export const MyDialogApp: React.FC = () => {
  const [initialData, setInitialData] = useState<MyDialogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDialog({
          onInitialize: (data: MyDialogData) => {
            setInitialData(data);
            setIsLoading(false);
          },
          getData: () => initialData
        });
      } catch (error) {
        console.error('Initialization error:', error);
        
        // Fallback for development without OpenFin
        if (typeof fin === 'undefined') {
          setInitialData({
            someOption: 'default',
            anotherOption: 42
          });
          setIsLoading(false);
        }
      }
    };

    initialize();
  }, []);

  const handleApply = async (data: MyDialogData) => {
    try {
      await sendDialogResponse('apply', data);
    } catch (error) {
      console.error('Failed to apply:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await sendDialogResponse('cancel');
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider>
      <MyDialogContent
        initialData={initialData}
        onApply={handleApply}
        onCancel={handleCancel}
      />
    </ThemeProvider>
  );
};
```

### Step 2: Add Route

In `/src/App.tsx`:

```typescript
import { MyDialogApp } from './windows/my-dialog/MyDialogApp';

// In the Routes component
<Route 
  path="/my-dialog" 
  element={
    <div className="h-screen w-screen">
      <MyDialogApp />
    </div>
  } 
/>
```

### Step 3: Open from Parent

```typescript
const handleOpenMyDialog = async () => {
  await dialogService.openDialog({
    name: `my-dialog-${uniqueId}`,
    route: '/my-dialog',
    data: {
      someOption: 'value',
      anotherOption: 123
    },
    windowOptions: {
      defaultWidth: 800,
      defaultHeight: 600
    },
    onApply: (data) => {
      console.log('Dialog applied:', data);
      // Handle the applied data
    }
  });
};
```

## Best Practices

### 1. Unique Dialog Names
Always use unique names for dialogs to prevent conflicts:
```typescript
const dialogName = `my-dialog-${viewInstanceId}-${Date.now()}`;
```

### 2. Error Handling
Always wrap async operations in try-catch blocks:
```typescript
try {
  await dialogService.openDialog({...});
} catch (error) {
  console.error('Failed to open dialog:', error);
  // Show user-friendly error
}
```

### 3. Development Fallbacks
Provide fallback data when running without OpenFin:
```typescript
if (typeof fin === 'undefined') {
  // Use mock data for development
  setInitialData(mockData);
}
```

### 4. Cleanup
The service automatically handles cleanup, but you can manually close dialogs:
```typescript
await dialogService.closeDialog('dialog-name');
// Or close all dialogs
await dialogService.closeAllDialogs();
```

### 5. Type Safety
Define interfaces for your dialog data:
```typescript
interface GridOptionsData {
  options: Record<string, any>;
  profileName: string;
}
```

## Advantages Over React Portals

1. **No Portal Issues**: All components work naturally (ResizablePanelGroup, Select, etc.)
2. **Clean Architecture**: Each dialog is a standalone React app
3. **Better Performance**: Independent React instances, no style copying
4. **Easier Debugging**: Standard React DevTools work normally
5. **Type Safety**: Full TypeScript support for messages
6. **Automatic Cleanup**: Service handles all cleanup on window close
7. **Error Recovery**: Built-in error handling and recovery

## Migration from OpenFinPortalDialog

### Before (React Portal):
```typescript
<OpenFinPortalDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  windowName="my-dialog"
>
  <MyDialogContent {...props} />
</OpenFinPortalDialog>
```

### After (Dialog Service):
```typescript
await dialogService.openDialog({
  name: 'my-dialog',
  route: '/my-dialog',
  data: props,
  onApply: handleApply
});
```

## Troubleshooting

### Dialog Not Opening
- Check that the route is registered in App.tsx
- Verify OpenFin is available (`typeof fin !== 'undefined'`)
- Check browser console for errors

### Data Not Received
- Ensure `initializeDialog` is called in useEffect
- Check that data structure matches between parent and child
- Verify dialog IDs match in messages

### Dialog Not Closing
- Make sure to call `sendDialogResponse` before closing
- The service automatically closes windows after response
- Check for errors in console

### Multiple Dialogs Conflict
- Use unique names for each dialog instance
- Include timestamp or ID in dialog name

## API Reference

### dialogService.openDialog(config)
Opens a new dialog window with IAB communication.

**Parameters:**
- `config.name` (string): Unique dialog name
- `config.route` (string): Route path for the dialog
- `config.data` (any): Initial data to pass
- `config.windowOptions` (object): OpenFin window options
- `config.onApply` (function): Callback when applied
- `config.onCancel` (function): Callback when cancelled
- `config.onError` (function): Error callback

### initializeDialog(config)
Initializes child dialog communication.

**Parameters:**
- `config.onInitialize` (function): Receives initial data
- `config.getData` (function): Returns current data

### sendDialogResponse(action, data?, error?)
Sends response from child to parent.

**Parameters:**
- `action` ('apply' | 'cancel' | 'error'): Response action
- `data` (any): Response data for apply
- `error` (string): Error message for error action

### dialogService.closeDialog(name)
Manually closes a specific dialog.

### dialogService.closeAllDialogs()
Closes all active dialogs.

### dialogService.isDialogActive(name)
Checks if a dialog is currently open.

### dialogService.getActiveDialogCount()
Returns the number of active dialogs.

## Example Implementation

See the following files for complete examples:
- `/src/windows/grid-options/GridOptionsApp.tsx`
- `/src/windows/column-groups/ColumnGroupsApp.tsx`
- `/src/windows/conditional-formatting/ConditionalFormattingApp.tsx`
- `/src/services/openfin/OpenFinDialogService.ts`

## Support

For issues or questions about the dialog protocol, refer to:
- This documentation
- The example implementations
- The OpenFinDialogService source code