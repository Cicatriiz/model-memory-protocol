/**
 * Model Memory Protocol (MMP) - Main Export File
 * 
 * A comprehensive memory protocol for Large Language Models
 * based on MCP and OpenTelemetry patterns.
 */

// Core exports
export * from './core/types.js';
export { MemoryProtocol } from './core/memoryProtocol.js';

// Storage backends
export { InMemoryBackend } from './storage/inMemoryBackend.js';

// Transport implementations
export { WebSocketTransport, WebSocketServerTransport } from './transport/websocketTransport.js';

// Examples
export { basicUsageExample } from './examples/basic-usage.js';

// Version information
export const VERSION = '1.0.0';
export const PROTOCOL_NAME = 'Model Memory Protocol';
export const PROTOCOL_ABBREVIATION = 'MMP';

// Default configuration factory
export function createDefaultConfig() {
  return {
    version: VERSION,
    transports: [
      { type: 'websocket', options: { port: 8080 } }
    ],
    storage: [
      { 
        backend: 'in-memory', 
        tier: 'main_context', 
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
      enabled: false,
      strategy: 'hybrid',
      interval: 3600,
      batchSize: 100,
      retention: {
        working: 3600,
        episodic: 86400,
        semantic: 2592000,
        procedural: 7776000,
        archival: -1
      }
    }
  };
}
