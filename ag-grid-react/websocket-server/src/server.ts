import { WebSocketServer, WebSocket } from 'ws';
import { performance } from 'perf_hooks';

interface TradeRecord {
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

interface UpdateMessage {
  type: 'update';
  records: TradeRecord[];
  timestamp: number;
  sequence: number;
}

interface ControlMessage {
  type: 'start' | 'stop' | 'status';
  testType?: 'extreme' | 'stress' | 'load';
  targetRate?: number;
}

interface StatusMessage {
  type: 'status';
  actualRate: number;
  totalSent: number;
  duration: number;
  isRunning: boolean;
}

// Configuration
const PORT = 8081;
const EXTREME_BATCH_SIZE = 3000;
const EXTREME_INTERVAL_MS = 20; // 20ms = 150,000 updates/sec
const USE_BINARY = false; // Set to true for binary protocol (future enhancement)

// Sample data
const PRODUCTS = ['Palm Oil','Rubber','Wool','Amber','Copper','Lead','Zinc','Tin','Aluminium',
    'Aluminium Alloy','Nickel','Cobalt','Molybdenum','Recycled Steel','Corn','Oats','Rough Rice',
    'Soybeans','Rapeseed','Soybean Meal','Soybean Oil','Wheat','Milk','Coca','Coffee C',
    'Cotton No.2','Sugar No.11','Sugar No.14'];

const PORTFOLIOS = ['Aggressive','Defensive','Income','Speculative','Hybrid'];
const VALUE_FIELDS: (keyof TradeRecord)[] = ['current','previous','pl1','pl2','gainDx','sxPx','_99Out'];

class PerformanceTestServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private globalRowData: TradeRecord[] = [];
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private stats = {
    totalSent: 0,
    startTime: 0,
    sequence: 0
  };

  constructor() {
    this.wss = new WebSocketServer({ port: PORT });
    this.initializeData();
    this.setupWebSocketServer();
  }

  private initializeData(): void {
    // Generate initial dataset
    let tradeId = 24287;
    let bookId = 62472;
    
    for (const product of PRODUCTS) {
      for (const portfolio of PORTFOLIOS) {
        for (let k = 0; k < 15; k++) { // 15 books per portfolio
          const book = `GL-${++bookId}`;
          for (let l = 0; l < 5; l++) { // 5 trades per book
            const current = Math.floor(Math.random() * 100000) + 100;
            const trade: TradeRecord = {
              product,
              portfolio,
              book,
              trade: ++tradeId,
              submitterID: Math.floor(Math.random() * 990) + 10,
              submitterDealID: Math.floor(Math.random() * 990) + 10,
              dealType: Math.random() < 0.2 ? 'Physical' : 'Financial',
              bidFlag: Math.random() < 0.5 ? 'Buy' : 'Sell',
              current,
              previous: current + Math.floor(Math.random() * 10000) - 2000,
              pl1: Math.floor(Math.random() * 900) + 100,
              pl2: Math.floor(Math.random() * 900) + 100,
              gainDx: Math.floor(Math.random() * 900) + 100,
              sxPx: Math.floor(Math.random() * 900) + 100,
              _99Out: Math.floor(Math.random() * 900) + 100,
              batch: 101
            };
            this.globalRowData.push(trade);
          }
        }
      }
    }
    
    console.log(`Initialized ${this.globalRowData.length} trade records`);
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Client connected');
      this.clients.add(ws);

      // Send initial data
      this.sendInitialData(ws);

      ws.on('message', (data: Buffer) => {
        try {
          const message: ControlMessage = JSON.parse(data.toString());
          this.handleControlMessage(ws, message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
        if (this.clients.size === 0 && this.isRunning) {
          this.stopTest();
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log(`WebSocket server listening on port ${PORT}`);
  }

  private sendInitialData(ws: WebSocket): void {
    const message = {
      type: 'initial',
      records: this.globalRowData,
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(message));
  }

  private handleControlMessage(ws: WebSocket, message: ControlMessage): void {
    switch (message.type) {
      case 'start':
        this.startTest(message.testType || 'extreme');
        break;
      case 'stop':
        this.stopTest();
        break;
      case 'status':
        this.sendStatus(ws);
        break;
    }
  }

  private generateUpdates(count: number): TradeRecord[] {
    const updates: TradeRecord[] = [];
    const dataLength = this.globalRowData.length;
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * dataLength);
      const original = this.globalRowData[index];
      const field = VALUE_FIELDS[Math.floor(Math.random() * VALUE_FIELDS.length)];
      
      // Create update with new value
      const update = { ...original };
      (update as any)[field] = Math.floor(Math.random() * 100000);
      updates.push(update);
      
      // Update the source data
      (this.globalRowData[index] as any)[field] = (update as any)[field];
    }
    
    return updates;
  }

  private startTest(testType: string): void {
    if (this.isRunning) {
      console.log('Test already running');
      return;
    }

    console.log(`Starting ${testType} test`);
    this.isRunning = true;
    this.stats = {
      totalSent: 0,
      startTime: performance.now(),
      sequence: 0
    };

    // Broadcast start message
    this.broadcast({
      type: 'testStart',
      testType,
      timestamp: Date.now()
    });

    // Start pumping updates
    this.intervalId = setInterval(() => {
      if (!this.isRunning) return;

      const updates = this.generateUpdates(EXTREME_BATCH_SIZE);
      const message: UpdateMessage = {
        type: 'update',
        records: updates,
        timestamp: Date.now(),
        sequence: ++this.stats.sequence
      };

      this.broadcast(message);
      this.stats.totalSent += updates.length;

      // Log progress every second
      const elapsed = performance.now() - this.stats.startTime;
      if (this.stats.sequence % 50 === 0) { // Every second at 20ms intervals
        const rate = Math.floor((this.stats.totalSent / elapsed) * 1000);
        console.log(`Sent ${this.stats.totalSent.toLocaleString()} updates, rate: ${rate.toLocaleString()}/sec`);
      }
    }, EXTREME_INTERVAL_MS);
  }

  private stopTest(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    const elapsed = performance.now() - this.stats.startTime;
    const finalRate = Math.floor((this.stats.totalSent / elapsed) * 1000);

    const summary = {
      type: 'testComplete',
      totalSent: this.stats.totalSent,
      duration: elapsed,
      actualRate: finalRate,
      timestamp: Date.now()
    };

    console.log(`Test complete: ${summary.totalSent.toLocaleString()} updates in ${Math.floor(elapsed)}ms = ${finalRate.toLocaleString()}/sec`);
    
    this.broadcast(summary);
  }

  private sendStatus(ws: WebSocket): void {
    const elapsed = this.isRunning ? performance.now() - this.stats.startTime : 0;
    const actualRate = elapsed > 0 ? Math.floor((this.stats.totalSent / elapsed) * 1000) : 0;

    const status: StatusMessage = {
      type: 'status',
      actualRate,
      totalSent: this.stats.totalSent,
      duration: elapsed,
      isRunning: this.isRunning
    };

    ws.send(JSON.stringify(status));
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message);
    const deadClients: WebSocket[] = [];

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        // Check if client's send buffer is not too full
        if (client.bufferedAmount < 1024 * 1024) { // 1MB threshold
          client.send(data, (error) => {
            if (error) {
              console.error('Error sending to client:', error);
              deadClients.push(client);
            }
          });
        } else {
          console.warn(`Client buffer full: ${client.bufferedAmount} bytes`);
        }
      } else {
        deadClients.push(client);
      }
    });

    // Clean up dead clients
    deadClients.forEach(client => this.clients.delete(client));
  }
}

// Start the server
const server = new PerformanceTestServer();
console.log('AG-Grid extreme performance test server started');