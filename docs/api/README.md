# Model Memory Protocol API Reference

## Table of Contents

1. [Core Protocol API](#core-protocol-api)
2. [Memory Operations](#memory-operations)
3. [Session Management](#session-management)
4. [Storage Backends](#storage-backends)
5. [Transport Layer](#transport-layer)
6. [Security](#security)
7. [Error Handling](#error-handling)

## Core Protocol API

### MemoryProtocol Class

The main entry point for interacting with the Model Memory Protocol.

```typescript
import { MemoryProtocol, MemoryProtocolConfig } from 'model-memory-protocol';

const protocol = new MemoryProtocol(config: MemoryProtocolConfig);
```

#### Methods

##### `initialize(): Promise<void>`

Initialize the memory protocol with configured storage backends and transports.

```typescript
await protocol.initialize();
```

**Throws**: `MemoryProtocolError` if already initialized or initialization fails.

##### `createSession(userId?: string, agentId?: string): Promise<string>`

Create a new memory session for a user or agent.

```typescript
const sessionId = await protocol.createSession('user123', 'agent456');
```

**Parameters**:
- `userId` (optional): User identifier
- `agentId` (optional): Agent identifier

**Returns**: Promise resolving to session ID string

##### `closeSession(sessionId: string): Promise<void>`

Close an existing memory session.

```typescript
await protocol.closeSession(sessionId);
```

**Parameters**:
- `sessionId`: Session identifier to close

**Throws**: `MemoryProtocolError` if session not found

##### `shutdown(): Promise<void>`

Shutdown the protocol, closing all sessions and connections.

```typescript
await protocol.shutdown();
```

## Memory Operations

### Store Memory

Store a new memory in the protocol.

```typescript
const memoryId = await protocol.store(
  content: string,
  type: MemoryType,
  sessionId: string,
  metadata?: Partial<MemoryMetadata>
): Promise<string>
```

**Parameters**:
- `content`: The memory content as text
- `type`: Memory type (EPISODIC, SEMANTIC, PROCEDURAL, WORKING, ARCHIVAL)
- `sessionId`: Session identifier
- `metadata`: Optional metadata object

**Example**:
```typescript
const memoryId = await protocol.store(
  "User prefers dark mode in applications",
  MemoryType.SEMANTIC,
  sessionId,
  {
    importance: 0.8,
    tags: ['preference', 'ui'],
    source: 'user_settings'
  }
);
```

### Retrieve Memories

Search and retrieve memories based on a query.

```typescript
const results = await protocol.retrieve(
  query: string,
  sessionId: string,
  options?: Partial<MemoryQuery>
): Promise<MemorySearchResult>
```

**Parameters**:
- `query`: Search query string
- `sessionId`: Session identifier
- `options`: Optional search parameters

**Options**:
- `limit`: Maximum number of results (default: 10)
- `threshold`: Similarity threshold (default: 0.7)
- `memoryTypes`: Filter by memory types
- `timeRange`: Filter by time range
- `includeMetadata`: Include metadata in results
- `includeContent`: Include content in results

**Example**:
```typescript
const results = await protocol.retrieve(
  "user interface preferences",
  sessionId,
  {
    limit: 5,
    threshold: 0.8,
    memoryTypes: [MemoryType.SEMANTIC],
    includeMetadata: true
  }
);
```

### Update Memory

Update an existing memory.

```typescript
await protocol.update(
  memoryId: string,
  updates: Partial<MemoryEvent>,
  sessionId: string
): Promise<void>
```

**Parameters**:
- `memoryId`: Memory identifier to update
- `updates`: Partial memory event with updates
- `sessionId`: Session identifier

**Example**:
```typescript
await protocol.update(
  memoryId,
  {
    metadata: { importance: 0.9 },
    content: { tags: ['preference', 'ui', 'dark-mode'] }
  },
  sessionId
);
```

### Delete Memory

Delete a memory from the protocol.

```typescript
await protocol.delete(
  memoryId: string,
  sessionId: string
): Promise<void>
```

**Parameters**:
- `memoryId`: Memory identifier to delete
- `sessionId`: Session identifier

## Session Management

### MemoryContext

Context information for memory sessions.

```typescript
interface MemoryContext {
  version: string;
  sessionId: string;
  memoryId: string;
  flags: string;
  state: Record<string, string>;
  timestamp: Date;
  userId?: string;
  agentId?: string;
}
```

### Session Headers

For context propagation across requests:

```
Memory-Context: version-session_id-memory_id-flags
Memory-State: key1=value1,key2=value2
```

## Storage Backends

### StorageBackend Interface

All storage backends implement this interface:

```typescript
interface StorageBackend {
  name: string;
  type: StorageTier;
  initialize(): Promise<void>;
  store(event: MemoryEvent): Promise<void>;
  retrieve(query: MemoryQuery): Promise<MemorySearchResult>;
  update(id: string, updates: Partial<MemoryEvent>): Promise<void>;
  delete(id: string): Promise<void>;
  consolidate?(events: MemoryEvent[]): Promise<MemoryEvent[]>;
  close(): Promise<void>;
}
```

### InMemoryBackend

Fast in-memory storage for working memory:

```typescript
import { InMemoryBackend } from 'model-memory-protocol/storage';

const backend = new InMemoryBackend();
await backend.initialize();
```

**Methods**:
- `getAllEvents()`: Get all stored events
- `getEventCount()`: Get total event count
- `clear()`: Clear all events

## Transport Layer

### WebSocket Transport

Real-time bidirectional communication:

```typescript
import { WebSocketTransport } from 'model-memory-protocol/transport';

const transport = new WebSocketTransport('ws://localhost:8080', {
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000
});

await transport.connect();
```

**Events**:
- `connected`: Connection established
- `disconnected`: Connection lost
- `message`: Message received
- `error`: Transport error
- `reconnecting`: Attempting reconnection

### WebSocket Server Transport

Accept incoming connections:

```typescript
import { WebSocketServerTransport } from 'model-memory-protocol/transport';

const server = new WebSocketServerTransport(8080);
await server.connect();
```

**Events**:
- `clientConnected`: New client connected
- `clientDisconnected`: Client disconnected
- `message`: Message from client

## Security

### Authentication

Configure authentication in the protocol config:

```typescript
const config: MemoryProtocolConfig = {
  security: {
    authentication: {
      type: 'jwt',
      options: {
        secret: 'your-secret-key',
        expiresIn: '24h'
      }
    },
    authorization: {
      enabled: true,
      rules: [
        { resource: 'memory', action: 'read', condition: 'user.id == context.userId' }
      ]
    },
    encryption: {
      enabled: true,
      algorithm: 'aes-256-gcm',
      keyRotation: true
    }
  }
};
```

### Authorization Rules

Define fine-grained access control:

```typescript
interface AuthorizationRule {
  resource: string;  // Resource type (memory, session, etc.)
  action: string;    // Action (read, write, delete, etc.)
  condition?: string; // Optional condition expression
}
```

## Error Handling

### Error Types

```typescript
// Base error class
class MemoryProtocolError extends Error {
  constructor(message: string, code: number, data?: any);
}

// Specific error types
class StorageError extends MemoryProtocolError;
class TransportError extends MemoryProtocolError;
class AuthenticationError extends MemoryProtocolError;
class AuthorizationError extends MemoryProtocolError;
```

### Error Codes

- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Access denied
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Storage error
- `502`: Bad Gateway - Transport error

### Error Handling Example

```typescript
try {
  await protocol.store(content, type, sessionId);
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication error
    console.error('Authentication failed:', error.message);
  } else if (error instanceof StorageError) {
    // Handle storage error
    console.error('Storage error:', error.message);
  } else {
    // Handle other errors
    console.error('Unknown error:', error);
  }
}
```

## Type Definitions

### Core Types

```typescript
// Memory event types
enum MemoryEventType {
  STORE = 'store',
  RETRIEVE = 'retrieve',
  UPDATE = 'update',
  DELETE = 'delete',
  CONSOLIDATE = 'consolidate',
  EVICT = 'evict'
}

// Memory types
enum MemoryType {
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
  WORKING = 'working',
  ARCHIVAL = 'archival'
}

// Storage tiers
enum StorageTier {
  MAIN_CONTEXT = 'main_context',
  EXTERNAL_CONTEXT = 'external_context',
  VECTOR_STORE = 'vector_store',
  GRAPH_STORE = 'graph_store',
  TEMPORAL_STORE = 'temporal_store'
}
```

### Memory Event Structure

```typescript
interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  memoryType: MemoryType;
  context: MemoryContext;
  content: MemoryContent;
  metadata: MemoryMetadata;
  timestamp: Date;
  ttl?: number;
}

interface MemoryContent {
  text: string;
  embedding?: number[];
  embeddingModel?: string;
  keywords?: string[];
  tags?: string[];
  relationships?: MemoryRelationship[];
  chunks?: MemoryChunk[];
}

interface MemoryMetadata {
  source: string;
  confidence: number;
  importance: number;
  accessCount: number;
  lastAccessed: Date;
  created: Date;
  updated: Date;
  storageTier: StorageTier;
  compressionLevel?: number;
  [key: string]: any;
}
```

## Constants

```typescript
const MEMORY_PROTOCOL_VERSION = '1.0.0';
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const DEFAULT_SEARCH_LIMIT = 10;
const DEFAULT_TTL = 86400; // 24 hours
```
