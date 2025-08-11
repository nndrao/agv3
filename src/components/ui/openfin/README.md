# OpenFin-Adapted UI Components

This module contains portal-less versions of shadcn/ui components specifically designed for use in OpenFin multi-window applications.

## The Problem

Standard shadcn/ui dropdown components (Select, DropdownMenu, Popover, etc.) use Radix UI's `Portal` primitive, which renders content at the document root level. In OpenFin multi-window applications, this causes dropdowns to appear in the parent/provider window rather than the child window where the component is located.

## The Solution

These OpenFin-adapted components remove the Portal wrapper, ensuring dropdown content renders within the current window.

## When to Use

Use these components in:
- OpenFin child windows (dialogs opened from the main application)
- Floating panels that become separate windows
- Any multi-window scenario where dropdowns must stay within their originating window

## Available Components

### Select
```tsx
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/openfin';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### DropdownMenu
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/openfin';

<DropdownMenu>
  <DropdownMenuTrigger>Open</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Action 1</DropdownMenuItem>
    <DropdownMenuItem>Action 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Popover
```tsx
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/openfin';

<Popover>
  <PopoverTrigger>Open popover</PopoverTrigger>
  <PopoverContent>
    <p>Popover content</p>
  </PopoverContent>
</Popover>
```

### Tooltip
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/openfin';

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Context Menu
```tsx
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/openfin';

<ContextMenu>
  <ContextMenuTrigger>Right click me</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Action 1</ContextMenuItem>
    <ContextMenuItem>Action 2</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

### Menubar
```tsx
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/openfin';

<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New</MenubarItem>
      <MenubarItem>Open</MenubarItem>
      <MenubarSeparator />
      <MenubarItem>Exit</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>
```

### Dialog
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/openfin';

<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description goes here.
      </DialogDescription>
    </DialogHeader>
    <p>Dialog content</p>
  </DialogContent>
</Dialog>
```

### Alert Dialog
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/openfin';

<AlertDialog>
  <AlertDialogTrigger>Show Alert</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Sheet
```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/openfin';

<Sheet>
  <SheetTrigger>Open Sheet</SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Sheet Title</SheetTitle>
      <SheetDescription>
        Sheet description goes here.
      </SheetDescription>
    </SheetHeader>
    <p>Sheet content</p>
  </SheetContent>
</Sheet>
```

### Command
```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/openfin';

<Command>
  <CommandInput placeholder="Type a command..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>Calendar</CommandItem>
      <CommandItem>Search Emoji</CommandItem>
      <CommandItem>Calculator</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### HoverCard
```tsx
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/openfin';

<HoverCard>
  <HoverCardTrigger>Hover over me</HoverCardTrigger>
  <HoverCardContent>
    <p>Detailed information appears here</p>
  </HoverCardContent>
</HoverCard>
```

## Automatic Component Selection

Use the `useIsOpenFinWindow` hook to automatically select the appropriate component:

```tsx
import { useIsOpenFinWindow } from '@/components/ui/openfin';
import { Select as StandardSelect } from '@/components/ui/select';
import { Select as OpenFinSelect } from '@/components/ui/openfin';

function MyComponent() {
  const isOpenFinWindow = useIsOpenFinWindow();
  const Select = isOpenFinWindow ? OpenFinSelect : StandardSelect;
  
  return (
    <Select>
      {/* Use normally */}
    </Select>
  );
}
```

## Best Practices

1. **API Compatibility**: These components maintain identical APIs to their standard counterparts, making them drop-in replacements.

2. **Consistent Imports**: Consider creating a centralized import module that automatically selects the right component based on context:

```tsx
// components/ui/adaptive/index.ts
export * from '@/components/ui/openfin';

// Then in your components:
import { Select, SelectContent, SelectItem } from '@/components/ui/adaptive';
```

3. **Testing**: Test window boundary behavior to ensure dropdowns position correctly near window edges.

4. **Z-Index Management**: Since content isn't at document root, you may need to adjust z-index values for proper layering.

5. **Performance**: These components have the same performance characteristics as standard components.

## Migration Guide

To migrate existing code:

1. Update imports:
```tsx
// Before
import { Select } from '@/components/ui/select';

// After
import { Select } from '@/components/ui/openfin';
```

2. No other code changes needed - the API is identical.

## Troubleshooting

### Dropdown appears in wrong window
- Ensure you're using the OpenFin-adapted version, not the standard component
- Check that imports are from `@/components/ui/openfin`

### Z-index issues
- Add higher z-index to the content className if needed:
```tsx
<SelectContent className="z-[100]">
```

### Position issues near window edges
- The components use Radix UI's positioning engine, which should handle edge cases
- If issues persist, adjust the `sideOffset` prop

## Contributing

When adding new dropdown components:

1. Copy the standard component
2. Remove the `Portal` wrapper from the content component
3. Maintain all other functionality and styling
4. Add to the index.ts exports
5. Document usage in this README