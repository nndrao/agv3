# Adding "Rename Tab" to OpenFin View Tab Context Menu

This guide shows how to add a custom "Rename Tab" option to the right-click context menu of OpenFin view tabs.

## Solution Overview

The view menu is displayed when clicking the view tab, and the customization process follows a pattern where entries are configured through the browserProvider settings in the manifest. You can specify Custom as the data.type, in which case the data will also need to contain an action with an id and customData which is passed to the action.

## Step 1: Configure the Manifest

Add the custom "Rename Tab" menu item to your `manifest.json` under the `browserProvider` configuration:

```json
{
  "platform": {
    "uuid": "your-platform-uuid",
    "name": "your-platform-name",
    "url": "your-platform-url"
  },
  "browserProvider": {
    "viewMenu": [
      {
        "include": true,
        "label": "Rename Tab",
        "data": {
          "type": "Custom",
          "action": {
            "id": "rename-tab"
          }
        },
        "position": {
          "type": "CloseViews",
          "operation": "before"
        },
        "separator": "after"
      }
    ]
  }
}
```

## Step 2: Implement the Custom Action Handler

Create a platform provider override that handles the custom "rename-tab" action:

```typescript
import * as WorkspacePlatform from '@openfin/workspace-platform';

interface RenameTabData {
  windowIdentity: OpenFin.Identity;
  viewIdentity: OpenFin.Identity;
}

const overrideCallback: WorkspacePlatform.WorkspacePlatformOverrideCallback = 
  async (WorkspacePlatformProvider) => {
    
    class Override extends WorkspacePlatformProvider {
      
      async handleAction(action: any): Promise<void> {
        if (action.id === 'rename-tab') {
          await this.handleRenameTabAction(action);
          return;
        }
        
        // Call parent for other actions
        return super.handleAction(action);
      }

      private async handleRenameTabAction(action: any): Promise<void> {
        try {
          // Get the current view identity from the action context
          const viewIdentity = action.customData?.viewIdentity;
          
          if (!viewIdentity) {
            console.error('No view identity provided for rename action');
            return;
          }

          // Show rename dialog
          const newTitle = await this.showRenameDialog(viewIdentity);
          
          if (newTitle && newTitle.trim()) {
            await this.renameViewTab(viewIdentity, newTitle.trim());
          }
        } catch (error) {
          console.error('Error renaming tab:', error);
        }
      }

      private async showRenameDialog(viewIdentity: OpenFin.Identity): Promise<string | null> {
        // Get current view to retrieve existing title
        const view = fin.View.wrapSync(viewIdentity);
        const viewOptions = await view.getOptions();
        const currentTitle = viewOptions.title || viewOptions.name || 'Untitled';

        // Create a simple prompt dialog
        // In production, you might want to create a proper OpenFin window for this
        const newTitle = prompt(`Rename tab "${currentTitle}" to:`, currentTitle);
        
        return newTitle;
      }

      private async renameViewTab(viewIdentity: OpenFin.Identity, newTitle: string): Promise<void> {
        try {
          const view = fin.View.wrapSync(viewIdentity);
          
          // Update the view options with new title
          await view.updateOptions({
            title: newTitle,
            titleOrder: 'options' // Ensure the options title takes precedence
          });

          console.log(`Tab renamed to: ${newTitle}`);
        } catch (error) {
          console.error('Error updating view title:', error);
          throw error;
        }
      }
    }

    return new Override();
  };

// Initialize the workspace platform with the override
export async function initializePlatform() {
  await WorkspacePlatform.init({
    browser: {
      title: 'My Custom Platform'
    },
    overrideCallback
  });
}
```

## Step 3: Enhanced Rename Dialog (Optional)

For a better user experience, you can create a proper OpenFin window for the rename dialog:

```typescript
private async showRenameDialog(viewIdentity: OpenFin.Identity): Promise<string | null> {
  return new Promise((resolve) => {
    // Create rename dialog window
    const dialogOptions = {
      name: 'rename-dialog',
      url: 'rename-dialog.html',
      defaultWidth: 400,
      defaultHeight: 200,
      frame: true,
      resizable: false,
      maximizable: false,
      minimizable: false,
      alwaysOnTop: true,
      showTaskbarIcon: false,
      customData: {
        viewIdentity,
        callback: resolve
      }
    };

    fin.Window.create(dialogOptions).then((dialogWindow) => {
      // Handle dialog close
      dialogWindow.once('closed', () => {
        resolve(null);
      });
    });
  });
}
```

Create `rename-dialog.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Rename Tab</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .dialog-content {
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        input[type="text"] {
            width: 100%;
            padding: 8px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 3px;
        }
        .buttons {
            text-align: right;
            margin-top: 15px;
        }
        button {
            padding: 8px 16px;
            margin-left: 8px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        .ok-btn {
            background: #007acc;
            color: white;
        }
        .cancel-btn {
            background: #ccc;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="dialog-content">
        <h3>Rename Tab</h3>
        <input type="text" id="tabName" placeholder="Enter new tab name" />
        <div class="buttons">
            <button type="button" class="cancel-btn" onclick="cancel()">Cancel</button>
            <button type="button" class="ok-btn" onclick="rename()">OK</button>
        </div>
    </div>

    <script>
        let callback;
        let viewIdentity;

        // Initialize dialog
        document.addEventListener('DOMContentLoaded', async () => {
            const customData = await fin.me.getOptions().then(opts => opts.customData);
            callback = customData.callback;
            viewIdentity = customData.viewIdentity;

            // Get current title and set as default
            const view = fin.View.wrapSync(viewIdentity);
            const viewOptions = await view.getOptions();
            const currentTitle = viewOptions.title || viewOptions.name || 'Untitled';
            
            document.getElementById('tabName').value = currentTitle;
            document.getElementById('tabName').focus();
            document.getElementById('tabName').select();
        });

        // Handle Enter key
        document.getElementById('tabName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                rename();
            } else if (e.key === 'Escape') {
                cancel();
            }
        });

        function rename() {
            const newTitle = document.getElementById('tabName').value;
            if (callback) {
                callback(newTitle);
            }
            fin.me.close();
        }

        function cancel() {
            if (callback) {
                callback(null);
            }
            fin.me.close();
        }
    </script>
</body>
</html>
```

## Step 4: Alternative Method - Direct Context Menu Override

You can also override the `showViewTabContextMenu` method for more control:

```typescript
class Override extends WorkspacePlatformProvider {
  
  async showViewTabContextMenu(
    req: WorkspacePlatform.OpenViewTabContextMenuRequest
  ): Promise<void> {
    // Add custom menu item to the existing template
    const customTemplate = [
      ...req.template,
      { type: 'separator' },
      {
        label: 'Rename Tab',
        click: async () => {
          const newTitle = await this.showRenameDialog(req.viewIdentity);
          if (newTitle && newTitle.trim()) {
            await this.renameViewTab(req.viewIdentity, newTitle.trim());
          }
        }
      }
    ];

    // Show the modified context menu
    const result = await fin.me.showPopupMenu({
      template: customTemplate,
      x: req.x,
      y: req.y
    });

    return result;
  }
}
```

## Complete Integration Example

Here's how to tie everything together in your main platform file:

```typescript
// platform.ts
import * as WorkspacePlatform from '@openfin/workspace-platform';

const init = async () => {
  const overrideCallback: WorkspacePlatform.WorkspacePlatformOverrideCallback = 
    async (WorkspacePlatformProvider) => {
      
      class Override extends WorkspacePlatformProvider {
        async handleAction(action: any): Promise<void> {
          if (action.id === 'rename-tab') {
            await this.handleRenameTabAction(action);
            return;
          }
          return super.handleAction(action);
        }

        private async handleRenameTabAction(action: any): Promise<void> {
          // Implementation from Step 2
          const viewIdentity = action.customData?.viewIdentity;
          if (!viewIdentity) return;

          const newTitle = await this.showRenameDialog(viewIdentity);
          if (newTitle && newTitle.trim()) {
            await this.renameViewTab(viewIdentity, newTitle.trim());
          }
        }

        private async showRenameDialog(viewIdentity: OpenFin.Identity): Promise<string | null> {
          // Use either the simple prompt or the custom dialog implementation
          const view = fin.View.wrapSync(viewIdentity);
          const viewOptions = await view.getOptions();
          const currentTitle = viewOptions.title || viewOptions.name || 'Untitled';
          
          return prompt(`Rename tab "${currentTitle}" to:`, currentTitle);
        }

        private async renameViewTab(viewIdentity: OpenFin.Identity, newTitle: string): Promise<void> {
          const view = fin.View.wrapSync(viewIdentity);
          await view.updateOptions({
            title: newTitle,
            titleOrder: 'options'
          });
        }
      }

      return new Override();
    };

  await WorkspacePlatform.init({
    browser: {
      title: 'My Platform with Rename Tabs'
    },
    overrideCallback
  });
};

init().catch(console.error);
```

## Key Points

1. **Menu Configuration**: The entries are configured through the browserProvider settings in the manifest using the viewMenu array

2. **Custom Actions**: When the custom menu entry is clicked, the id is used to look up one of the platform actions, and the customData is passed to it

3. **Title Precedence**: The titleOrder controls precedence where 'options' means viewOptions.title takes priority over document.title

4. **Position Control**: The `position` property determines where in the menu the item appears relative to other menu entries

This implementation provides a clean, user-friendly way to rename tabs through the context menu while maintaining the OpenFin platform's architecture and best practices.