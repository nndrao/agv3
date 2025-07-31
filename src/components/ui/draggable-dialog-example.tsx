import React from 'react';
import { Button } from '@/components/ui/button';
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

export function DraggableDialogExample() {
  const [open, setOpen] = React.useState(false);

  return (
    <DraggableDialog open={open} onOpenChange={setOpen}>
      <DraggableDialogTrigger asChild>
        <Button variant="outline">Open Draggable Dialog</Button>
      </DraggableDialogTrigger>
      <DraggableDialogContent className="max-w-3xl">
        <DraggableDialogHeader>
          <DraggableDialogTitle>Data Grid Customization</DraggableDialogTitle>
          <DraggableDialogDescription>
            Customize your data grid appearance and behavior. Drag the header to move this dialog.
          </DraggableDialogDescription>
        </DraggableDialogHeader>
        
        <DraggableDialogBody className="min-h-[400px]">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">Column Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure column visibility, order, and formatting options.
              </p>
            </div>
            
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">Filtering Options</h3>
              <p className="text-sm text-muted-foreground">
                Set up advanced filtering rules and saved filter presets.
              </p>
            </div>
            
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">Export Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure data export formats and options.
              </p>
            </div>
            
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">Performance Tuning</h3>
              <p className="text-sm text-muted-foreground">
                Adjust rendering performance and update frequency settings.
              </p>
            </div>
          </div>
        </DraggableDialogBody>
        
        <DraggableDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>
            Save Changes
          </Button>
        </DraggableDialogFooter>
      </DraggableDialogContent>
    </DraggableDialog>
  );
}