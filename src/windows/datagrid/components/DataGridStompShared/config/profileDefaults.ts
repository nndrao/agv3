import { DataGridStompSharedProfile } from '../types';

export const DEFAULT_PROFILE: DataGridStompSharedProfile = {
  name: 'Default',
  autoLoad: true,
  selectedProviderId: null,
  autoConnect: false,
  sidebarVisible: false,
  theme: 'system',
  showColumnSettings: false,
  asyncTransactionWaitMillis: 50,
  rowBuffer: 10
};