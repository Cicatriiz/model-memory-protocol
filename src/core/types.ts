/**
 * Core types and interfaces for the LLM Memory Protocol
 * Based on MCP and OpenTelemetry patterns
 */

import { EventEmitter } from 'events';

// Memory Event Types
export enum MemoryEventType {
  STORE = 'store',
  RETRIEVE = 'retrieve',
  UPDATE = 'update',
  DELETE = 'delete',
  CONSOLIDATE = 'consolidate',
  EVICT = 'evict'
}

// Memory Types inspired by research findings
export enum MemoryType {
  EPISODIC = 'episodic',      // Time-based memories
  SEMANTIC = 'semantic',      // Factual knowledge
  PROCEDURAL = 'procedural',  // How-to knowledge
  WORKING = 'working',        // Short-term active memory
  ARCHIVAL = 'archival'       // Long-term storage
}

// Memory Storage Tiers
export enum StorageTier {
  MAIN_CONTEXT = 'main_context',    // RAM-like (Letta architecture)
  EXTERNAL_CONTEXT = 'external_context', // Disk-like
  VECTOR_STORE = 'vector_store',    // Semantic similarity
  GRAPH_STORE = 'graph_store',      // Relationship modeling
  TEMPORAL_STORE = 'temporal_store'  // Time-based indexing
}

// Memory Context Headers (similar to OpenTelemetry trace context)
export interface MemoryContext {
  version: string;
  sessionId: string;
  memoryId: string;
  flags: string;
  state: Record<string, string>;
  timestamp: Date;
  userId?: string;
  agentId?: string;
}

// Memory Event Structure
export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  memoryType: MemoryType;
  context: MemoryContext;
  content: MemoryContent;
  metadata: MemoryMetadata;
  timestamp: Date;
  ttl?: number; // Time to live in seconds
}

// Memory Content with embeddings and relationships
export interface MemoryContent {
  text: string;
  embedding?: number[];
  embeddingModel?: string;
  keywords?: string[];
  tags?: string[];
  relationships?: MemoryRelationship[];
  chunks?: MemoryChunk[];
}

// Memory relationships for graph-based storage
export interface MemoryRelationship {
  type: RelationshipType;
  targetId: string;
  strength: number; // 0-1 relationship strength
  metadata?: Record<string, any>;
}

export enum RelationshipType {
  REFERENCES = 'references',
  CAUSED_BY = 'caused_by',
  LEADS_TO = 'leads_to',
  SIMILAR_TO = 'similar_to',
  PART_OF = 'part_of',
  CONTRADICTS = 'contradicts',
  SUPPORTS = 'supports'
}

// Memory chunks for handling large content
export interface MemoryChunk {
  id: string;
  text: string;
  embedding?: number[];
  position: number;
  overlap?: number;
}

// Memory metadata for rich context
export interface MemoryMetadata {
  source: string;
  confidence: number; // 0-1 confidence score
  importance: number; // 0-1 importance score
  accessCount: number;
  lastAccessed: Date;
  created: Date;
  updated: Date;
  storageTier: StorageTier;
  compressionLevel?: number;
  [key: string]: any;
}

// Memory Query Interface
export interface MemoryQuery {
  id?: string;
  query: string;
  memoryTypes?: MemoryType[];
  storageTiers?: StorageTier[];
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
  threshold?: number; // Similarity threshold
  includeMetadata?: boolean;
  includeContent?: boolean;
  filters?: Record<string, any>;
}

export interface TimeRange {
  start?: Date;
  end?: Date;
}

// Memory Search Results
export interface MemorySearchResult {
  memories: MemoryEvent[];
  totalCount: number;
  query: MemoryQuery;
  searchTime: number;
  nextToken?: string; // For pagination
}

// Storage Backend Interface
export interface StorageBackend {
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

// Transport Interface
export interface Transport extends EventEmitter {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: ProtocolMessage): Promise<void>;
  isConnected(): boolean;
}

// Protocol Message (JSON-RPC 2.0 based, following MCP)
export interface ProtocolMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: ProtocolError;
  headers?: Record<string, string>;
}

export interface ProtocolError {
  code: number;
  message: string;
  data?: any;
}

// Memory Protocol Configuration
export interface MemoryProtocolConfig {
  version: string;
  transports: TransportConfig[];
  storage: StorageConfig[];
  security: SecurityConfig;
  processing: ProcessingConfig;
  consolidation: ConsolidationConfig;
}

export interface TransportConfig {
  type: 'stdio' | 'websocket' | 'http' | 'sse';
  options: Record<string, any>;
}

export interface StorageConfig {
  backend: string;
  tier: StorageTier;
  options: Record<string, any>;
  priority: number;
}

export interface SecurityConfig {
  authentication: {
    type: 'oauth' | 'apikey' | 'jwt';
    options: Record<string, any>;
  };
  authorization: {
    enabled: boolean;
    rules: AuthorizationRule[];
  };
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyRotation: boolean;
  };
}

export interface AuthorizationRule {
  resource: string;
  action: string;
  condition?: string;
}

export interface ProcessingConfig {
  embedding: {
    model: string;
    dimensions: number;
    batchSize: number;
  };
  chunking: {
    strategy: 'fixed' | 'semantic' | 'sliding';
    size: number;
    overlap: number;
  };
  deduplication: {
    enabled: boolean;
    threshold: number;
  };
}

export interface ConsolidationConfig {
  enabled: boolean;
  strategy: 'novelty' | 'recency' | 'importance' | 'hybrid';
  interval: number; // in seconds
  batchSize: number;
  retention: {
    [key in MemoryType]: number; // retention period in seconds
  };
}

// Memory Collector Interface (inspired by OpenTelemetry)
export interface MemoryCollector {
  collect(events: MemoryEvent[]): Promise<void>;
  process(events: MemoryEvent[]): Promise<MemoryEvent[]>;
  export(events: MemoryEvent[]): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

// Memory Processor Interface
export interface MemoryProcessor {
  name: string;
  process(events: MemoryEvent[]): Promise<MemoryEvent[]>;
}

// Memory Exporter Interface
export interface MemoryExporter {
  name: string;
  export(events: MemoryEvent[]): Promise<void>;
}

// SDK Interface
export interface MemorySDK {
  store(content: string, type: MemoryType, metadata?: Partial<MemoryMetadata>): Promise<string>;
  retrieve(query: string, options?: Partial<MemoryQuery>): Promise<MemorySearchResult>;
  update(id: string, updates: Partial<MemoryEvent>): Promise<void>;
  delete(id: string): Promise<void>;
  createSession(): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  getContext(): MemoryContext;
  setContext(context: Partial<MemoryContext>): void;
}

// Error Types
export class MemoryProtocolError extends Error {
  constructor(
    message: string,
    public code: number,
    public data?: any
  ) {
    super(message);
    this.name = 'MemoryProtocolError';
  }
}

export class StorageError extends MemoryProtocolError {
  constructor(message: string, data?: any) {
    super(message, 500, data);
    this.name = 'StorageError';
  }
}

export class TransportError extends MemoryProtocolError {
  constructor(message: string, data?: any) {
    super(message, 502, data);
    this.name = 'TransportError';
  }
}

export class AuthenticationError extends MemoryProtocolError {
  constructor(message: string, data?: any) {
    super(message, 401, data);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends MemoryProtocolError {
  constructor(message: string, data?: any) {
    super(message, 403, data);
    this.name = 'AuthorizationError';
  }
}

// Constants
export const MEMORY_PROTOCOL_VERSION = '1.0.0';
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 200;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
export const DEFAULT_SEARCH_LIMIT = 10;
export const DEFAULT_TTL = 86400; // 24 hours in seconds
