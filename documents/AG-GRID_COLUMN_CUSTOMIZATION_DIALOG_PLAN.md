# AG-Grid Column Customization Dialog - Comprehensive Plan

## Overview

This document outlines a comprehensive plan for implementing an advanced AG-Grid column customization dialog system. The system provides extensive customization capabilities including cell renderers, value formatters, editors, filters, styling, conditional formatting, calculated columns, and permission rules.

## UI Component Library - shadcn/ui

### Overview

All UI components in this system must be built using [shadcn/ui](https://ui.shadcn.com/) components. This ensures consistency, accessibility, and maintainability across all dialogs and interfaces.

### Component Mapping

```typescript
// Core shadcn/ui components to be used throughout the system
import {
  // Layout
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
  Separator,
  ScrollArea,
  
  // Forms
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
  Input,
  Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Checkbox,
  RadioGroup, RadioGroupItem,
  Switch,
  Textarea,
  
  // Buttons & Actions
  Button,
  Toggle,
  ToggleGroup, ToggleGroupItem,
  
  // Navigation
  Tabs, TabsContent, TabsList, TabsTrigger,
  NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
  
  // Overlays
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
  Popover, PopoverContent, PopoverTrigger,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  HoverCard, HoverCardContent, HoverCardTrigger,
  
  // Data Display
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
  Badge,
  Avatar, AvatarFallback, AvatarImage,
  
  // Feedback
  Alert, AlertDescription, AlertTitle,
  Progress,
  Skeleton,
  Toast, Toaster, useToast,
  
  // Utilities
  Collapsible, CollapsibleContent, CollapsibleTrigger,
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
  ResizableHandle, ResizablePanel, ResizablePanelGroup,
} from '@/components/ui';
```

### Component Usage Guidelines

#### 1. **Dialogs and Windows**
```typescript
// Main dialogs use Sheet or Dialog components
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent className="w-[1200px] sm:max-w-[1200px]">
    <SheetHeader>
      <SheetTitle>Column Customization</SheetTitle>
      <SheetDescription>
        Customize column properties, formatting, and behavior
      </SheetDescription>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>

// Sub-dialogs use Dialog component
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[600px]">
    {/* Content */}
  </DialogContent>
</Dialog>
```

#### 2. **Forms and Inputs**
```typescript
// All form inputs use Form components with react-hook-form
<Form {...form}>
  <FormField
    control={form.control}
    name="columnName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Column Name</FormLabel>
        <FormControl>
          <Input placeholder="Enter column name" {...field} />
        </FormControl>
        <FormDescription>
          This is the display name for the column
        </FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>

// Dropdowns use Select component
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select format" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="currency">Currency</SelectItem>
    <SelectItem value="percentage">Percentage</SelectItem>
  </SelectContent>
</Select>
```

#### 3. **Tab Navigation**
```typescript
// Main tab structure uses Tabs component
<Tabs defaultValue="general" className="w-full">
  <TabsList className="grid w-full grid-cols-5">
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="display">Display</TabsTrigger>
    <TabsTrigger value="styling">Styling</TabsTrigger>
    <TabsTrigger value="editing">Editing</TabsTrigger>
    <TabsTrigger value="filtering">Filtering</TabsTrigger>
  </TabsList>
  <TabsContent value="general" className="space-y-4">
    {/* Tab content */}
  </TabsContent>
</Tabs>
```

#### 4. **Data Display**
```typescript
// Tables use Table components
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
      <TableHead>Type</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {columns.map((column) => (
      <TableRow key={column.id}>
        <TableCell>{column.name}</TableCell>
        <TableCell>
          <Badge variant="outline">{column.type}</Badge>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="ghost">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 5. **Quick Actions Bar**
```typescript
// Action buttons use Button with variants
<div className="flex items-center gap-2">
  <ToggleGroup type="multiple" value={selectedFormats}>
    <ToggleGroupItem value="bold">
      <Bold className="h-4 w-4" />
    </ToggleGroupItem>
    <ToggleGroupItem value="italic">
      <Italic className="h-4 w-4" />
    </ToggleGroupItem>
  </ToggleGroup>
  
  <Separator orientation="vertical" className="h-6" />
  
  <Button variant="outline" size="sm">
    <Plus className="h-4 w-4 mr-2" />
    Add Rule
  </Button>
</div>
```

#### 6. **Expression Editor Integration**
```typescript
// Monaco/CodeMirror wrapped in Card component
<Card className="h-full">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium">Expression Editor</CardTitle>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Undo className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent className="p-0">
    <MonacoEditor
      height="400px"
      language="custom-expression"
      theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
    />
  </CardContent>
</Card>
```

#### 7. **Sidebars and Panels**
```typescript
// Resizable panels for editor layout
<ResizablePanelGroup direction="horizontal" className="h-full">
  <ResizablePanel defaultSize={60} minSize={40}>
    {/* Main editor */}
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel defaultSize={40} minSize={30}>
    <ScrollArea className="h-full">
      {/* Sidebar content */}
    </ScrollArea>
  </ResizablePanel>
</ResizablePanelGroup>
```

#### 8. **Feedback and Loading States**
```typescript
// Toast notifications
const { toast } = useToast();

toast({
  title: "Changes Applied",
  description: "Column formatting has been updated",
});

// Loading states with Skeleton
{isLoading ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-4 w-[300px]" />
  </div>
) : (
  <div>{content}</div>
)}

// Progress indicators
<Progress value={progress} className="w-full" />
```

### Styling Guidelines

#### 1. **Color System**
```css
/* Use CSS variables for consistent theming */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode variables */
}
```

#### 2. **Component Sizing**
```typescript
// Consistent sizing using size variants
<Button size="default" />  // h-10 px-4 py-2
<Button size="sm" />       // h-9 px-3
<Button size="lg" />       // h-11 px-8
<Button size="icon" />     // h-10 w-10

// Input sizing
<Input className="h-9" />  // Small
<Input />                  // Default h-10
<Input className="h-11" /> // Large
```

#### 3. **Spacing and Layout**
```typescript
// Use consistent spacing utilities
<div className="space-y-4">  {/* Vertical spacing */}
  <div className="flex gap-4">  {/* Horizontal spacing */}
    {/* Components */}
  </div>
</div>

// Padding and margins follow 4px grid
className="p-4"    // 16px
className="px-6"   // 24px horizontal
className="py-2"   // 8px vertical
```

#### 4. **Dark Mode Support**
```typescript
// All components automatically support dark mode
<Card className="border bg-card text-card-foreground">
  {/* Content automatically adjusts for dark mode */}
</Card>

// Custom dark mode styles when needed
<div className="bg-white dark:bg-gray-900">
  {/* Custom styling */}
</div>
```

### Accessibility

All shadcn/ui components include:
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Motion reduction support

### Custom Components

When creating custom components:
1. Extend shadcn/ui components using `cn()` utility
2. Follow the same variant pattern
3. Maintain consistent prop interfaces
4. Include proper TypeScript types

```typescript
import { cn } from "@/lib/utils"
import { Button, ButtonProps } from "@/components/ui/button"

interface CustomButtonProps extends ButtonProps {
  isLoading?: boolean;
}

export function CustomButton({ 
  isLoading, 
  children, 
  disabled,
  className,
  ...props 
}: CustomButtonProps) {
  return (
    <Button
      disabled={isLoading || disabled}
      className={cn("relative", className)}
      {...props}
    >
      {isLoading && <Spinner className="mr-2" />}
      {children}
    </Button>
  );
}

### OpenFin-Specific Component Adaptations

#### The NoPortalSelect Pattern

When using shadcn/ui components within OpenFin windows, special adaptations are required for dropdown components (Select, DropdownMenu, Popover, etc.) to prevent them from appearing in the parent window.

##### The Challenge

Standard shadcn/ui dropdown components use Radix UI's `Portal` primitive, which renders dropdown content at the document root level:

```typescript
// Standard shadcn/ui Select component
<SelectPrimitive.Portal>
  <SelectPrimitive.Content>
    {/* Dropdown content renders at document.body */}
  </SelectPrimitive.Content>
</SelectPrimitive.Portal>
```

In OpenFin multi-window applications, this causes dropdowns to appear in the parent/provider window rather than the child window where the Select component is located.

##### The Solution: NoPortalSelect

The solution is to create portal-less versions of dropdown components by removing the Portal wrapper:

```typescript
// NoPortalSelect component (portal removed)
<SelectPrimitive.Content>
  {/* Dropdown content renders within the current window */}
</SelectPrimitive.Content>
```

##### Implementation Example

```typescript
// src/components/ui/openfin-select.tsx
import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';

// Copy all the standard Select component exports...
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;
// ... other components ...

// Modified SelectContent without Portal
export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  // No Portal wrapper - content renders in current window
  <SelectPrimitive.Content
    ref={ref}
    className={cn(
      'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      position === 'popper' &&
        'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
      className
    )}
    position={position}
    {...props}
  >
    <SelectScrollUpButton />
    <SelectPrimitive.Viewport
      className={cn(
        'p-1',
        position === 'popper' &&
          'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
      )}
    >
      {children}
    </SelectPrimitive.Viewport>
    <SelectScrollDownButton />
  </SelectPrimitive.Content>
));
```

##### When to Use NoPortalSelect

Use the portal-less versions of components in these scenarios:

1. **OpenFin Child Windows**: Any dialog or window opened from the main application
2. **Floating Panels**: Detachable panels that become separate windows
3. **Multi-Window Applications**: When dropdowns must stay within their originating window

##### Applying to Other Components

This pattern should be applied to all Radix-based dropdown components:

```typescript
// Components requiring portal removal for OpenFin:
- Select → OpenFinSelect
- DropdownMenu → OpenFinDropdownMenu
- Popover → OpenFinPopover
- Tooltip → OpenFinTooltip (if tooltips escape window bounds)
- HoverCard → OpenFinHoverCard
- Command (when used with popover) → OpenFinCommand
```

##### Usage in Column Customization Dialogs

```typescript
// Import OpenFin-adapted components
import { 
  OpenFinSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/openfin-select';

// Use normally - the portal removal is handled internally
<Select value={filterType} onValueChange={setFilterType}>
  <SelectTrigger>
    <SelectValue placeholder="Select filter type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="text">Text Filter</SelectItem>
    <SelectItem value="number">Number Filter</SelectItem>
    <SelectItem value="date">Date Filter</SelectItem>
  </SelectContent>
</Select>
```

##### Best Practices

1. **Create a Dedicated Module**: Keep all OpenFin-adapted components in a separate module (e.g., `@/components/ui/openfin/`)

2. **Maintain API Compatibility**: Portal-less components should have identical APIs to their standard counterparts

3. **Document Usage**: Clearly indicate in component documentation when to use OpenFin vs standard versions

4. **Test Window Boundaries**: Ensure dropdowns position correctly near window edges

5. **Z-Index Management**: May need to adjust z-index values since content isn't at document root

## Architecture Overview

### Multi-Dialog Approach

Given the extensive customization options, the system uses a multi-dialog approach with OpenFin windows for each component:

```
Quick Actions Bar (OpenFin Window - Always Visible)
├── Column Multi-Selector
├── Common Formatting Actions
├── Template Operations
└── Links to Open Advanced Dialogs

Main Column Customization Dialog (OpenFin Window)
├── Column Selection Panel
├── Primary Customization Tabs
└── Advanced Options (opens sub-dialogs)
    ├── Conditional Formatting Rules Dialog (OpenFin Window)
    ├── Calculated Columns Dialog (OpenFin Window)
    ├── Permission Rules Dialog (OpenFin Window)
    └── Named Filters Dialog (OpenFin Window)
```

Each dialog is hosted in its own OpenFin window for better window management, independent positioning, and persistent visibility.

## Reusable OpenFin Window Component Template

### Overview

To avoid duplicating OpenFin window infrastructure across all dialogs, we'll create a reusable window component template that standardizes window creation, management, and behavior.

### Base Component: OpenFinDialogHost

```typescript
interface OpenFinDialogHostProps {
  // Window Configuration
  windowId: string;                      // Unique window identifier
  windowTitle: string;                   // Window title bar text
  windowType: 'small' | 'medium' | 'large' | 'full' | 'custom';
  customWindowOptions?: Partial<OpenFin.WindowOptions>;
  
  // Window Behavior
  alwaysOnTop?: boolean;                 // Keep window on top
  saveState?: boolean;                   // Remember size/position
  singleton?: boolean;                   // Only one instance allowed
  parentWindow?: string;                 // Parent window identifier
  
  // Content
  children: React.ReactNode;             // Dialog content
  
  // Lifecycle
  onReady?: (window: OpenFin.Window) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  
  // Communication
  channelName?: string;                  // For inter-window communication
  onMessage?: (message: any) => void;
}
```

### Window Type Presets

```typescript
const WINDOW_PRESETS = {
  small: {
    defaultWidth: 400,
    defaultHeight: 300,
    minWidth: 300,
    minHeight: 200,
    resizable: true,
    maximizable: false
  },
  medium: {
    defaultWidth: 800,
    defaultHeight: 600,
    minWidth: 600,
    minHeight: 400,
    resizable: true,
    maximizable: true
  },
  large: {
    defaultWidth: 1200,
    defaultHeight: 800,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    maximizable: true
  },
  full: {
    defaultWidth: '90%',
    defaultHeight: '90%',
    minWidth: 1024,
    minHeight: 768,
    resizable: true,
    maximizable: true
  }
};
```

### Standard Features

```typescript
interface StandardWindowFeatures {
  // Window Controls
  header: {
    title: string;
    icon?: string;
    controls: ['minimize', 'maximize', 'close'];
    customActions?: WindowAction[];
  };
  
  // State Management
  stateManagement: {
    persistPosition: boolean;
    persistSize: boolean;
    persistCustomState?: Record<string, any>;
  };
  
  // Loading & Error States
  states: {
    loading: React.ComponentType;
    error: React.ComponentType<{ error: Error }>;
    empty?: React.ComponentType;
  };
  
  // Styling
  theme: {
    followSystem: boolean;
    customStyles?: CSSProperties;
    className?: string;
  };
}
```

### Implementation Example

```typescript
// Generic dialog host component
export const OpenFinDialogHost: React.FC<OpenFinDialogHostProps> = ({
  windowId,
  windowTitle,
  windowType,
  customWindowOptions,
  children,
  ...props
}) => {
  const [windowState, setWindowState] = useState<'creating' | 'ready' | 'error'>('creating');
  const [error, setError] = useState<Error | null>(null);
  const windowRef = useRef<OpenFin.Window | null>(null);
  
  useEffect(() => {
    createWindow();
    return () => cleanup();
  }, []);
  
  const createWindow = async () => {
    try {
      const options: OpenFin.WindowOptions = {
        name: windowId,
        url: 'about:blank',
        ...WINDOW_PRESETS[windowType],
        ...customWindowOptions,
        frame: true,
        autoShow: true,
        saveWindowState: props.saveState ?? true,
        contextMenu: true
      };
      
      const window = await fin.Window.create(options);
      windowRef.current = window;
      
      // Set up inter-window communication
      if (props.channelName) {
        setupChannelCommunication(window, props.channelName);
      }
      
      // Apply standard behaviors
      applyStandardBehaviors(window);
      
      setWindowState('ready');
      props.onReady?.(window);
      
    } catch (err) {
      setError(err as Error);
      setWindowState('error');
      props.onError?.(err as Error);
    }
  };
  
  // Render based on state
  if (windowState === 'error' && error) {
    return <ErrorBoundary error={error} />;
  }
  
  if (windowState === 'creating') {
    return <LoadingState />;
  }
  
  return (
    <WindowContext.Provider value={{ window: windowRef.current }}>
      <div className="openfin-dialog-host">
        {children}
      </div>
    </WindowContext.Provider>
  );
};
```

### Usage Examples

```typescript
// Quick Actions Bar
<OpenFinDialogHost
  windowId={`quick-actions-${gridId}`}
  windowTitle="Quick Column Actions"
  windowType="custom"
  customWindowOptions={{
    defaultWidth: 1200,
    defaultHeight: 120,
    defaultTop: 50,
    maxHeight: 150
  }}
  alwaysOnTop={true}
  saveState={true}
>
  <QuickActionsBar {...quickActionsProps} />
</OpenFinDialogHost>

// Column Customization Dialog
<OpenFinDialogHost
  windowId={`column-customization-${gridId}`}
  windowTitle="Column Customization"
  windowType="large"
  saveState={true}
  channelName="column-customization"
  onMessage={handleColumnUpdates}
>
  <ColumnCustomizationDialog {...dialogProps} />
</OpenFinDialogHost>

// Conditional Formatting Sub-dialog
<OpenFinDialogHost
  windowId={`conditional-formatting-${columnId}`}
  windowTitle={`Conditional Formatting - ${columnName}`}
  windowType="medium"
  parentWindow={`column-customization-${gridId}`}
  singleton={false}
>
  <ConditionalFormattingDialog {...formattingProps} />
</OpenFinDialogHost>
```

### Inter-Window Communication

```typescript
interface WindowCommunication {
  // Channel-based communication
  channel: {
    send: (topic: string, data: any) => Promise<void>;
    subscribe: (topic: string, handler: (data: any) => void) => void;
    unsubscribe: (topic: string) => void;
  };
  
  // Direct window messaging
  messaging: {
    sendToWindow: (windowId: string, message: any) => Promise<void>;
    broadcast: (message: any) => Promise<void>;
    onMessage: (handler: (message: any) => void) => void;
  };
  
  // State synchronization
  sync: {
    shareState: (key: string, value: any) => void;
    getSharedState: (key: string) => any;
    onStateChange: (key: string, handler: (value: any) => void) => void;
  };
}
```

### Window Lifecycle Management

```typescript
interface WindowLifecycle {
  // Creation
  beforeCreate?: () => Promise<void>;
  onCreate?: (window: OpenFin.Window) => void;
  
  // Visibility
  onShow?: () => void;
  onHide?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  
  // State changes
  onResize?: (bounds: OpenFin.Bounds) => void;
  onMove?: (position: OpenFin.Position) => void;
  onMaximize?: () => void;
  onMinimize?: () => void;
  onRestore?: () => void;
  
  // Destruction
  beforeClose?: () => Promise<boolean>; // Return false to prevent close
  onClose?: () => void;
}
```

### Benefits

1. **Consistency**: All dialogs behave the same way
2. **Reusability**: No code duplication
3. **Maintainability**: Central place for window logic
4. **Extensibility**: Easy to add new window types
5. **Standardization**: Consistent UX across all dialogs

## Quick Actions Bar (OpenFin Window)

### Overview

The Quick Actions Bar is a thin, horizontal OpenFin window that provides quick access to common column formatting actions. It remains visible and accessible while users work with the grid.

### Window Configuration

```typescript
interface QuickActionsBarWindow {
  window: {
    name: `quick-actions-${viewInstanceId}`;
    defaultWidth: 1200;
    defaultHeight: 120;
    minHeight: 100;
    maxHeight: 150;
    defaultTop: 50;
    defaultLeft: 'center';
    alwaysOnTop: true;
    frame: true;
    resizable: { width: true, height: false };
    maximizable: false;
    minimizable: true;
    saveWindowState: true;
  };
  
  behavior: {
    autoShow: true;
    stickToGrid: boolean;     // Follow main grid window
    hideWithGrid: boolean;    // Hide when grid is minimized
  };
}
```

### Layout Structure

```typescript
interface QuickActionsBarLayout {
  sections: [
    {
      id: 'column-selector';
      width: '300px';
      content: 'Multi-select dropdown with column list';
    },
    {
      id: 'common-actions';
      width: 'flex';
      content: 'Frequently used formatting buttons';
    },
    {
      id: 'templates';
      width: '200px';
      content: 'Template save/load operations';
    },
    {
      id: 'advanced-actions';
      width: '150px';
      content: 'Buttons to open advanced dialogs';
    }
  ];
}
```

### Components

#### Column Selector Section
```typescript
interface ColumnSelectorSection {
  dropdown: {
    placeholder: 'Select columns...';
    showSelectedCount: true;
    searchable: true;
    groupByType: true;
    quickSelectors: [
      'All Visible',
      'All Numeric',
      'All Text',
      'All Dates',
      'Modified Only'
    ];
  };
  
  selectedDisplay: {
    type: 'badge';
    format: '{count} columns selected';
    onClick: 'Show selected list';
  };
}
```

#### Common Actions Section
```typescript
interface CommonActionsSection {
  groups: [
    {
      name: 'Format';
      actions: [
        { icon: 'currency', tooltip: 'Currency format', action: 'applyCurrencyFormat' },
        { icon: 'percent', tooltip: 'Percentage format', action: 'applyPercentFormat' },
        { icon: 'decimal', tooltip: 'Number format', action: 'applyNumberFormat' },
        { icon: 'calendar', tooltip: 'Date format', action: 'applyDateFormat' }
      ];
    },
    {
      name: 'Style';
      actions: [
        { icon: 'bold', tooltip: 'Bold', action: 'toggleBold' },
        { icon: 'italic', tooltip: 'Italic', action: 'toggleItalic' },
        { icon: 'align-left', tooltip: 'Align left', action: 'alignLeft' },
        { icon: 'align-center', tooltip: 'Align center', action: 'alignCenter' },
        { icon: 'align-right', tooltip: 'Align right', action: 'alignRight' }
      ];
    },
    {
      name: 'Quick Options';
      actions: [
        { icon: 'eye', tooltip: 'Toggle visibility', action: 'toggleVisibility' },
        { icon: 'lock', tooltip: 'Lock/unlock', action: 'toggleLock' },
        { icon: 'filter', tooltip: 'Enable filter', action: 'enableFilter' },
        { icon: 'sort', tooltip: 'Enable sort', action: 'enableSort' }
      ];
    }
  ];
}
```

#### Templates Section
```typescript
interface TemplatesSection {
  saveButton: {
    label: 'Save Template';
    icon: 'save';
    onClick: 'openSaveTemplateDialog';
  };
  
  loadDropdown: {
    label: 'Load Template';
    icon: 'folder-open';
    templates: Template[];
    recentTemplates: Template[];
    onSelect: (template: Template) => void;
  };
}
```

#### Advanced Actions Section
```typescript
interface AdvancedActionsSection {
  buttons: [
    {
      label: 'Customize';
      icon: 'settings';
      onClick: 'openMainCustomizationDialog';
      primary: true;
    },
    {
      label: 'More';
      icon: 'more-vertical';
      menu: [
        { label: 'Conditional Formatting...', action: 'openConditionalDialog' },
        { label: 'Calculated Columns...', action: 'openCalculatedDialog' },
        { label: 'Permissions...', action: 'openPermissionsDialog' },
        { label: 'Named Filters...', action: 'openFiltersDialog' }
      ];
    }
  ];
}
```

### Integration with Main Grid

```typescript
interface QuickActionsBarIntegration {
  // Grid event listeners
  gridEvents: {
    onColumnSelectionChange: (columns: string[]) => void;
    onColumnModified: (columnId: string, changes: any) => void;
    onGridReady: (api: GridApi) => void;
  };
  
  // Action handlers
  actionHandlers: {
    applyFormatting: (format: FormatType, columns: string[]) => void;
    applyStyle: (style: StyleType, columns: string[]) => void;
    applyOptions: (options: ColumnOptions, columns: string[]) => void;
    openDialog: (dialogType: DialogType, context?: any) => void;
  };
  
  // State synchronization
  stateSync: {
    selectedColumns: string[];
    pendingChanges: Map<string, any>;
    activeDialog: string | null;
  };
}
```

## Expression Editor Component

### Overview

The Expression Editor is a sophisticated, reusable component that provides a rich environment for building complex expressions. It's used across multiple features including conditional formatting, calculated columns, filter queries, and validation rules.

### Component Structure

```typescript
interface ExpressionEditorProps {
  // Editor configuration
  mode: 'conditional' | 'calculation' | 'filter' | 'validation';
  initialExpression?: string;
  
  // Context
  availableColumns: ColumnDefinition[];
  availableVariables?: Variable[];
  customFunctions?: CustomFunction[];
  
  // Callbacks
  onChange: (expression: string, isValid: boolean) => void;
  onValidate?: (expression: string) => ValidationResult;
  onExecute?: (expression: string) => any;
  
  // UI Options
  showPreview?: boolean;
  showHistory?: boolean;
  height?: number | string;
}
```

### Layout Design

```typescript
interface ExpressionEditorLayout {
  container: {
    display: 'flex';
    height: '500px';
    border: '1px solid #e0e0e0';
  };
  
  mainEditor: {
    flex: '1 1 60%';
    minWidth: '400px';
    components: {
      toolbar: 'Format, undo/redo, settings';
      editor: 'Monaco/CodeMirror editor';
      statusBar: 'Line/col, errors, syntax mode';
    };
  };
  
  sidebar: {
    flex: '0 0 40%';
    minWidth: '300px';
    maxWidth: '500px';
    tabs: [
      'Columns',
      'Functions', 
      'Variables',
      'History',
      'Examples'
    ];
  };
  
  bottomPanel: {
    height: '150px';
    resizable: true;
    tabs: [
      'Validation',
      'Preview',
      'Documentation'
    ];
  };
}
```

### Editor Features

#### 1. Code Editor Core
```typescript
interface EditorCore {
  // Monaco Editor or CodeMirror configuration
  editor: {
    language: 'custom-expression-language';
    theme: 'vs-light' | 'vs-dark';
    
    features: {
      syntaxHighlighting: true;
      autoComplete: true;
      errorMarkers: true;
      codefolding: true;
      findReplace: true;
      multiCursor: true;
      bracketMatching: true;
      autoCloseBrackets: true;
    };
    
    // IntelliSense configuration
    intelliSense: {
      triggerCharacters: ['.', '(', '[', ' '];
      suggestionDelay: 100;
      
      providers: {
        columns: ColumnSuggestionProvider;
        functions: FunctionSuggestionProvider;
        variables: VariableSuggestionProvider;
        keywords: KeywordSuggestionProvider;
      };
    };
  };
  
  // Syntax highlighting rules
  syntaxHighlighting: {
    keywords: ['if', 'then', 'else', 'and', 'or', 'not', 'in', 'between'];
    functions: ['sum', 'avg', 'count', 'max', 'min', ...];
    operators: ['+', '-', '*', '/', '%', '==', '!=', '>', '<', '>=', '<='];
    literals: {
      string: /"[^"]*"|'[^']*'/;
      number: /\d+(\.\d+)?/;
      boolean: /true|false/;
      null: /null|undefined/;
    };
  };
}
```

#### 2. Sidebar Components

##### Columns Tab
```typescript
interface ColumnsTab {
  search: {
    placeholder: 'Search columns...';
    fuzzyMatch: true;
    highlightMatches: true;
  };
  
  columnList: {
    groupBy: 'category' | 'type' | 'alphabetical';
    
    display: {
      icon: 'Column type icon';
      name: 'Column name';
      type: 'Data type badge';
      description: 'Column description';
      
      actions: {
        insert: 'Insert at cursor';
        copyName: 'Copy to clipboard';
        showInfo: 'Show column details';
      };
    };
    
    // Column categories
    categories: [
      { id: 'dimensions', label: 'Dimensions', icon: 'cube' },
      { id: 'measures', label: 'Measures', icon: 'chart' },
      { id: 'calculated', label: 'Calculated', icon: 'function' },
      { id: 'metadata', label: 'Metadata', icon: 'info' }
    ];
  };
  
  // Quick insert section
  quickInsert: {
    recentlyUsed: Column[];
    favorites: Column[];
    related: Column[]; // Based on current expression
  };
}
```

##### Functions Tab
```typescript
interface FunctionsTab {
  search: {
    placeholder: 'Search functions...';
    searchIn: ['name', 'description', 'category'];
  };
  
  categories: [
    {
      id: 'math';
      label: 'Math Functions';
      icon: 'calculator';
      functions: MathFunction[];
    },
    {
      id: 'statistical';
      label: 'Statistical';
      icon: 'chart-line';
      functions: StatisticalFunction[];
    },
    {
      id: 'string';
      label: 'String & Text';
      icon: 'text';
      functions: StringFunction[];
    },
    {
      id: 'date';
      label: 'Date & Time';
      icon: 'calendar';
      functions: DateFunction[];
    },
    {
      id: 'aggregation';
      label: 'Aggregations';
      icon: 'sum';
      functions: AggregationFunction[];
    },
    {
      id: 'logical';
      label: 'Logical';
      icon: 'git-branch';
      functions: LogicalFunction[];
    },
    {
      id: 'custom';
      label: 'Custom Functions';
      icon: 'code';
      functions: CustomFunction[];
    }
  ];
  
  functionDisplay: {
    name: string;
    signature: string; // e.g., "ROUND(number, decimals)"
    description: string;
    example: string;
    returnType: string;
    
    // On hover/expand
    details: {
      parameters: Parameter[];
      examples: Example[];
      relatedFunctions: string[];
      notes?: string;
    };
  };
}
```

### Function Library

#### Math Functions
```typescript
interface MathFunctions {
  basic: [
    'ABS(number)',          // Absolute value
    'ROUND(number, decimals)', // Round to decimals
    'FLOOR(number)',        // Round down
    'CEIL(number)',         // Round up
    'TRUNC(number)',        // Truncate decimal
    'SIGN(number)',         // Sign of number
  ];
  
  arithmetic: [
    'MOD(dividend, divisor)', // Modulo
    'POWER(base, exponent)',   // Power
    'SQRT(number)',            // Square root
    'EXP(number)',             // Exponential
    'LN(number)',              // Natural log
    'LOG(number, base)',       // Logarithm
  ];
  
  trigonometric: [
    'SIN(radians)', 'COS(radians)', 'TAN(radians)',
    'ASIN(number)', 'ACOS(number)', 'ATAN(number)',
    'DEGREES(radians)', 'RADIANS(degrees)'
  ];
  
  advanced: [
    'RANDOM()',                // Random 0-1
    'RANDBETWEEN(min, max)',   // Random integer
    'PI()',                    // Pi constant
    'E()',                     // Euler's number
  ];
}
```

#### Statistical Functions
```typescript
interface StatisticalFunctions {
  basic: [
    'SUM(range)',           // Sum of values
    'AVG(range)',           // Average
    'COUNT(range)',         // Count non-null
    'MIN(range)',           // Minimum
    'MAX(range)',           // Maximum
  ];
  
  advanced: [
    'MEDIAN(range)',        // Median value
    'MODE(range)',          // Most common value
    'STDEV(range)',         // Standard deviation
    'VAR(range)',           // Variance
    'PERCENTILE(range, k)', // Kth percentile
    'QUARTILE(range, q)',   // Quartile (1-3)
  ];
  
  conditional: [
    'SUMIF(range, condition)',
    'COUNTIF(range, condition)',
    'AVGIF(range, condition)',
    'SUMIFS(range, ...conditions)',
    'COUNTIFS(range, ...conditions)',
  ];
  
  window: [
    'RANK(value, range, order)',
    'PERCENTRANK(range, value)',
    'MOVINGAVG(range, window)',
    'RUNNINGTOTAL(range)',
  ];
}
```

#### String Functions
```typescript
interface StringFunctions {
  basic: [
    'CONCAT(text1, text2, ...)',
    'LENGTH(text)',
    'UPPER(text)',
    'LOWER(text)',
    'PROPER(text)',          // Title case
    'TRIM(text)',            // Remove spaces
  ];
  
  extraction: [
    'LEFT(text, count)',
    'RIGHT(text, count)',
    'MID(text, start, length)',
    'SUBSTRING(text, start, end)',
    'SPLIT(text, delimiter, index)',
  ];
  
  search: [
    'FIND(needle, haystack)',
    'SEARCH(pattern, text)',
    'CONTAINS(text, search)',
    'STARTSWITH(text, prefix)',
    'ENDSWITH(text, suffix)',
  ];
  
  transformation: [
    'REPLACE(text, old, new)',
    'SUBSTITUTE(text, old, new, instance)',
    'REPEAT(text, count)',
    'REVERSE(text)',
    'PADLEFT(text, length, char)',
    'PADRIGHT(text, length, char)',
  ];
  
  regex: [
    'REGEXMATCH(text, pattern)',
    'REGEXEXTRACT(text, pattern)',
    'REGEXREPLACE(text, pattern, replacement)',
  ];
}
```

#### Date Functions
```typescript
interface DateFunctions {
  current: [
    'NOW()',                 // Current datetime
    'TODAY()',               // Current date
    'CURRENTTIME()',         // Current time
  ];
  
  extraction: [
    'YEAR(date)',
    'MONTH(date)',
    'DAY(date)',
    'HOUR(datetime)',
    'MINUTE(datetime)',
    'SECOND(datetime)',
    'WEEKDAY(date)',
    'WEEKNUM(date)',
    'QUARTER(date)',
  ];
  
  manipulation: [
    'DATEADD(date, interval, unit)',
    'DATEDIFF(date1, date2, unit)',
    'DATETRUNC(date, unit)',
    'LASTDAY(date)',         // Last day of month
    'EOMONTH(date, months)', // End of month
  ];
  
  formatting: [
    'DATEFORMAT(date, format)',
    'DATEPARSE(text, format)',
    'ISOTEXT(date)',
    'UNIXTIME(date)',
    'FROMUNIXTIME(timestamp)',
  ];
  
  business: [
    'WORKDAY(start, days, holidays)',
    'NETWORKDAYS(start, end, holidays)',
    'ISWORKDAY(date, holidays)',
    'BUSINESSHOURS(start, end)',
  ];
}
```

#### Aggregation Functions
```typescript
interface AggregationFunctions {
  standard: [
    'GROUPBY(column, aggregation)',
    'PIVOT(rows, columns, values, agg)',
    'ROLLUP(columns, aggregation)',
  ];
  
  window: [
    'ROW_NUMBER()',
    'DENSE_RANK()',
    'LAG(column, offset, default)',
    'LEAD(column, offset, default)',
    'FIRST_VALUE(column)',
    'LAST_VALUE(column)',
  ];
  
  cumulative: [
    'CUMSUM(column)',
    'CUMCOUNT(column)',
    'CUMAVG(column)',
    'CUMMAX(column)',
    'CUMMIN(column)',
  ];
  
  lookup: [
    'LOOKUP(value, table, column)',
    'VLOOKUP(value, table, col_index)',
    'INDEX(array, row, column)',
    'MATCH(value, array, type)',
  ];
}
```

#### Logical Functions
```typescript
interface LogicalFunctions {
  basic: [
    'IF(condition, true_value, false_value)',
    'IFS(condition1, value1, condition2, value2, ...)',
    'SWITCH(expression, case1, value1, case2, value2, ..., default)',
  ];
  
  operators: [
    'AND(condition1, condition2, ...)',
    'OR(condition1, condition2, ...)',
    'NOT(condition)',
    'XOR(condition1, condition2)',
  ];
  
  comparison: [
    'EQUALS(value1, value2)',
    'NOTEQUALS(value1, value2)',
    'GREATERTHAN(value1, value2)',
    'LESSTHAN(value1, value2)',
    'BETWEEN(value, min, max)',
    'IN(value, list)',
  ];
  
  null_handling: [
    'ISNULL(value)',
    'ISNOTNULL(value)',
    'IFNULL(value, default)',
    'COALESCE(value1, value2, ...)',
    'NULLIF(value1, value2)',
  ];
  
  type_checking: [
    'ISNUMBER(value)',
    'ISTEXT(value)',
    'ISDATE(value)',
    'ISBOOLEAN(value)',
    'ISERROR(value)',
    'TYPE(value)',
  ];
}
```

### Expression Validation

```typescript
interface ExpressionValidator {
  // Real-time validation
  validate(expression: string): ValidationResult;
  
  // Validation rules
  rules: {
    syntax: SyntaxValidator;
    semantics: SemanticValidator;
    performance: PerformanceValidator;
    security: SecurityValidator;
  };
  
  // Error reporting
  errors: {
    level: 'error' | 'warning' | 'info';
    line: number;
    column: number;
    message: string;
    suggestion?: string;
    quickFix?: QuickFix;
  }[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  
  // Performance metrics
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedRowsAffected?: number;
  
  // Type information
  returnType?: DataType;
  usedColumns: string[];
  usedFunctions: string[];
}
```

### Live Preview

```typescript
interface ExpressionPreview {
  // Preview configuration
  config: {
    sampleSize: number;      // Rows to preview
    refreshRate: number;     // Milliseconds
    showIntermediateSteps: boolean;
  };
  
  // Preview display
  display: {
    input: 'Sample input data';
    output: 'Expression result';
    steps: 'Calculation steps';
    performance: 'Execution time';
  };
  
  // Error handling
  errorDisplay: {
    type: 'inline' | 'tooltip' | 'panel';
    format: 'simple' | 'detailed';
  };
}
```

### Expression History & Favorites

```typescript
interface ExpressionHistory {
  // History management
  history: {
    items: HistoryItem[];
    maxItems: number;
    groupBy: 'date' | 'type' | 'feature';
  };
  
  // Favorites
  favorites: {
    items: FavoriteExpression[];
    categories: string[];
    tags: string[];
  };
  
  // Import/Export
  portability: {
    export: () => string;     // JSON format
    import: (data: string) => void;
    share: () => ShareableLink;
  };
}
```

### Integration Points

```typescript
interface ExpressionEditorIntegration {
  // Use in different contexts
  contexts: {
    conditionalFormatting: {
      defaultFunctions: ['IF', 'AND', 'OR', 'BETWEEN'];
      templates: ConditionalTemplate[];
      validation: 'strict';
    };
    
    calculatedColumns: {
      defaultFunctions: ['SUM', 'AVG', 'CONCAT', 'DATEFORMAT'];
      allowAggregations: true;
      validation: 'moderate';
    };
    
    filterQueries: {
      defaultFunctions: ['CONTAINS', 'IN', 'BETWEEN', 'ISNULL'];
      allowSubqueries: true;
      validation: 'performance-focused';
    };
    
    validation: {
      defaultFunctions: ['ISVALID', 'MATCHES', 'LENGTH'];
      returnType: 'boolean';
      validation: 'strict';
    };
  };
}
```

## Main Dialog Structure

### Dimensions & Layout
- **Width**: 1200px (responsive down to 900px)
- **Height**: 700px (auto-adjust based on content)
- **Position**: Centered, draggable, remembers position
- **Z-index**: 1000 (modal overlay)
- **Backdrop**: Semi-transparent overlay

### Key Sections

#### Header Section (80px)

```typescript
interface HeaderSection {
  columnSelector: {
    type: 'multi-select-dropdown';
    features: [
      'Search/filter columns',
      'Select by type (text/numeric/date/boolean)',
      'Bulk selection (Select All/None/By Type)',
      'Visual indicators (type icons, visibility status)',
      'Recently edited columns section',
      'Column grouping support'
    ];
    display: {
      selectedCount: number;
      badge: 'Shows "3 columns selected"';
    };
  };
  
  actionButtons: {
    apply: {
      label: 'Apply Changes';
      state: 'Disabled when no changes';
      indicator: 'Shows pending changes count';
    };
    reset: {
      label: 'Reset';
      visibility: 'Only when changes exist';
    };
    templates: {
      save: 'Save as Template';
      load: 'Load Template';
    };
    close: 'X button';
  };
}
```

#### Tab System

```typescript
interface TabStructure {
  primaryTabs: [
    {
      id: 'general';
      label: 'General';
      description: 'Basic column properties and behavior';
    },
    {
      id: 'display';
      label: 'Display';
      description: 'Cell renderers and value formatters';
    },
    {
      id: 'styling';
      label: 'Styling';
      description: 'Visual appearance (colors, fonts, borders)';
    },
    {
      id: 'editing';
      label: 'Editing';
      description: 'Cell editors and validation';
    },
    {
      id: 'filtering';
      label: 'Filtering';
      description: 'Filter configuration and pre-filters';
    }
  ];
  
  advancedButtons: [
    'Conditional Formatting',
    'Calculated Columns',
    'Permissions',
    'Named Filters'
  ];
}
```

## Tab Specifications

### General Tab

Controls basic column properties and behavior.

```typescript
interface GeneralTabOptions {
  // Column Identity
  columnDefinition: {
    field: string;              // Data field name (readonly)
    headerName: string;         // Display name
    description?: string;       // Tooltip/description
    columnId?: string;         // Unique identifier
  };
  
  // Visibility & Locking
  behavior: {
    hide: boolean;             // Column visibility
    lockVisible?: boolean;     // Prevent hiding
    lockPosition?: boolean;    // Prevent moving
    pinned?: 'left' | 'right' | null; // Pin position
  };
  
  // Interaction
  interaction: {
    resizable: boolean;        // Allow resizing
    sortable: boolean;         // Allow sorting
    movable: boolean;          // Allow reordering
    suppressMenu: boolean;     // Hide column menu
  };
  
  // Sizing
  sizing: {
    width?: number;            // Fixed width
    minWidth?: number;         // Minimum width
    maxWidth?: number;         // Maximum width
    flex?: number;             // Flex sizing
    autoSize: boolean;         // Auto-fit content
    suppressSizeToFit: boolean; // Exclude from size-to-fit
  };
  
  // Data Type
  dataType: {
    cellDataType: 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'object';
    type?: string[];           // Column type references
    valueGetter?: string;      // Custom value getter
    valueSetter?: string;      // Custom value setter
  };
}
```

### Display Tab

Configures how cell values are rendered and formatted.

```typescript
interface DisplayTabOptions {
  // Cell Renderer
  cellRenderer: {
    type: 'default' | 'builtin' | 'custom';
    
    builtin: {
      renderer: 
        | 'agGroupCellRenderer'
        | 'agAnimateShowChangeCellRenderer'
        | 'agAnimateSlideCellRenderer'
        | 'agLoadingCellRenderer'
        | 'agCheckboxCellRenderer'
        | 'agSparklineCellRenderer';
      
      params?: {
        // Group Cell Renderer
        suppressCount?: boolean;
        checkbox?: boolean;
        innerRenderer?: string;
        
        // Animate Renderers
        refreshDelay?: number;
        
        // Sparkline Renderer
        sparklineOptions?: any;
      };
    };
    
    custom: {
      componentName?: string;
      functionBody?: string;    // Inline function
      params?: Record<string, any>;
    };
  };
  
  // Value Formatter
  valueFormatter: {
    type: 'none' | 'builtin' | 'excel' | 'custom';
    
    builtin: {
      format: 'number' | 'currency' | 'percentage' | 'date' | 'boolean';
      
      numberFormat?: {
        decimals: number;       // 0-10
        thousandsSeparator: boolean;
        negativeInParentheses: boolean;
        prefix?: string;
        suffix?: string;
      };
      
      currencyFormat?: {
        symbol: '$' | '€' | '£' | '¥' | 'CHF' | 'custom';
        customSymbol?: string;
        decimals: number;
        position: 'prefix' | 'suffix';
        thousandsSeparator: boolean;
        negativeFormat: 'minus' | 'parentheses' | 'red';
      };
      
      percentageFormat?: {
        decimals: number;
        multiplyBy100: boolean;
        showPlusSign: boolean;
      };
      
      dateFormat?: {
        pattern: string;        // e.g., 'yyyy-MM-dd HH:mm:ss'
        timezone?: string;
        relative?: boolean;     // Show as "2 days ago"
      };
      
      booleanFormat?: {
        trueValue: string;      // e.g., 'Yes', 'True', '✓'
        falseValue: string;     // e.g., 'No', 'False', '✗'
        nullValue?: string;     // e.g., 'N/A', '-'
      };
    };
    
    excelFormat?: string;       // Excel-style format string
    
    custom?: {
      functionBody: string;     // Custom formatter function
      imports?: string[];       // Required imports
    };
  };
  
  // Tooltips
  tooltips: {
    enabled: boolean;
    field?: string;             // Use different field for tooltip
    valueGetter?: string;       // Custom tooltip function
    component?: string;         // Custom tooltip component
    delay?: number;             // Show delay in ms
  };
  
  // Cell Text Options
  textOptions: {
    wrapText: boolean;          // Enable text wrapping
    autoHeight: boolean;        // Auto-adjust row height
    truncateText: boolean;      // Add ellipsis for overflow
    maxLines?: number;          // Max lines when wrapping
  };
}
```

### Styling Tab

Controls visual appearance of cells and headers (excluding application themes).

```typescript
interface StylingTabOptions {
  // Target Selection
  targetMode: 'cells' | 'header' | 'both';
  
  // Typography
  typography: {
    fontFamily: string;         // Font selection
    fontSize: number;           // 8-32px
    fontWeight: string;         // 100-900
    fontStyle: 'normal' | 'italic';
    textDecoration: string[];   // ['underline', 'line-through']
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    letterSpacing?: number;     // px
    lineHeight?: number;        // multiplier
  };
  
  // Alignment
  alignment: {
    horizontal: 'left' | 'center' | 'right' | 'justify';
    vertical: 'top' | 'middle' | 'bottom';
    indent?: number;            // Left padding in px
  };
  
  // Colors
  colors: {
    textColor?: string;         // Hex color
    backgroundColor?: string;   // Hex color
    alternateRowColor?: string; // For striping
    hoverColor?: string;        // On hover
    selectedColor?: string;     // When selected
  };
  
  // Borders (per side)
  borders: {
    all?: BorderStyle;
    top?: BorderStyle;
    right?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
  };
  
  // Spacing
  spacing: {
    padding?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    cellHeight?: number;        // Override row height
  };
  
  // Advanced CSS
  advanced: {
    cellClass?: string | string[];
    cellClassRules?: Record<string, string | ((params: any) => boolean)>;
    cellStyle?: CSSProperties | ((params: any) => CSSProperties);
    headerClass?: string;
    headerStyle?: CSSProperties;
  };
}

interface BorderStyle {
  width: number;                // 1-5px
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  color: string;                // Hex color
}
```

### Editing Tab

Configures cell editing behavior and validation.

```typescript
interface EditingTabOptions {
  // Edit Enable/Disable
  editability: {
    editable: boolean | string; // Boolean or function body
    onCellValueChanged?: string; // Event handler
    onCellEditingStarted?: string;
    onCellEditingStopped?: string;
  };
  
  // Cell Editor Configuration
  cellEditor: {
    type: 'builtin' | 'custom';
    
    builtin: {
      editor: 
        | 'agTextCellEditor'
        | 'agLargeTextCellEditor'
        | 'agSelectCellEditor'
        | 'agRichSelectCellEditor'
        | 'agNumberCellEditor'
        | 'agDateCellEditor'
        | 'agDateTimeEditor'
        | 'agCheckboxCellEditor';
      
      params: {
        // Text Editor
        maxLength?: number;
        placeholder?: string;
        pattern?: string;       // Regex pattern
        
        // Large Text Editor
        rows?: number;
        cols?: number;
        
        // Select Editors
        values?: any[] | string; // Array or function
        valueListGetter?: string;
        valueListMaxHeight?: number;
        allowTyping?: boolean;  // Rich select
        filterList?: boolean;   // Rich select
        searchType?: 'fuzzy' | 'text';
        
        // Number Editor
        min?: number;
        max?: number;
        precision?: number;
        step?: number;
        showStepperButtons?: boolean;
        
        // Date Editor
        min?: string;           // ISO date
        max?: string;           // ISO date
        format?: string;
        placeholder?: string;
        
        // Checkbox Editor
        checkedValue?: any;
        uncheckedValue?: any;
      };
    };
    
    custom: {
      componentName?: string;
      functionBody?: string;
      params?: Record<string, any>;
    };
  };
  
  // Validation Rules
  validation: {
    required?: boolean;
    requiredMessage?: string;
    
    validators?: Array<{
      type: 'pattern' | 'range' | 'length' | 'custom';
      pattern?: string;         // Regex
      min?: number;
      max?: number;
      message?: string;
      functionBody?: string;    // Custom validator
    }>;
    
    asyncValidation?: {
      enabled: boolean;
      endpoint?: string;
      debounceMs?: number;
    };
  };
  
  // Edit Behavior
  behavior: {
    singleClickEdit?: boolean;
    stopEditingWhenCellsLoseFocus?: boolean;
    enterNavigatesVertically?: boolean;
    enterNavigatesVerticallyAfterEdit?: boolean;
    tabToNextCell?: boolean;
    editOnF2?: boolean;
    popupPosition?: 'over' | 'under';
  };
}
```

### Filtering Tab

Configures filtering behavior and pre-filter rules.

```typescript
interface FilteringTabOptions {
  // Filter Type
  filterType: {
    filter: string | boolean;
    type: 
      | 'agTextColumnFilter'
      | 'agNumberColumnFilter'
      | 'agDateColumnFilter'
      | 'agSetColumnFilter'
      | 'agMultiColumnFilter'
      | 'custom';
  };
  
  // Floating Filter
  floatingFilter: {
    enabled: boolean;
    height?: number;
    suppressFilterButton?: boolean;
  };
  
  // Filter Parameters
  filterParams: {
    // Common Parameters
    buttons?: ('apply' | 'clear' | 'reset' | 'cancel')[];
    closeOnApply?: boolean;
    debounceMs?: number;
    readOnly?: boolean;
    
    // Text Filter Specific
    textFilterParams?: {
      filterOptions: string[];  // Available operators
      defaultOption: string;
      textFormatter?: string;   // Function body
      trimInput?: boolean;
      caseSensitive?: boolean;
      maxNumConditions?: number;
    };
    
    // Number Filter Specific
    numberFilterParams?: {
      filterOptions: string[];
      defaultOption: string;
      allowedCharPattern?: string; // Regex
      numberParser?: string;    // Function body
      includeBlanksInEquals?: boolean;
      includeBlanksInLessThan?: boolean;
      includeBlanksInGreaterThan?: boolean;
    };
    
    // Date Filter Specific
    dateFilterParams?: {
      filterOptions: string[];
      defaultOption: string;
      comparator?: string;      // Function body
      browserDatePicker?: boolean;
      minValidDate?: string;    // ISO date
      maxValidDate?: string;    // ISO date
      inRangeFloatingFilterDateFormat?: string;
    };
    
    // Set Filter Specific
    setFilterParams?: {
      values?: any[] | string;  // Array or function
      refreshValuesOnOpen?: boolean;
      excelMode?: 'windows' | 'mac';
      selectAllOnMiniFilter?: boolean;
      suppressMiniFilter?: boolean;
      suppressSelectAll?: boolean;
      suppressSorting?: boolean;
      comparator?: string;      // Function body
      textFormatter?: string;   // Function body
    };
    
    // Multi Filter Specific
    multiFilterParams?: {
      filters: Array<{
        filter: string;
        title?: string;
        filterParams?: any;
      }>;
    };
  };
  
  // Pre-filter Rules
  preFilterRules?: {
    enabled: boolean;
    combineOperator: 'AND' | 'OR';
    rules: Array<{
      field: string;
      operator: string;
      value: any;
      value2?: any;             // For between
      active: boolean;
    }>;
    applyToFloatingFilter: boolean;
  };
  
  // Quick Filter Integration
  quickFilter: {
    includeInQuickFilter: boolean;
    quickFilterParser?: string; // Function body
  };
}
```

## Advanced Sub-Dialogs

### Conditional Formatting Dialog

Allows creating rules for dynamic styling based on cell values or row data.

```typescript
interface ConditionalFormattingDialog {
  // Rule Management
  rules: ConditionalRule[];
  maxRules?: number;
  defaultStyle?: CSSProperties;
  
  // Rule Templates
  templates: Array<{
    name: string;
    description: string;
    rule: Partial<ConditionalRule>;
  }>;
}

interface ConditionalRule {
  // Rule Identity
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;              // Execution order
  
  // Conditions
  conditions: {
    type: 'value' | 'expression' | 'range' | 'contains' | 'regex' | 'empty' | 'duplicate';
    
    // Value-based conditions
    valueCondition?: {
      operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'between' | 'in';
      value?: any;
      value2?: any;              // For between
      values?: any[];            // For in operator
    };
    
    // Expression-based conditions
    expression?: string;         // JS expression
    
    // Text conditions
    textCondition?: {
      contains?: string;
      startsWith?: string;
      endsWith?: string;
      regex?: string;
      caseSensitive?: boolean;
    };
    
    // Special conditions
    checkDuplicates?: {
      scope: 'column' | 'all';
      includeHidden?: boolean;
    };
  };
  
  // Formatting Actions
  formatting: {
    // Style formatting
    style?: {
      color?: string;
      backgroundColor?: string;
      fontWeight?: string;
      fontStyle?: string;
      textDecoration?: string;
      border?: string;
      // Any CSS property
    };
    
    // Class-based formatting
    cellClass?: string | string[];
    
    // Icon/Badge
    icon?: {
      name: string;
      position: 'start' | 'end';
      color?: string;
    };
    
    // Cell renderer override
    cellRenderer?: {
      name: string;
      params?: any;
    };
    
    // Value transformation
    valueTransform?: {
      type: 'prefix' | 'suffix' | 'replace' | 'custom';
      value?: string;
      functionBody?: string;
    };
  };
  
  // Scope
  scope: {
    target: 'cell' | 'row' | 'column';
    applyToColumns?: string[];   // For row scope
    highlightEntireRow?: boolean;
  };
  
  // Performance
  performance: {
    cache?: boolean;
    debounce?: number;
  };
}
```

### Calculated Columns Dialog

Define columns with values calculated from other columns.

```typescript
interface CalculatedColumnDialog {
  // Calculation Definition
  calculation: {
    id: string;
    name: string;
    description?: string;
    
    // Formula Type
    type: 'simple' | 'aggregation' | 'conditional' | 'custom';
    
    // Simple calculations
    simple?: {
      expression: string;        // e.g., "price * quantity"
      variables: Array<{
        name: string;
        field: string;
      }>;
    };
    
    // Aggregation calculations
    aggregation?: {
      function: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'median' | 'custom';
      field: string;
      groupBy?: string[];
      filter?: string;           // Filter expression
      scope: 'all' | 'visible' | 'filtered';
    };
    
    // Conditional calculations
    conditional?: {
      conditions: Array<{
        when: string;            // Condition expression
        then: string;            // Result expression
      }>;
      else: string;              // Default result
    };
    
    // Custom function
    custom?: {
      functionBody: string;
      imports?: string[];
      async?: boolean;
    };
  };
  
  // Dependencies
  dependencies: {
    fields: string[];            // Fields this calculation depends on
    calculations?: string[];     // Other calculations this depends on
    external?: string[];         // External data sources
  };
  
  // Update Behavior
  behavior: {
    updateTrigger: 'onChange' | 'onEdit' | 'onSave' | 'manual';
    debounceMs?: number;
    showLoadingState?: boolean;
    errorHandling: 'show' | 'hide' | 'default';
  };
  
  // Performance
  performance: {
    cache: boolean;
    cacheTimeout?: number;       // ms
    memoize?: boolean;
    workerThread?: boolean;      // Run in web worker
  };
  
  // Display Options
  display: {
    format?: any;                // Value formatter options
    showCalculationIndicator?: boolean;
    tooltipShowsFormula?: boolean;
  };
}
```

### Permission Rules Dialog

Configure column-level permissions for viewing and editing.

```typescript
interface PermissionRulesDialog {
  // Edit Permissions
  editPermissions: {
    type: 'allowAll' | 'denyAll' | 'roleBased' | 'conditional';
    
    // Role-based permissions
    roleBased?: {
      allowedRoles?: string[];
      deniedRoles?: string[];
      defaultAllow: boolean;
    };
    
    // User-based permissions
    userBased?: {
      allowedUsers?: string[];
      deniedUsers?: string[];
      allowedGroups?: string[];
      deniedGroups?: string[];
    };
    
    // Conditional permissions
    conditional?: {
      expression: string;        // JS expression
      contextVariables?: string[]; // Available: user, row, value, etc.
    };
    
    // Edit behavior
    behavior?: {
      showReadOnlyIndicator?: boolean;
      customMessage?: string;
      allowCopy?: boolean;
    };
  };
  
  // View Permissions
  viewPermissions: {
    type: 'showAll' | 'hideAll' | 'roleBased' | 'conditional';
    
    // Visibility rules
    visibility?: {
      hideForRoles?: string[];
      hideForUsers?: string[];
      conditionalShow?: string;  // Expression
    };
    
    // Data masking
    masking?: {
      enabled: boolean;
      maskingType: 'full' | 'partial' | 'custom';
      maskingPattern?: string;   // e.g., "****-****-****-####"
      preserveLength?: boolean;
      showOnHover?: boolean;
      allowUnmask?: boolean;
      unmaskRoles?: string[];
    };
  };
  
  // Row-level Security
  rowLevelSecurity?: {
    enabled: boolean;
    filterExpression?: string;   // Filter rows based on user context
    hideRowsCompletely?: boolean;
    showEmptyMessage?: string;
  };
  
  // Audit Options
  audit?: {
    logEdits?: boolean;
    logViews?: boolean;
    logExports?: boolean;
    webhookUrl?: string;
  };
}
```

### Named Filters Dialog

Save and manage reusable filter configurations.

```typescript
interface NamedFiltersDialog {
  // Filter Library
  filters: NamedFilter[];
  categories: string[];
  
  // Import/Export
  allowImport: boolean;
  allowExport: boolean;
}

interface NamedFilter {
  // Identity
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  
  // Filter Configuration
  filterModel: any;              // AG-Grid filter model
  affectedColumns: string[];
  
  // Sharing
  sharing: {
    isPublic: boolean;
    sharedWith?: string[];       // User/role IDs
    owner: string;
    createdDate: Date;
    modifiedDate: Date;
  };
  
  // Quick Access
  quickAccess: {
    showInMenu: boolean;
    showInToolbar?: boolean;
    shortcut?: string;           // e.g., "Ctrl+Shift+1"
    icon?: string;
    color?: string;
  };
  
  // Advanced Options
  options: {
    autoApply?: boolean;         // Apply on grid load
    combineWithExisting?: 'replace' | 'and' | 'or';
    preserveUserFilters?: boolean;
    notification?: {
      show: boolean;
      message?: string;
    };
  };
  
  // Usage Statistics
  stats?: {
    usageCount: number;
    lastUsed?: Date;
    averageRowsFiltered?: number;
  };
}
```

## Data Storage Strategy

### Minimal Storage Principle

Only store customizations that differ from defaults to minimize storage and improve performance.

```typescript
interface ColumnCustomization {
  // Column identifier
  field: string;
  
  // Version for migration support
  version?: number;
  
  // Only store properties that differ from defaults
  customizations: {
    // From General Tab
    general?: Partial<GeneralTabOptions>;
    
    // From Display Tab
    display?: Partial<DisplayTabOptions>;
    
    // From Styling Tab
    styling?: Partial<StylingTabOptions>;
    
    // From Editing Tab
    editing?: Partial<EditingTabOptions>;
    
    // From Filtering Tab
    filtering?: Partial<FilteringTabOptions>;
    
    // Advanced configurations
    conditionalFormatting?: ConditionalRule[];
    calculations?: CalculatedColumn;
    permissions?: PermissionRules;
  };
  
  // Metadata
  metadata?: {
    lastModified: Date;
    modifiedBy: string;
    changeCount: number;
    tags?: string[];
  };
}
```

### Storage Optimization Functions

```typescript
// Extract only non-default values
function extractCustomizations(
  columnDef: ColDef,
  defaultDef: ColDef
): Partial<ColDef> {
  const customizations: any = {};
  
  for (const key in columnDef) {
    if (columnDef[key] !== defaultDef[key]) {
      // Deep comparison for objects
      if (typeof columnDef[key] === 'object') {
        const nestedCustom = extractCustomizations(
          columnDef[key],
          defaultDef[key] || {}
        );
        if (Object.keys(nestedCustom).length > 0) {
          customizations[key] = nestedCustom;
        }
      } else {
        customizations[key] = columnDef[key];
      }
    }
  }
  
  return customizations;
}

// Apply customizations to default
function applyCustomizations(
  defaultDef: ColDef,
  customizations: Partial<ColDef>
): ColDef {
  return deepMerge(defaultDef, customizations);
}

// Compress for storage
function compressCustomizations(
  customizations: ColumnCustomization[]
): string {
  // Remove null/undefined values
  const cleaned = removeEmpty(customizations);
  
  // Use short keys for common properties
  const shortened = useShortKeys(cleaned);
  
  // Compress using LZ-string or similar
  return compress(JSON.stringify(shortened));
}
```

### Storage Schema

```typescript
interface StoredConfiguration {
  // Configuration identity
  id: string;
  name: string;
  version: string;
  
  // Column customizations
  columns: {
    [field: string]: ColumnCustomization;
  };
  
  // Global configurations
  global?: {
    defaultColumnDef?: Partial<ColDef>;
    conditionalFormattingRules?: ConditionalRule[];
    namedFilters?: NamedFilter[];
  };
  
  // Metadata
  metadata: {
    created: Date;
    modified: Date;
    author: string;
    gridVersion: string;
    customizationVersion: string;
  };
}
```

## Implementation Recommendations

### 1. Architecture Patterns

```typescript
// Use React Context for state management
const CustomizationContext = React.createContext<{
  selectedColumns: string[];
  pendingChanges: Map<string, ColumnCustomization>;
  appliedChanges: Map<string, ColumnCustomization>;
  undoStack: ChangeSet[];
  redoStack: ChangeSet[];
}>();

// Command pattern for undo/redo
interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

// Observer pattern for real-time preview
interface PreviewObserver {
  update(changes: ColumnCustomization[]): void;
}
```

### 2. Component Structure

```
src/components/column-customization/
├── ColumnCustomizationDialog.tsx       # Main container
├── context/
│   ├── CustomizationContext.tsx
│   └── PreviewContext.tsx
├── tabs/
│   ├── GeneralTab.tsx
│   ├── DisplayTab.tsx
│   ├── StylingTab.tsx
│   ├── EditingTab.tsx
│   └── FilteringTab.tsx
├── dialogs/
│   ├── ConditionalFormattingDialog.tsx
│   ├── CalculatedColumnsDialog.tsx
│   ├── PermissionRulesDialog.tsx
│   └── NamedFiltersDialog.tsx
├── components/
│   ├── ColumnSelector.tsx
│   ├── PreviewPanel.tsx
│   ├── TemplateManager.tsx
│   └── common/
│       ├── ColorPicker.tsx
│       ├── FormulaEditor.tsx
│       └── ExpressionBuilder.tsx
├── hooks/
│   ├── useColumnCustomization.ts
│   ├── usePreview.ts
│   ├── useTemplates.ts
│   └── useUndoRedo.ts
├── utils/
│   ├── storage.ts
│   ├── validation.ts
│   ├── formatters.ts
│   └── expressions.ts
└── types/
    └── index.ts
```

### 3. Key Features to Implement

1. **Real-time Preview**
   - Split-panel view with live preview
   - Highlight changed cells
   - Before/after comparison mode

2. **Undo/Redo System**
   - Command pattern implementation
   - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
   - Visual history timeline

3. **Template System**
   - Save column configurations as templates
   - Share templates across teams
   - Template marketplace/library

4. **Bulk Operations**
   - Apply changes to multiple columns
   - Copy settings between columns
   - Find and replace across columns

5. **Validation System**
   - Validate expressions and formulas
   - Check for circular dependencies
   - Performance impact warnings

6. **Import/Export**
   - Export configurations as JSON
   - Import from Excel column settings
   - Version migration support

7. **Keyboard Navigation**
   - Tab through all controls
   - Keyboard shortcuts for common actions
   - Accessibility compliance

8. **Search and Filter**
   - Search within customization options
   - Filter changed vs unchanged properties
   - Quick jump to section

### 4. Performance Optimizations

1. **Lazy Loading**
   ```typescript
   const ConditionalFormattingDialog = lazy(() => 
     import('./dialogs/ConditionalFormattingDialog')
   );
   ```

2. **Debounced Updates**
   ```typescript
   const debouncedPreview = useMemo(
     () => debounce(updatePreview, 300),
     []
   );
   ```

3. **Virtualization**
   ```typescript
   // For long column lists
   <VirtualList
     items={columns}
     height={400}
     itemHeight={40}
     renderItem={renderColumnItem}
   />
   ```

4. **Memoization**
   ```typescript
   const processedColumns = useMemo(
     () => processColumns(columns, customizations),
     [columns, customizations]
   );
   ```

5. **Web Workers**
   ```typescript
   // For complex calculations
   const worker = new Worker('./columnCalculator.worker.js');
   worker.postMessage({ formula, data });
   ```

### 5. Error Handling

```typescript
interface ErrorBoundary {
  fallback: React.ComponentType<{ error: Error }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Validation errors
interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

// Error recovery
interface RecoveryStrategy {
  type: 'revert' | 'default' | 'skip';
  fallbackValue?: any;
}
```

## Testing Strategy

### 1. Unit Tests
- Test each customization option
- Validate storage/retrieval functions
- Test expression evaluators

### 2. Integration Tests
- Test tab interactions
- Validate preview updates
- Test undo/redo system

### 3. E2E Tests
- Complete customization workflows
- Template save/load cycles
- Multi-column operations

### 4. Performance Tests
- Load time with many columns
- Preview update performance
- Storage optimization

## Migration Path

### From Existing System
1. Map current column properties
2. Convert to new format
3. Validate and test
4. Provide rollback option

### Version Upgrades
```typescript
interface MigrationStrategy {
  fromVersion: string;
  toVersion: string;
  migrate: (config: any) => any;
  validate: (config: any) => boolean;
}
```

## Security Considerations

1. **Expression Validation**
   - Sanitize user expressions
   - Prevent code injection
   - Limit execution context

2. **Permission Validation**
   - Server-side permission checks
   - Encrypted permission rules
   - Audit trail for changes

3. **Data Protection**
   - Encrypt sensitive configurations
   - Secure template sharing
   - Role-based access control

## Conclusion

This comprehensive plan provides a robust foundation for implementing an advanced AG-Grid column customization system. The modular architecture, extensive customization options, and performance optimizations ensure a scalable solution that can grow with user needs while maintaining excellent performance and user experience.