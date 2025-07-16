# Provider Architecture Comparison

## Current Architecture (One Window Per Provider)

```mermaid
graph TB
    subgraph "Current: 100 Datasources = 100 Windows"
        DT1[DataTable 1] -->|Channel| PW1[Provider Window 1<br/>STOMP DS1]
        DT2[DataTable 2] -->|Channel| PW2[Provider Window 2<br/>STOMP DS2]
        DT3[DataTable 3] -->|Channel| PW3[Provider Window 3<br/>STOMP DS3]
        DT4[DataTable 4] -->|Channel| PW4[Provider Window 4<br/>REST DS4]
        DT5[DataTable 5] -->|Channel| PW5[Provider Window 5<br/>STOMP DS5]
        
        DTN[DataTable N] -->|Channel| PWN[Provider Window 100<br/>STOMP DS100]
        
        PW1 -->|WebSocket| S1[STOMP Server 1]
        PW2 -->|WebSocket| S1
        PW3 -->|WebSocket| S2[STOMP Server 2]
        PW4 -->|HTTP| RS1[REST Server]
        PW5 -->|WebSocket| S2
        PWN -->|WebSocket| S3[STOMP Server 3]
    end
    
    style PW1 fill:#ff9999
    style PW2 fill:#ff9999
    style PW3 fill:#ff9999
    style PW4 fill:#ffcc99
    style PW5 fill:#ff9999
    style PWN fill:#ff9999
```

### Problems:
- 100 separate OS windows
- High memory usage (each window ~50-100MB)
- OS window handle limits
- Difficult to manage and monitor
- No connection sharing

## Proposed Architecture (Provider Pool)

```mermaid
graph TB
    subgraph "Proposed: Provider Pool Architecture"
        subgraph "DataTables"
            DT1B[DataTable 1]
            DT2B[DataTable 2]
            DT3B[DataTable 3]
            DT4B[DataTable 4]
            DT5B[DataTable 5]
            DTNB[DataTable N]
        end
        
        subgraph "Provider Pool Manager"
            PM[Provider Manager<br/>Single Window]
            PM --> LB[Load Balancer]
            PM --> HM[Health Monitor]
            PM --> CM[Connection Manager]
        end
        
        subgraph "Worker Pool (5-10 windows)"
            W1[Worker 1<br/>Handles 20 providers]
            W2[Worker 2<br/>Handles 20 providers]
            W3[Worker 3<br/>Handles 20 providers]
            W4[Worker 4<br/>Handles 20 providers]
            W5[Worker 5<br/>Handles 20 providers]
        end
        
        subgraph "Connection Pooling"
            CP1[STOMP Connection Pool<br/>Server 1]
            CP2[STOMP Connection Pool<br/>Server 2]
            CP3[REST Connection Pool]
        end
        
        DT1B -->|Channel<br/>provider-1| PM
        DT2B -->|Channel<br/>provider-2| PM
        DT3B -->|Channel<br/>provider-3| PM
        DT4B -->|Channel<br/>provider-4| PM
        DT5B -->|Channel<br/>provider-5| PM
        DTNB -->|Channel<br/>provider-100| PM
        
        LB --> W1
        LB --> W2
        LB --> W3
        LB --> W4
        LB --> W5
        
        W1 --> CP1
        W1 --> CP2
        W2 --> CP1
        W2 --> CP3
        W3 --> CP2
        W3 --> CP3
        W4 --> CP1
        W5 --> CP2
        
        CP1 -->|Single WebSocket<br/>Multiplexed| S1B[STOMP Server 1]
        CP2 -->|Single WebSocket<br/>Multiplexed| S2B[STOMP Server 2]
        CP3 -->|HTTP Pool| RS1B[REST Server]
    end
    
    style PM fill:#99ff99
    style W1 fill:#99ccff
    style W2 fill:#99ccff
    style W3 fill:#99ccff
    style W4 fill:#99ccff
    style W5 fill:#99ccff
```

## Detailed Component Architecture

```mermaid
graph TB
    subgraph "Provider Worker Details"
        subgraph "Worker Window Process"
            MW[Main Worker Thread]
            MW --> PR[Provider Registry<br/>Maps providerID to instance]
            MW --> MQ[Message Queue<br/>Incoming requests]
            MW --> CS[Channel Subscriber<br/>Per provider]
            
            subgraph "Provider Instances"
                P1[STOMP Provider 1<br/>DS Config 1]
                P2[STOMP Provider 2<br/>DS Config 2]
                P3[REST Provider 3<br/>DS Config 3]
                PN[Provider N<br/>DS Config N]
            end
            
            subgraph "Shared Resources"
                CM2[Connection Manager]
                SC[Shared STOMP Client<br/>Per server]
                RC[REST Client Pool]
                CB[Circuit Breaker]
            end
            
            PR --> P1
            PR --> P2
            PR --> P3
            PR --> PN
            
            P1 --> CM2
            P2 --> CM2
            P3 --> CM2
            PN --> CM2
            
            CM2 --> SC
            CM2 --> RC
            CM2 --> CB
        end
    end
    
    subgraph "Message Flow"
        DTX[DataTable X] -->|1. Request| Chan[Channel<br/>data-provider-X]
        Chan -->|2. Route| PMX[Provider Manager]
        PMX -->|3. Forward| WX[Worker N]
        WX -->|4. Process| PX[Provider X Instance]
        PX -->|5. Fetch| DSX[Data Source]
        DSX -->|6. Data| PX
        PX -->|7. Publish| Chan
        Chan -->|8. Deliver| DTX
    end
```

## Benefits of Provider Pool Architecture

### 1. **Resource Efficiency**
- 5-10 windows instead of 100
- Shared memory and connections
- ~80% reduction in resource usage

### 2. **Connection Pooling**
- Multiple providers share WebSocket connections
- Connection multiplexing for same servers
- Reduced network overhead

### 3. **Better Management**
- Centralized monitoring
- Easy health checks
- Graceful scaling

### 4. **Load Balancing**
- Even distribution across workers
- Dynamic rebalancing
- Failover support

### 5. **Performance**
- Reduced context switching
- Shared data caching
- Batch processing

## Implementation Strategy

```mermaid
sequenceDiagram
    participant DT as DataTable
    participant PM as Provider Manager
    participant LB as Load Balancer
    participant W as Worker
    participant P as Provider Instance
    participant DS as Data Source
    
    DT->>PM: Connect to provider-123
    PM->>LB: Find best worker
    LB->>PM: Assign to Worker-2
    PM->>W: Create provider-123
    W->>P: Initialize provider
    P->>DS: Connect to datasource
    DS->>P: Connection established
    P->>W: Provider ready
    W->>PM: Provider-123 active
    PM->>DT: Channel ready
    
    Note over DT,DS: Real-time data flow
    DS->>P: Data update
    P->>W: Process update
    W->>PM: Publish to channel
    PM->>DT: Deliver update
```

## Configuration Example

```typescript
interface ProviderPoolConfig {
  pool: {
    minWorkers: 2,
    maxWorkers: 10,
    providersPerWorker: 20,
    workerIdleTimeout: 300000, // 5 minutes
    healthCheckInterval: 30000  // 30 seconds
  },
  connectionSharing: {
    enabled: true,
    maxConnectionsPerServer: 5,
    connectionIdleTimeout: 60000
  },
  loadBalancing: {
    strategy: 'round-robin', // or 'least-loaded'
    rebalanceThreshold: 0.8,
    rebalanceInterval: 60000
  }
}
```