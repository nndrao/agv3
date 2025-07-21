import type { TradeRecord, WorkerMessage } from '../types';

// update these to change the stress test parameters
const STRESS_TEST_MESSAGE_COUNT = 1000;
const STRESS_TEST_UPDATES_PER_MESSAGE = 100;

// update these to change the load test parameters
const LOAD_TEST_UPDATES_PER_MESSAGE = 100;
const LOAD_TEST_MILLISECONDS_BETWEEN_MESSAGES = 100;

// extreme stress test parameters
const EXTREME_TEST_DURATION_MS = 10000; // 10 seconds
const EXTREME_TEST_BATCH_SIZE = 3000; // updates per batch
const EXTREME_TEST_INTERVAL_MS = 20; // 20ms between batches = 150,000 updates/sec

// update these to change the size of the data initially loaded into the grid for updating
const BOOK_COUNT = 15;
const TRADE_COUNT = 5;

// add / remove products to change the data set
const PRODUCTS = ['Palm Oil','Rubber','Wool','Amber','Copper','Lead','Zinc','Tin','Aluminium',
    'Aluminium Alloy','Nickel','Cobalt','Molybdenum','Recycled Steel','Corn','Oats','Rough Rice',
    'Soybeans','Rapeseed','Soybean Meal','Soybean Oil','Wheat','Milk','Coca','Coffee C',
    'Cotton No.2','Sugar No.11','Sugar No.14'];

// add / remove portfolios to change the data set
const PORTFOLIOS = ['Aggressive','Defensive','Income','Speculative','Hybrid'];

// these are the list of columns that updates go to
const VALUE_FIELDS: (keyof TradeRecord)[] = ['current','previous','pl1','pl2','gainDx','sxPx','_99Out'];

// a list of the data, that we modify as we go
let globalRowData: TradeRecord[] = [];

// start the book id's and trade id's at some future random number
let nextBookId = 62472;
let nextTradeId = 24287;
let nextBatchId = 101;

let latestTestNumber = 0;

// https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
function randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTradeRecord(product: string, portfolio: string, book: string, batch: number): TradeRecord {
    const current = Math.floor(Math.random() * 100000) + 100;
    const previous = current + Math.floor(Math.random() * 10000) - 2000;
    const trade: TradeRecord = {
        product: product,
        portfolio: portfolio,
        book: book,
        trade: createTradeId(),
        submitterID: randomBetween(10, 1000),
        submitterDealID: randomBetween(10, 1000),
        dealType: Math.random() < 0.2 ? 'Physical' : 'Financial',
        bidFlag: Math.random() < 0.5 ? 'Buy' : 'Sell',
        current: current,
        previous: previous,
        pl1: randomBetween(100, 1000),
        pl2: randomBetween(100, 1000),
        gainDx: randomBetween(100, 1000),
        sxPx: randomBetween(100, 1000),
        _99Out: randomBetween(100, 1000),
        batch: batch
    };
    return trade;
}

function createBookName(): string {
    nextBookId++;
    return 'GL-' + nextBookId;
}

function createTradeId(): number {
    nextTradeId++;
    return nextTradeId;
}

// build up the test data
function createRowData(): void {
    globalRowData = [];
    const thisBatch = nextBatchId++;
    for (let i = 0; i < PRODUCTS.length; i++) {
        const product = PRODUCTS[i];
        for (let j = 0; j < PORTFOLIOS.length; j++) {
            const portfolio = PORTFOLIOS[j];
            for (let k = 0; k < BOOK_COUNT; k++) {
                const book = createBookName();
                for (let l = 0; l < TRADE_COUNT; l++) {
                    const trade = createTradeRecord(product, portfolio, book, thisBatch);
                    globalRowData.push(trade);
                }
            }
        }
    }
    console.log('Total number of records sent to grid = ' + globalRowData.length);
}

function updateSomeItems(updateCount: number): TradeRecord[] {
    const itemsToUpdate: TradeRecord[] = [];
    for (let k = 0; k < updateCount; k++) {
        if (globalRowData.length === 0) { continue; }
        const indexToUpdate = Math.floor(Math.random() * globalRowData.length);
        const itemToUpdate = globalRowData[indexToUpdate];

        // Update a random value field
        const field = VALUE_FIELDS[Math.floor(Math.random() * VALUE_FIELDS.length)];
        (itemToUpdate as any)[field] = Math.floor(Math.random() * 100000);

        itemsToUpdate.push(itemToUpdate);
    }
    return itemsToUpdate;
}

function sendMessagesWithThrottle(thisTestNumber: number): void {
    const message: WorkerMessage = {
        type: 'start',
        messageCount: undefined,
        updateCount: LOAD_TEST_UPDATES_PER_MESSAGE,
        interval: LOAD_TEST_MILLISECONDS_BETWEEN_MESSAGES
    };
    self.postMessage(message);

    let intervalId: ReturnType<typeof setInterval>;

    function intervalFunc() {
        const updateMessage: WorkerMessage = {
            type: 'updateData',
            records: updateSomeItems(LOAD_TEST_UPDATES_PER_MESSAGE)
        };
        self.postMessage(updateMessage);
        
        if (thisTestNumber !== latestTestNumber) {
            clearInterval(intervalId);
        }
    }

    intervalId = setInterval(intervalFunc, LOAD_TEST_MILLISECONDS_BETWEEN_MESSAGES);
}

function sendMessagesNoThrottle(): void {
    const startMessage: WorkerMessage = {
        type: 'start',
        messageCount: STRESS_TEST_MESSAGE_COUNT,
        updateCount: STRESS_TEST_UPDATES_PER_MESSAGE,
        interval: null
    };
    self.postMessage(startMessage);

    // pump in 1000 messages without waiting
    for (let i = 0; i <= STRESS_TEST_MESSAGE_COUNT; i++) {
        const updateMessage: WorkerMessage = {
            type: 'updateData',
            records: updateSomeItems(STRESS_TEST_UPDATES_PER_MESSAGE)
        };
        self.postMessage(updateMessage);
    }

    const endMessage: WorkerMessage = {
        type: 'end',
        messageCount: STRESS_TEST_MESSAGE_COUNT,
        updateCount: STRESS_TEST_UPDATES_PER_MESSAGE
    };
    self.postMessage(endMessage);
}

// Initialize data on worker start
createRowData();

// Send initial data
const initialDataMessage: WorkerMessage = {
    type: 'setRowData',
    records: globalRowData
};
self.postMessage(initialDataMessage);

function sendExtremeStressTest(thisTestNumber: number): void {
    const startTime = Date.now();
    let totalUpdates = 0;
    
    const targetUpdatesPerSecond = 150000;
    const batchSize = EXTREME_TEST_BATCH_SIZE;
    const intervalMs = EXTREME_TEST_INTERVAL_MS;
    
    const message: WorkerMessage = {
        type: 'start',
        messageCount: undefined,
        updateCount: batchSize,
        interval: intervalMs
    };
    self.postMessage(message);
    
    console.log(`Starting extreme stress test: ${batchSize} updates every ${intervalMs}ms = ${(1000/intervalMs) * batchSize} updates/sec`);
    
    let intervalId: ReturnType<typeof setInterval>;
    
    function intervalFunc() {
        const elapsed = Date.now() - startTime;
        if (elapsed >= EXTREME_TEST_DURATION_MS || thisTestNumber !== latestTestNumber) {
            clearInterval(intervalId);
            
            const actualUpdatesPerSecond = Math.floor((totalUpdates / elapsed) * 1000);
            const endMessage: WorkerMessage = {
                type: 'end',
                messageCount: Math.floor(totalUpdates / batchSize),
                updateCount: batchSize
            };
            self.postMessage(endMessage);
            
            console.log(`Extreme stress test complete:`);
            console.log(`Total updates: ${totalUpdates.toLocaleString()}`);
            console.log(`Duration: ${elapsed}ms`);
            console.log(`Actual rate: ${actualUpdatesPerSecond.toLocaleString()} updates/sec`);
            console.log(`Target was: ${targetUpdatesPerSecond.toLocaleString()} updates/sec`);
            return;
        }
        
        const updateMessage: WorkerMessage = {
            type: 'updateData',
            records: updateSomeItems(batchSize)
        };
        self.postMessage(updateMessage);
        totalUpdates += batchSize;
    }
    
    intervalId = setInterval(intervalFunc, intervalMs);
}

// Listen for messages from main thread
self.addEventListener('message', function(e: MessageEvent<string>) {
    // any previous tests will see that this test number
    // has increased and will then stop their tests
    latestTestNumber++;
    
    switch (e.data) {
        case 'startStress':
            console.log('starting stress test');
            sendMessagesNoThrottle();
            break;
        case 'startLoad':
            console.log('starting load test');
            sendMessagesWithThrottle(latestTestNumber);
            break;
        case 'startExtreme':
            console.log('starting extreme stress test (150k updates/sec)');
            sendExtremeStressTest(latestTestNumber);
            break;
        case 'stop':
        case 'stopTest':
            console.log('stopping test');
            // latestTestNumber change will stop the interval
            break;
        default:
            console.log('unknown message type ' + e.data);
            break;
    }
});