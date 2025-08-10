import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Cross2Icon, DragHandleDots2Icon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

interface Position {
  x: number;
  y: number;
}

interface DraggableDialogProps {
  children?: React.ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

const DraggableDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Root>,
  DraggableDialogProps
>(({ children, ...props }, _ref) => {
  return (
    <DialogPrimitive.Root {...props}>
      {children}
    </DialogPrimitive.Root>
  );
});
DraggableDialog.displayName = 'DraggableDialog';

const DraggableDialogTrigger = DialogPrimitive.Trigger;

const DraggableDialogPortal = DialogPrimitive.Portal;

const DraggableDialogClose = DialogPrimitive.Close;

const DraggableDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DraggableDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DraggableDialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean;
}

const DraggableDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DraggableDialogContentProps
>(({ className, children, hideCloseButton = false, ...props }, ref) => {
  const [position, setPosition] = React.useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<Position>({ x: 0, y: 0 });
  const contentRef = React.useRef<HTMLDivElement>(null);
  const dragHandleRef = React.useRef<HTMLDivElement>(null);

  // Center the dialog on mount
  React.useEffect(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const centerX = (window.innerWidth - rect.width) / 2;
      const centerY = (window.innerHeight - rect.height) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, []);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    // Only start drag if clicking on the drag handle area
    if (dragHandleRef.current && dragHandleRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position]);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - (contentRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (contentRef.current?.offsetHeight || 0);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <DraggableDialogPortal>
      <DraggableDialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          if (typeof ref === 'function') ref(node);
          else if (ref && 'current' in ref) (ref as any).current = node;
          contentRef.current = node;
        }}
        className={cn(
          'fixed z-50 grid w-full max-w-2xl gap-0 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          isDragging && 'cursor-move select-none',
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'none'
        }}
        onMouseDown={handleMouseDown}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <Cross2Icon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
        <div ref={dragHandleRef} className="absolute inset-x-0 top-0 h-12 cursor-move" />
      </DialogPrimitive.Content>
    </DraggableDialogPortal>
  );
});
DraggableDialogContent.displayName = DialogPrimitive.Content.displayName;

const DraggableDialogHeader = ({
  className,
  draggable = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean }) => (
  <div
    className={cn(
      'flex items-center space-x-2 border-b px-6 py-4',
      draggable && 'cursor-move select-none',
      className
    )}
    {...props}
  >
    {draggable && (
      <DragHandleDots2Icon className="h-4 w-4 text-muted-foreground" />
    )}
    <div className="flex-1">{props.children}</div>
  </div>
);
DraggableDialogHeader.displayName = 'DraggableDialogHeader';

const DraggableDialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex-1 overflow-auto px-6 py-4',
      className
    )}
    {...props}
  />
);
DraggableDialogBody.displayName = 'DraggableDialogBody';

const DraggableDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse border-t px-6 py-4 sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
DraggableDialogFooter.displayName = 'DraggableDialogFooter';

const DraggableDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
DraggableDialogTitle.displayName = DialogPrimitive.Title.displayName;

const DraggableDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DraggableDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  DraggableDialog,
  DraggableDialogPortal,
  DraggableDialogOverlay,
  DraggableDialogTrigger,
  DraggableDialogClose,
  DraggableDialogContent,
  DraggableDialogHeader,
  DraggableDialogBody,
  DraggableDialogFooter,
  DraggableDialogTitle,
  DraggableDialogDescription,
};