/**
 * Basic usage example for Model Memory Protocol (MMP)
 * Demonstrates core functionality including session management,
 * memory storage, retrieval, and updates.
 */

import { MemoryType, StorageTier, MemoryProtocolError } from '../core/types.js';
import { MemoryProtocol } from '../core/memoryProtocol.js';
import { InMemoryBackend } from '../storage/inMemoryBackend.js';

async function basicUsageExample() {
  console.log('🚀 Model Memory Protocol - Basic Usage Example\n');

  // Configuration for the protocol
  const config = {
    version: '1.0.0',
    transports: [],
    storage: [
      {
        backend: 'in-memory',
        tier: StorageTier.MAIN_CONTEXT,
        priority: 1,
        options: {}
      }
    ],
    security: {
      authentication: { type: 'jwt' as const, options: {} },
      authorization: { enabled: false, rules: [] },
      encryption: { enabled: false, algorithm: 'aes-256-gcm', keyRotation: false }
    },
    processing: {
      embedding: { model: 'text-embedding-ada-002', dimensions: 1536, batchSize: 100 },
      chunking: { strategy: 'fixed' as const, size: 1000, overlap: 200 },
      deduplication: { enabled: true, threshold: 0.9 }
    },
    consolidation: {
      enabled: false,
      strategy: 'hybrid' as const,
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
  };

  try {
    // Initialize protocol
    const protocol = new MemoryProtocol(config);
    
    // Add in-memory backend manually for this example
    const inMemoryBackend = new InMemoryBackend();
    await inMemoryBackend.initialize();
    protocol['storageBackends'].set('in-memory', inMemoryBackend);
    
    console.log('✅ Protocol initialized successfully');

    // Create a session
    const sessionId = await protocol.createSession('user123', 'assistant-agent');
    console.log(`✅ Session created: ${sessionId}`);

    // Store different types of memories
    console.log('\n📝 Storing memories...');
    
    // Semantic memory - facts and knowledge
    const semanticMemoryId = await protocol.store(
      'The user prefers TypeScript over JavaScript for web development',
      MemoryType.SEMANTIC,
      sessionId,
      {
        importance: 0.8,
        tags: ['preference', 'programming', 'typescript', 'javascript'],
        source: 'user_conversation',
        confidence: 0.9
      }
    );
    console.log(`✅ Semantic memory stored: ${semanticMemoryId}`);

    // Episodic memory - events and experiences
    const episodicMemoryId = await protocol.store(
      'User completed the React tutorial on July 9th, 2025 at 2:30 PM',
      MemoryType.EPISODIC,
      sessionId,
      {
        importance: 0.6,
        tags: ['tutorial', 'react', 'completion', 'learning'],
        source: 'system_event',
        confidence: 1.0
      }
    );
    console.log(`✅ Episodic memory stored: ${episodicMemoryId}`);

    // Procedural memory - how-to knowledge
    const proceduralMemoryId = await protocol.store(
      'To create a new React component: 1) Create a new .tsx file 2) Export a function component 3) Import and use in parent component',
      MemoryType.PROCEDURAL,
      sessionId,
      {
        importance: 0.9,
        tags: ['react', 'component', 'tutorial', 'steps'],
        source: 'documentation',
        confidence: 0.95
      }
    );
    console.log(`✅ Procedural memory stored: ${proceduralMemoryId}`);

    // Working memory - temporary information
    const workingMemoryId = await protocol.store(
      'User is currently working on a React project called "TaskManager"',
      MemoryType.WORKING,
      sessionId,
      {
        importance: 0.7,
        tags: ['current-project', 'react', 'taskmanager'],
        source: 'current_context',
        confidence: 0.8
      }
    );
    console.log(`✅ Working memory stored: ${workingMemoryId}`);

    // Retrieve memories
    console.log('\n🔍 Retrieving memories...');
    
    // Basic retrieval
    const programmingResults = await protocol.retrieve(
      'programming preferences',
      sessionId
    );
    console.log(`✅ Found ${programmingResults.memories.length} memories about programming preferences`);
    programmingResults.memories.forEach((memory: any, index: number) => {
      console.log(`   ${index + 1}. ${memory.content.text.substring(0, 50)}...`);
    });

    // Advanced retrieval with filters
    const reactResults = await protocol.retrieve(
      'React development',
      sessionId,
      {
        limit: 5,
        threshold: 0.5,
        memoryTypes: [MemoryType.SEMANTIC, MemoryType.PROCEDURAL, MemoryType.WORKING],
        includeMetadata: true,
        filters: {
          source: 'user_conversation'
        }
      }
    );
    console.log(`✅ Found ${reactResults.memories.length} memories about React development`);

    // Time-based retrieval
    const recentResults = await protocol.retrieve(
      'recent activities',
      sessionId,
      {
        timeRange: {
          start: new Date(Date.now() - 3600000), // Last hour
          end: new Date()
        }
      }
    );
    console.log(`✅ Found ${recentResults.memories.length} recent memories`);

    // Update memory
    console.log('\n📝 Updating memory...');
    await protocol.update(
      semanticMemoryId,
      {
        content: {
          text: 'The user prefers TypeScript over JavaScript for web development',
          tags: ['preference', 'programming', 'typescript', 'javascript', 'updated']
        },
        metadata: {
          importance: 0.9,
          source: 'user_conversation',
          confidence: 0.9,
          accessCount: 1,
          lastAccessed: new Date(),
          created: new Date(),
          updated: new Date(),
          storageTier: StorageTier.MAIN_CONTEXT
        }
      },
      sessionId
    );
    console.log('✅ Memory updated successfully');

    // Retrieve updated memory
    const updatedResults = await protocol.retrieve(
      'programming preferences',
      sessionId,
      { id: semanticMemoryId }
    );
    if (updatedResults.memories.length > 0) {
      const updatedMemory = updatedResults.memories[0];
      console.log(`✅ Updated memory importance: ${updatedMemory.metadata.importance}`);
      console.log(`✅ Updated memory tags: ${updatedMemory.content.tags?.join(', ')}`);
    }

    // Check backend statistics
    console.log('\n📊 Backend statistics:');
    const backend = protocol['storageBackends'].get('in-memory') as InMemoryBackend;
    console.log(`✅ Total memories stored: ${backend.getEventCount()}`);
    console.log(`✅ All memories:`);
    backend.getAllEvents().forEach((event, index) => {
      console.log(`   ${index + 1}. [${event.memoryType}] ${event.content.text.substring(0, 60)}...`);
    });

    // Test error handling
    console.log('\n🧪 Testing error handling...');
    try {
      await protocol.delete('non-existent-id', sessionId);
    } catch (error) {
      if (error instanceof MemoryProtocolError) {
        console.log(`✅ Error handling works: ${error.message}`);
      }
    }

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await protocol.closeSession(sessionId);
    console.log('✅ Session closed');
    
    await protocol.shutdown();
    console.log('✅ Protocol shutdown');

    console.log('\n🎉 Basic usage example completed successfully!');

  } catch (error) {
    console.error('❌ Error during example execution:', error);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };
