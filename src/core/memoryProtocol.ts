import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  MemoryEvent,
  MemoryEventType,
  MemoryType,
  MemoryContext,
  MemoryQuery,
  MemorySearchResult,
  MemoryProtocolConfig,
  StorageBackend,
  Transport,
  ProtocolMessage,
  MemoryProtocolError,
  MEMORY_PROTOCOL_VERSION,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SIMILARITY_THRESHOLD,
  DEFAULT_TTL,
  MemoryContent,
  MemoryMetadata,
  StorageTier
} from './types.js';

/**
 * Core Memory Protocol implementation
 * Provides the main interface for memory operations following MCP patterns
 */
export class MemoryProtocol extends EventEmitter {
  private config: MemoryProtocolConfig;
  private storageBackends: Map<string, StorageBackend> = new Map();
  private transports: Map<string, Transport> = new Map();
  private sessions: Map<string, MemoryContext> = new Map();
  private initialized = false;

  constructor(config: MemoryProtocolConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize the memory protocol
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new MemoryProtocolError('Protocol already initialized', 400);
    }

    try {
      // Initialize storage backends
      await this.initializeStorageBackends();
      
      // Initialize transports
      await this.initializeTransports();
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      throw new MemoryProtocolError(
        `Failed to initialize protocol: ${error.message}`,
        500,
        error
      );
    }
  }

  /**
   * Create a new memory session
   */
  async createSession(userId?: string, agentId?: string): Promise<string> {
    const sessionId = uuidv4();
    const context: MemoryContext = {
      version: MEMORY_PROTOCOL_VERSION,
      sessionId,
      memoryId: uuidv4(),
      flags: '',
      state: {},
      timestamp: new Date(),
      userId,
      agentId
    };

    this.sessions.set(sessionId, context);
    this.emit('sessionCreated', { sessionId, context });
    
    return sessionId;
  }

  /**
   * Close a memory session
   */
  async closeSession(sessionId: string): Promise<void> {
    const context = this.sessions.get(sessionId);
    if (!context) {
      throw new MemoryProtocolError(`Session not found: ${sessionId}`, 404);
    }

    this.sessions.delete(sessionId);
    this.emit('sessionClosed', { sessionId, context });
  }

  /**
   * Store a memory event
   */
  async store(
    content: string,
    type: MemoryType,
    sessionId: string,
    metadata?: Partial<MemoryMetadata>
  ): Promise<string> {
    if (!this.initialized) {
      throw new MemoryProtocolError('Protocol not initialized', 400);
    }

    const context = this.sessions.get(sessionId);
    if (!context) {
      throw new MemoryProtocolError(`Session not found: ${sessionId}`, 404);
    }

    const eventId = uuidv4();
    const now = new Date();

    const memoryContent: MemoryContent = {
      text: content,
      keywords: this.extractKeywords(content),
      tags: metadata?.tags || []
    };

    const memoryMetadata: MemoryMetadata = {
      source: 'user',
      confidence: 1.0,
      importance: 0.5,
      accessCount: 0,
      lastAccessed: now,
      created: now,
      updated: now,
      storageTier: StorageTier.MAIN_CONTEXT,
      ...metadata
    };

    const event: MemoryEvent = {
      id: eventId,
      type: MemoryEventType.STORE,
      memoryType: type,
      context: { ...context, memoryId: eventId },
      content: memoryContent,
      metadata: memoryMetadata,
      timestamp: now,
      ttl: DEFAULT_TTL
    };

    // Store in appropriate backends based on memory type and tier
    await this.storeEvent(event);
    
    this.emit('memoryStored', event);
    return eventId;
  }

  /**
   * Retrieve memories based on query
   */
  async retrieve(
    query: string,
    sessionId: string,
    options?: Partial<MemoryQuery>
  ): Promise<MemorySearchResult> {
    if (!this.initialized) {
      throw new MemoryProtocolError('Protocol not initialized', 400);
    }

    const context = this.sessions.get(sessionId);
    if (!context) {
      throw new MemoryProtocolError(`Session not found: ${sessionId}`, 404);
    }

    const memoryQuery: MemoryQuery = {
      query,
      limit: DEFAULT_SEARCH_LIMIT,
      threshold: DEFAULT_SIMILARITY_THRESHOLD,
      includeMetadata: true,
      includeContent: true,
      ...options
    };

    const startTime = Date.now();
    const results = await this.searchMemories(memoryQuery);
    const searchTime = Date.now() - startTime;

    const searchResult: MemorySearchResult = {
      ...results,
      searchTime
    };

    this.emit('memoryRetrieved', { query: memoryQuery, results: searchResult });
    return searchResult;
  }

  /**
   * Update a memory event
   */
  async update(
    memoryId: string,
    updates: Partial<MemoryEvent>,
    sessionId: string
  ): Promise<void> {
    if (!this.initialized) {
      throw new MemoryProtocolError('Protocol not initialized', 400);
    }

    const context = this.sessions.get(sessionId);
    if (!context) {
      throw new MemoryProtocolError(`Session not found: ${sessionId}`, 404);
    }

    // Update across all relevant backends
    for (const backend of this.storageBackends.values()) {
      await backend.update(memoryId, updates);
    }

    this.emit('memoryUpdated', { memoryId, updates });
  }

  /**
   * Delete a memory event
   */
  async delete(memoryId: string, sessionId: string): Promise<void> {
    if (!this.initialized) {
      throw new MemoryProtocolError('Protocol not initialized', 400);
    }

    const context = this.sessions.get(sessionId);
    if (!context) {
      throw new MemoryProtocolError(`Session not found: ${sessionId}`, 404);
    }

    // Delete from all backends
    for (const backend of this.storageBackends.values()) {
      await backend.delete(memoryId);
    }

    this.emit('memoryDeleted', { memoryId });
  }

  /**
   * Handle incoming protocol messages
   */
  async handleMessage(message: ProtocolMessage, transport: Transport): Promise<ProtocolMessage> {
    try {
      switch (message.method) {
        case 'memory/store':
          return await this.handleStoreMessage(message);
        case 'memory/retrieve':
          return await this.handleRetrieveMessage(message);
        case 'memory/update':
          return await this.handleUpdateMessage(message);
        case 'memory/delete':
          return await this.handleDeleteMessage(message);
        case 'session/create':
          return await this.handleCreateSessionMessage(message);
        case 'session/close':
          return await this.handleCloseSessionMessage(message);
        default:
          throw new MemoryProtocolError(`Unknown method: ${message.method}`, 400);
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: error.code || 500,
          message: error.message,
          data: error.data
        }
      };
    }
  }

  /**
   * Shutdown the protocol
   */
  async shutdown(): Promise<void> {
    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }

    // Disconnect transports
    for (const transport of this.transports.values()) {
      await transport.disconnect();
    }

    // Close storage backends
    for (const backend of this.storageBackends.values()) {
      await backend.close();
    }

    this.initialized = false;
    this.emit('shutdown');
  }

  // Private methods

  private async initializeStorageBackends(): Promise<void> {
    // Implementation would load and initialize storage backends
    // based on configuration
  }

  private async initializeTransports(): Promise<void> {
    // Implementation would load and initialize transports
    // based on configuration
  }

  private async storeEvent(event: MemoryEvent): Promise<void> {
    // Determine appropriate backends based on memory type and tier
    const relevantBackends = this.getRelevantBackends(event);
    
    for (const backend of relevantBackends) {
      await backend.store(event);
    }
  }

  private async searchMemories(query: MemoryQuery): Promise<MemorySearchResult> {
    // Implementation would search across relevant backends
    // and aggregate results
    return {
      memories: [],
      totalCount: 0,
      query,
      searchTime: 0
    };
  }

  private getRelevantBackends(event: MemoryEvent): StorageBackend[] {
    // Logic to determine which backends should store this event
    return Array.from(this.storageBackends.values());
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - in practice, would use NLP
    return content
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  // Message handlers

  private async handleStoreMessage(message: ProtocolMessage): Promise<ProtocolMessage> {
    const { content, type, sessionId, metadata } = message.params;
    const memoryId = await this.store(content, type, sessionId, metadata);
    
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { memoryId }
    };
  }

  private async handleRetrieveMessage(message: ProtocolMessage): Promise<ProtocolMessage> {
    const { query, sessionId, options } = message.params;
    const results = await this.retrieve(query, sessionId, options);
    
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: results
    };
  }

  private async handleUpdateMessage(message: ProtocolMessage): Promise<ProtocolMessage> {
    const { memoryId, updates, sessionId } = message.params;
    await this.update(memoryId, updates, sessionId);
    
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { success: true }
    };
  }

  private async handleDeleteMessage(message: ProtocolMessage): Promise<ProtocolMessage> {
    const { memoryId, sessionId } = message.params;
    await this.delete(memoryId, sessionId);
    
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { success: true }
    };
  }

  private async handleCreateSessionMessage(message: ProtocolMessage): Promise<ProtocolMessage> {
    const { userId, agentId } = message.params || {};
    const sessionId = await this.createSession(userId, agentId);
    
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { sessionId }
    };
  }

  private async handleCloseSessionMessage(message: ProtocolMessage): Promise<ProtocolMessage> {
    const { sessionId } = message.params;
    await this.closeSession(sessionId);
    
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { success: true }
    };
  }
}
