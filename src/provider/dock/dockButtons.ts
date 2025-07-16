import { DockButton } from '@openfin/workspace';

export function createDockButtons(): DockButton[] {
  return [
    {
      tooltip: 'Configure Datasource',
      iconUrl: 'http://localhost:5173/icons/database.svg',
      action: {
        id: 'configure-datasource',
        customData: {}
      }
    },
    {
      tooltip: 'New DataTable',
      iconUrl: 'http://localhost:5173/icons/table.svg',
      action: {
        id: 'new-datatable',
        customData: {}
      }
    },
    {
      tooltip: 'Active Providers',
      iconUrl: 'http://localhost:5173/icons/activity.svg',
      action: {
        id: 'show-providers',
        customData: {}
      }
    }
  ];
}

// Action handlers are now registered in the main.ts file as CustomActionsMap