# Model Memory Protocol (MMP)

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![npm version](https://badge.fury.io/js/model-memory-protocol.svg)](https://badge.fury.io/js/model-memory-protocol)
[![Build Status](https://github.com/model-memory-protocol/mmp/workflows/CI/badge.svg)](https://github.com/model-memory-protocol/mmp/actions)

> A comprehensive memory protocol for Large Language Models based on MCP and OpenTelemetry patterns

## 🚀 Overview

Model Memory Protocol (MMP) is a standardized protocol designed to solve the complex challenges of memory management in LLM systems. Inspired by the research findings on memory systems like EM-LLM, A-MEM, and CAMELoT, MMP provides a unified framework for:

- **Multi-tier memory storage** (working, episodic, semantic, procedural, archival)
- **Real-time memory synchronization** across distributed AI agents
- **Pluggable storage backends** (in-memory, vector databases, graph stores)
- **Secure transport layers** with authentication and authorization
- **Memory consolidation and optimization** following neuroscience principles

## 🎯 Key Features

### 📊 Memory Types
- **Episodic Memory**: Time-based memories with contextual information
- **Semantic Memory**: Factual knowledge and relationships
- **Procedural Memory**: How-to knowledge and learned behaviors
- **Working Memory**: Short-term active memory for current tasks
- **Archival Memory**: Long-term storage with compression and optimization

### 🔧 Storage Tiers
- **Main Context**: RAM-like storage for immediate access
- **External Context**: Disk-like storage for extended context
- **Vector Store**: Semantic similarity search capabilities
- **Graph Store**: Relationship modeling and traversal
- **Temporal Store**: Time-based indexing and retrieval

### 🌐 Transport Mechanisms
- **WebSocket**: Real-time bidirectional communication
- **HTTP/REST**: Standard request-response patterns
- **Server-Sent Events**: Streaming updates to clients
- **Stdio**: Command-line interface integration

## 📦 Installation

```bash
npm install model-memory-protocol
```

## 🏃 Quick Start

```typescript
import { MemoryProtocol, MemoryType, InMemoryBackend } from 'model-memory-protocol';

// Create protocol instance
const protocol = new MemoryProtocol({
  version: '1.0.0',
  transports: [{ type: 'websocket', options: { port: 8080 } }],
  storage: [{ backend: 'in-memory', tier: 'main_context', priority: 1 }],
  security: { /* security configuration */ },
  processing: { /* processing configuration */ },
  consolidation: { /* consolidation configuration */ }
});

// Initialize protocol
await protocol.initialize();

// Create a session
const sessionId = await protocol.createSession('user123', 'agent456');

// Store memory
const memoryId = await protocol.store(
  'The user prefers TypeScript over JavaScript',
  MemoryType.SEMANTIC,
  sessionId,
  { importance: 0.8, tags: ['preference', 'programming'] }
);

// Retrieve memories
const results = await protocol.retrieve(
  'programming preferences',
  sessionId,
  { limit: 5, threshold: 0.7 }
);

console.log('Found memories:', results.memories);
```

## 📚 Documentation

- [📖 Complete Documentation](./docs/README.md)
- [🔧 API Reference](./docs/api/README.md)
- [📝 Usage Guides](./docs/guides/README.md)
- [💡 Examples](./examples/README.md)

## 🏗️ Architecture

MMP follows a layered architecture inspired by OpenTelemetry:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                      MMP SDK                                │
├─────────────────────────────────────────────────────────────┤
│                   Protocol Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Memory Collector │ Memory Processor │ Memory Exporter     │
├─────────────────────────────────────────────────────────────┤
│               Transport Layer                               │
├─────────────────────────────────────────────────────────────┤
│                Storage Backends                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔒 Security Features

- **OAuth 2.0 / JWT Authentication**: Secure session management
- **Role-based Authorization**: Fine-grained access control
- **End-to-end Encryption**: Protect sensitive memory data
- **Audit Logging**: Track all memory operations
- **Rate Limiting**: Prevent abuse and ensure fair usage

## 🔄 Memory Consolidation

MMP implements advanced memory consolidation strategies:

- **Novelty-based**: Prioritize unique and unexpected information
- **Recency-based**: Emphasize recently accessed memories
- **Importance-based**: Focus on high-importance memories
- **Hybrid**: Combine multiple strategies for optimal results

## 🌟 Research Foundation

MMP is built on cutting-edge research in LLM memory systems:

- **EM-LLM**: Bayesian surprise and graph-theoretic boundary refinement
- **A-MEM**: Zettelkasten-inspired dynamic memory structuring
- **CAMELoT**: Neuroscience-inspired consolidation mechanisms
- **OpenTelemetry**: Proven patterns for distributed system observability

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Related Projects

- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol/mcp) - Universal connector for AI applications
- [OpenTelemetry](https://opentelemetry.io/) - Observability framework for cloud-native software
- [Mem0](https://github.com/mem0ai/mem0) - Memory layer for AI applications
- [Letta](https://github.com/letta-ai/letta) - Build LLM agents with long-term memory

## 📞 Support

- 📧 Email: support@model-memory-protocol.org
- 💬 Discord: [Join our community](https://discord.gg/mmp)
- 📚 Documentation: [docs.model-memory-protocol.org](https://docs.model-memory-protocol.org)
- 🐛 Issues: [GitHub Issues](https://github.com/model-memory-protocol/mmp/issues)

---

<p align="center">
  <strong>Built with ❤️ by the Model Memory Protocol Team</strong>
</p>
