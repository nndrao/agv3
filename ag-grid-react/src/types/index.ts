export interface TradeRecord {
  product: string;
  portfolio: string;
  book: string;
  trade: number;
  submitterID: number;
  submitterDealID: number;
  dealType: 'Physical' | 'Financial';
  bidFlag: 'Buy' | 'Sell';
  current: number;
  previous: number;
  pl1: number;
  pl2: number;
  gainDx: number;
  sxPx: number;
  _99Out: number;
  batch: number;
}

export type WorkerMessageType = 
  | 'start' 
  | 'end' 
  | 'setRowData' 
  | 'updateData'
  | 'startStress'
  | 'startLoad'
  | 'stopTest';

export interface WorkerMessage {
  type: WorkerMessageType;
  records?: TradeRecord[];
  messageCount?: number;
  updateCount?: number;
  interval?: number | null;
}

export type ColumnMode = 'flat' | 'group' | 'pivot';