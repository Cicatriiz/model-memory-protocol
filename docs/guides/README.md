# Model Memory Protocol Usage Guide

This guide provides comprehensive instructions for using the Model Memory Protocol (MMP) in your applications.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Advanced Features](#advanced-features)
4. [Configuration](#configuration)
5. [Best Practices](#best-practices)
6. [Integration Examples](#integration-examples)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

```bash
npm install model-memory-protocol
```

### Basic Setup

```typescript
import { MemoryProtocol, MemoryType, StorageTier } from 'model-memory-protocol';

const protocol = new MemoryProtocol({
  version: '1.0.0',
  transports: [
    { type: 'websocket', options: { port: 8080 } }
  ],
  storage: [
    { 
      backend: 'in-memory', 
      tier: StorageTier.MAIN_CONTEXT, 
      priority: 1,
      options: {}
    }
  ],
  security: {
    authentication: { type: 'jwt', options: {} },
    authorization: { enabled: false, rules: [] },
    encryption: { enabled: false, algorithm: 'aes-256-gcm', keyRotation: false }
  },
  processing: {
    embedding: { model: 'text-embedding-ada-002', dimensions: 1536, batchSize: 100 },
    chunking: { strategy: 'fixed', size: 1000, overlap: 200 },
    deduplication: { enabled: true, threshold: 0.9 }
  },
  consolidation: {
    enabled: true,
    strategy: 'hybrid',
    interval: 3600,
    batchSize: 100,
    retention: {
      [MemoryType.WORKING]: 3600,
      [MemoryType.EPISODIC]: 86400,
      [MemoryType.SEMANTIC]: 2592000,
      [MemoryType.PROCEDURAL]: 7776000,
      [MemoryType.ARCHIVAL]: -1
    }
  }
});

await protocol.initialize();
```

## Basic Usage

### Creating a Session

```typescript
// Create a session for a user
const sessionId = await protocol.createSession('user123');

// Create a session for an AI agent
const agentSessionId = await protocol.createSession(undefined, 'agent456');

// Create a session for both user and agent
const sharedSessionId = await protocol.createSession('user123', 'agent456');
```

### Storing Memories

```typescript
// Store semantic memory (facts and knowledge)
const semanticMemoryId = await protocol.store(
  "The user prefers TypeScript over JavaScript for development",
  MemoryType.SEMANTIC,
  sessionId,
  {
    importance: 0.8,
    tags: ['preference', 'programming', 'languages'],
    source: 'user_conversation'
  }
);

// Store episodic memory (events and experiences)
const episodicMemoryId = await protocol.store(
  "User completed the onboarding tutorial at 2:30 PM",
  MemoryType.EPISODIC,
  sessionId,
  {
    importance: 0.6,
    tags: ['onboarding', 'tutorial', 'completion'],
    source: 'system_event'
  }
);

// Store procedural memory (how-to knowledge)
const proceduralMemoryId = await protocol.store(
  "To deploy the application, run 'npm run build' then 'npm run deploy'",
  MemoryType.PROCEDURAL,
  sessionId,
  {
    importance: 0.9,
    tags: ['deployment', 'process', 'commands'],
    source: 'documentation'
  }
);
```

### Retrieving Memories

```typescript
// Basic retrieval
const results = await protocol.retrieve(
  "programming preferences",
  sessionId
);

// Advanced retrieval with filters
const advancedResults = await protocol.retrieve(
  "deployment process",
  sessionId,
  {
    limit: 5,
    threshold: 0.8,
    memoryTypes: [MemoryType.PROCEDURAL, MemoryType.SEMANTIC],
    timeRange: {
      start: new Date(Date.now() - 86400000), // Last 24 hours
      end: new Date()
    },
    includeMetadata: true,
    filters: {
      source: 'documentation'
    }
  }
);

console.log(`Found ${advancedResults.totalCount} memories`);
advancedResults.memories.forEach(memory => {
  console.log(`${memory.memoryType}: ${memory.content.text}`);
});
```

### Updating Memories

```typescript
// Update memory importance
await protocol.update(
  semanticMemoryId,
  {
    metadata: { importance: 0.9 }
  },
  sessionId
);

// Add tags to memory
await protocol.update(
  episodicMemoryId,
  {
    content: { 
      tags: ['onboarding', 'tutorial', 'completion', 'successful'] 
    }
  },
  sessionId
);
```

### Deleting Memories

```typescript
// Delete a specific memory
await protocol.delete(episodicMemoryId, sessionId);
```

## Advanced Features

### Memory Relationships

```typescript
// Store memory with relationships
const parentMemoryId = await protocol.store(
  "User is working on a React project",
  MemoryType.SEMANTIC,
  sessionId,
  {
    importance: 0.7,
    tags: ['project', 'react', 'development']
  }
);

const childMemoryId = await protocol.store(
  "User prefers functional components over class components",
  MemoryType.SEMANTIC,
  sessionId,
  {
    importance: 0.8,
    tags: ['react', 'components', 'preference'],
    relationships: [
      {
        type: 'part_of',
        targetId: parentMemoryId,
        strength: 0.9
      }
    ]
  }
);
```

### Memory Chunking

```typescript
// Store large content that will be automatically chunked
const largeContent = `
  This is a very long document about software development practices...
  [... thousands of words ...]
`;

const chunkedMemoryId = await protocol.store(
  largeContent,
  MemoryType.SEMANTIC,
  sessionId,
  {
    importance: 0.8,
    tags: ['documentation', 'practices', 'development']
  }
);
```

### Time-based Queries

```typescript
// Get memories from the last hour
const recentMemories = await protocol.retrieve(
  "recent activity",
  sessionId,
  {
    timeRange: {
      start: new Date(Date.now() - 3600000), // 1 hour ago
      end: new Date()
    }
  }
);

// Get memories from a specific date range
const dateRangeMemories = await protocol.retrieve(
  "project work",
  sessionId,
  {
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    }
  }
);
```

## Configuration

### Storage Configuration

```typescript
// Multiple storage backends
const config = {
  storage: [
    {
      backend: 'in-memory',
      tier: StorageTier.MAIN_CONTEXT,
      priority: 1,
      options: {}
    },
    {
      backend: 'vector-store',
      tier: StorageTier.VECTOR_STORE,
      priority: 2,
      options: {
        endpoint: 'http://localhost:6333',
        collection: 'memories'
      }
    },
    {
      backend: 'graph-store',
      tier: StorageTier.GRAPH_STORE,
      priority: 3,
      options: {
        endpoint: 'bolt://localhost:7687',
        username: 'neo4j',
        password: 'password'
      }
    }
  ]
};
```

### Security Configuration

```typescript
// JWT Authentication
const securityConfig = {
  authentication: {
    type: 'jwt',
    options: {
      secret: process.env.JWT_SECRET,
      expiresIn: '24h',
      issuer: 'memory-protocol'
    }
  },
  authorization: {
    enabled: true,
    rules: [
      {
        resource: 'memory',
        action: 'read',
        condition: 'user.id == context.userId'
      },
      {
        resource: 'memory',
        action: 'write',
        condition: 'user.permissions.includes("memory.write")'
      }
    ]
  },
  encryption: {
    enabled: true,
    algorithm: 'aes-256-gcm',
    keyRotation: true
  }
};
```

### Processing Configuration

```typescript
// Advanced processing options
const processingConfig = {
  embedding: {
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    batchSize: 100
  },
  chunking: {
    strategy: 'semantic', // or 'fixed', 'sliding'
    size: 1000,
    overlap: 200
  },
  deduplication: {
    enabled: true,
    threshold: 0.95
  }
};
```

## Best Practices

### Memory Types

1. **Semantic Memory**: Use for facts, knowledge, and general information
   ```typescript
   // Good
   await protocol.store("Python is a programming language", MemoryType.SEMANTIC, sessionId);
   
   // Bad - this is episodic, not semantic
   await protocol.store("User learned Python yesterday", MemoryType.SEMANTIC, sessionId);
   ```

2. **Episodic Memory**: Use for events, experiences, and time-bound information
   ```typescript
   // Good
   await protocol.store("User completed task X at 3:30 PM", MemoryType.EPISODIC, sessionId);
   ```

3. **Procedural Memory**: Use for step-by-step processes and procedures
   ```typescript
   // Good
   await protocol.store("To reset password: 1) Click forgot password 2) Enter email 3) Check inbox", MemoryType.PROCEDURAL, sessionId);
   ```

### Metadata Management

```typescript
// Use descriptive tags
const goodMetadata = {
  importance: 0.8,
  tags: ['user-preference', 'ui-theme', 'accessibility'],
  source: 'settings-page',
  confidence: 0.95
};

// Set appropriate importance levels
// 0.0-0.3: Low importance (temporary, easily replaceable)
// 0.4-0.6: Medium importance (useful but not critical)
// 0.7-0.9: High importance (critical information)
// 1.0: Maximum importance (never delete)
```

### Session Management

```typescript
// Create separate sessions for different contexts
const userChatSession = await protocol.createSession('user123', 'chat-agent');
const userTaskSession = await protocol.createSession('user123', 'task-agent');

// Close sessions when done
await protocol.closeSession(userChatSession);
await protocol.closeSession(userTaskSession);
```

### Error Handling

```typescript
import { MemoryProtocolError, StorageError, TransportError } from 'model-memory-protocol';

async function safeMemoryOperation() {
  try {
    await protocol.store(content, type, sessionId);
  } catch (error) {
    if (error instanceof StorageError) {
      console.error('Storage failed:', error.message);
      // Implement retry logic
    } else if (error instanceof TransportError) {
      console.error('Transport failed:', error.message);
      // Implement reconnection logic
    } else {
      console.error('Unknown error:', error);
      // Implement fallback logic
    }
  }
}
```

## Integration Examples

### With Express.js

```typescript
import express from 'express';
import { MemoryProtocol, MemoryType } from 'model-memory-protocol';

const app = express();
app.use(express.json());

// Initialize protocol
const protocol = new MemoryProtocol(config);
await protocol.initialize();

// Store memory endpoint
app.post('/memories', async (req, res) => {
  try {
    const { content, type, sessionId, metadata } = req.body;
    const memoryId = await protocol.store(content, type, sessionId, metadata);
    res.json({ memoryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve memories endpoint
app.get('/memories', async (req, res) => {
  try {
    const { query, sessionId, ...options } = req.query;
    const results = await protocol.retrieve(query, sessionId, options);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### With Socket.io

```typescript
import { Server } from 'socket.io';
import { MemoryProtocol } from 'model-memory-protocol';

const io = new Server(server);
const protocol = new MemoryProtocol(config);

io.on('connection', (socket) => {
  socket.on('store-memory', async (data) => {
    try {
      const memoryId = await protocol.store(
        data.content,
        data.type,
        data.sessionId,
        data.metadata
      );
      socket.emit('memory-stored', { memoryId });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('retrieve-memories', async (data) => {
    try {
      const results = await protocol.retrieve(
        data.query,
        data.sessionId,
        data.options
      );
      socket.emit('memories-retrieved', results);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });
});
```

## Troubleshooting

### Common Issues

1. **Memory Not Found**
   ```typescript
   // Check if memory exists before updating/deleting
   const results = await protocol.retrieve("", sessionId, { id: memoryId });
   if (results.memories.length === 0) {
     console.log('Memory not found');
   }
   ```

2. **Session Not Found**
   ```typescript
   // Verify session exists
   try {
     await protocol.store(content, type, sessionId);
   } catch (error) {
     if (error.message.includes('Session not found')) {
       const newSessionId = await protocol.createSession(userId, agentId);
       await protocol.store(content, type, newSessionId);
     }
   }
   ```

3. **Storage Backend Issues**
   ```typescript
   // Check storage backend health
   protocol.on('error', (error) => {
     console.error('Protocol error:', error);
   });
   ```

### Performance Optimization

1. **Batch Operations**
   ```typescript
   // Store multiple memories efficiently
   const memories = [
     { content: "Memory 1", type: MemoryType.SEMANTIC },
     { content: "Memory 2", type: MemoryType.SEMANTIC },
     { content: "Memory 3", type: MemoryType.SEMANTIC }
   ];

   const memoryIds = await Promise.all(
     memories.map(m => protocol.store(m.content, m.type, sessionId))
   );
   ```

2. **Optimize Retrieval**
   ```typescript
   // Use specific filters to reduce search space
   const results = await protocol.retrieve(
     "query",
     sessionId,
     {
       limit: 10,
       threshold: 0.8,
       memoryTypes: [MemoryType.SEMANTIC], // Specific type
       timeRange: { start: recentDate },   // Time filter
       includeMetadata: false              // Reduce payload
     }
   );
   ```

3. **Monitor Performance**
   ```typescript
   protocol.on('memoryRetrieved', (event) => {
     console.log(`Search took ${event.results.searchTime}ms`);
   });
   ```

### Debug Mode

```typescript
// Enable debug logging
const protocol = new MemoryProtocol({
  ...config,
  debug: true
});

// Listen to all events
protocol.on('memoryStored', (event) => console.log('Stored:', event));
protocol.on('memoryRetrieved', (event) => console.log('Retrieved:', event));
protocol.on('sessionCreated', (event) => console.log('Session created:', event));
```

This guide should help you get started with the Model Memory Protocol and implement it effectively in your applications. For more advanced use cases, refer to the API documentation and examples.
