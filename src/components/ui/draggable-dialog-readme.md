# Draggable Dialog Component

A sophisticated draggable dialog component built on top of shadcn/ui Dialog component with Radix UI.

## Features

- **Draggable**: Click and drag the header area to move the dialog around the screen
- **Fixed Header & Footer**: Header and footer sections remain fixed while the body scrolls
- **Transparent Overlay**: Semi-transparent backdrop that doesn't dismiss the dialog
- **No Outside Click Dismissal**: Dialog stays open when clicking outside
- **Centered by Default**: Automatically centers itself on the page when opened
- **Theme Compatible**: Fully compatible with shadcn/ui theme system
- **Constrained Movement**: Dialog stays within viewport boundaries

## Usage

```tsx
import {
  DraggableDialog,
  DraggableDialogContent,
  DraggableDialogDescription,
  DraggableDialogFooter,
  DraggableDialogHeader,
  DraggableDialogTitle,
  DraggableDialogTrigger,
  DraggableDialogBody,
} from '@/components/ui/draggable-dialog';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <DraggableDialog open={open} onOpenChange={setOpen}>
      <DraggableDialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DraggableDialogTrigger>
      <DraggableDialogContent>
        <DraggableDialogHeader>
          <DraggableDialogTitle>Dialog Title</DraggableDialogTitle>
          <DraggableDialogDescription>
            Dialog description goes here
          </DraggableDialogDescription>
        </DraggableDialogHeader>
        
        <DraggableDialogBody>
          {/* Scrollable content goes here */}
        </DraggableDialogBody>
        
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button>Save</Button>
        </DraggableDialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  );
}
```

## Components

- **DraggableDialog**: Root component that wraps the dialog
- **DraggableDialogTrigger**: Trigger element that opens the dialog
- **DraggableDialogContent**: Main content container (draggable)
- **DraggableDialogHeader**: Fixed header section (drag handle area)
- **DraggableDialogBody**: Scrollable body section
- **DraggableDialogFooter**: Fixed footer section
- **DraggableDialogTitle**: Title text component
- **DraggableDialogDescription**: Description text component
- **DraggableDialogClose**: Close button component

## Props

### DraggableDialogContent
- `hideCloseButton?: boolean` - Hide the default close button
- All standard DialogContent props

### DraggableDialogHeader
- `draggable?: boolean` - Show/hide drag handle icon (default: true)

## Grid Customization Dialog Example

See `GridCustomizationDialog.tsx` for a complete example of how to use the draggable dialog for data grid customization with tabs, switches, sliders, and other controls.