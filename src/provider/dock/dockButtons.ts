import { DockButton } from '@openfin/workspace';

export function createDockButtons(): DockButton[] {
  // Use relative paths that work regardless of port
  const baseUrl = window.location.origin;
  console.log('Creating dock buttons with base URL:', baseUrl);
  
  const buttons: DockButton[] = [
    {
      tooltip: 'Configure Datasource',
      iconUrl: `${baseUrl}/icons/database.svg`,
      action: {
        id: 'configure-datasource',
        customData: {}
      }
    },
    {
      tooltip: 'New DataTable',
      iconUrl: `${baseUrl}/icons/table.svg`,
      action: {
        id: 'new-datatable',
        customData: {}
      }
    },
    {
      tooltip: 'DataGrid (Direct STOMP)',
      iconUrl: `${baseUrl}/icons/grid.svg`,
      action: {
        id: 'new-datagrid-stomp',
        customData: {}
      }
    },
    {
      tooltip: 'DataGrid (Channel)',
      iconUrl: `${baseUrl}/icons/grid-channel.svg`,
      action: {
        id: 'new-datagrid-channel',
        customData: {}
      }
    },
    {
      tooltip: 'Active Providers',
      iconUrl: `${baseUrl}/icons/activity.svg`,
      action: {
        id: 'show-providers',
        customData: {}
      }
    },
    {
      tooltip: 'Manage DataGrid Instances',
      iconUrl: `${baseUrl}/icons/layers.svg`,
      action: {
        id: 'manage-datagrid-instances',
        customData: {}
      }
    }
  ];
  
  console.log('Created dock buttons:', buttons.length, 'buttons');
  buttons.forEach((btn, i) => {
    console.log(`Button ${i + 1}: ${btn.tooltip} - ${btn.iconUrl}`);
  });
  
  return buttons;
}

// Action handlers are now registered in the main.ts file as CustomActionsMap