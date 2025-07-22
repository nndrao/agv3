import { useState, useEffect } from 'react';
import { RenameViewDialog } from '@/components/RenameViewDialog';
import { ThemeProvider } from '@/components/theme-provider';

// Custom data from OpenFin window
interface RenameDialogCustomData {
  dialogId: string;
  currentTitle: string;
  targetView: {
    uuid: string;
    name: string;
  };
}

export function RenameDialogApp() {
  const [isOpen, setIsOpen] = useState(true);
  const [currentTitle, setCurrentTitle] = useState('');
  const [customData, setCustomData] = useState<RenameDialogCustomData | null>(null);

  useEffect(() => {
    // Get custom data from OpenFin window
    const initializeDialog = async () => {
      try {
        const options = await fin.me.getOptions();
        const data = options.customData as RenameDialogCustomData;
        setCustomData(data);
        setCurrentTitle(data.currentTitle || 'Untitled');
      } catch (error) {
        console.error('Failed to initialize rename dialog:', error);
      }
    };

    initializeDialog();
  }, []);

  const handleRename = async (newTitle: string) => {
    if (customData) {
      try {
        // Send result via Inter-Application Bus
        const topic = `rename-dialog-result-${customData.dialogId}`;
        await fin.InterApplicationBus.publish(topic, {
          success: true,
          newTitle: newTitle
        });
        
        // Close the window
        await fin.me.close();
      } catch (error) {
        console.error('Failed to send rename result:', error);
      }
    }
  };

  const handleOpenChange = async (open: boolean) => {
    if (!open && customData) {
      try {
        // Send cancel result
        const topic = `rename-dialog-result-${customData.dialogId}`;
        await fin.InterApplicationBus.publish(topic, {
          success: false
        });
        
        // Close the window
        await fin.me.close();
      } catch (error) {
        console.error('Failed to send cancel result:', error);
      }
    }
    setIsOpen(open);
  };

  return (
    <ThemeProvider defaultTheme="dark" forcedTheme="dark">
      <div className="h-screen w-screen flex items-center justify-center bg-[#2B2B2B]">
        <RenameViewDialog
          open={isOpen}
          onOpenChange={handleOpenChange}
          currentTitle={currentTitle}
          onRename={handleRename}
        />
      </div>
    </ThemeProvider>
  );
}