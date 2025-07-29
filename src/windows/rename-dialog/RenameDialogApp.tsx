import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import './rename-dialog.css';

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
  const [inputValue, setInputValue] = useState('');
  const [customData, setCustomData] = useState<RenameDialogCustomData | null>(null);

  useEffect(() => {
    // Get custom data from OpenFin window
    const initializeDialog = async () => {
      try {
        const options = await fin.me.getOptions();
        const data = options.customData as RenameDialogCustomData;
        setCustomData(data);
        const title = data.currentTitle || 'Untitled';
        setCurrentTitle(title);
        setInputValue(title);
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

  // For standalone dialog window, we don't need the Dialog wrapper
  // Just render the content directly
  if (!isOpen || !currentTitle) {
    return null;
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div 
        className="h-full w-full dialog-overlay flex items-center justify-center"
        onClick={() => handleOpenChange(false)}
      >
        <div 
          className="m-[10px] bg-[#2B2B2B] rounded-lg shadow-2xl w-[340px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pt-[10px] px-[10px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h2 className="text-white font-normal text-sm mt-[10px]">Rename Tab</h2>
              <button
                onClick={() => handleOpenChange(false)}
                className="text-gray-400 hover:text-white text-lg leading-none p-1 mt-[10px]"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (inputValue.trim() && inputValue.trim() !== currentTitle) {
              await handleRename(inputValue.trim());
            }
          }}>
            <div className="px-[10px]">
              <div className="px-4 py-3">
                <input
                  id="view-name"
                  name="view-name"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleOpenChange(false);
                    }
                  }}
                  className="w-full bg-[#3C3C3C] border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm px-3 py-1.5 rounded"
                  placeholder="Enter tab name"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-[10px] pb-[10px]">
              <div className="flex justify-end gap-2 px-4 py-3 bg-[#242424] border-t border-gray-700 rounded-b">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="text-white hover:bg-gray-700 text-sm px-5 py-1 mb-[10px] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0E70D1] hover:bg-[#0960B8] text-white text-sm px-5 py-1 mb-[10px] rounded transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ThemeProvider>
  );
}