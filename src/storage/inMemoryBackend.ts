import {
  StorageBackend,
  StorageTier,
  MemoryEvent,
  MemoryQuery,
  MemorySearchResult,
  MemoryType,
  StorageError,
  DEFAULT_SEARCH_LIMIT
} from '../core/types.js';

/**
 * In-memory storage backend for fast access to working memory
 * Implements the StorageBackend interface for main context storage
 */
export class InMemoryBackend implements StorageBackend {
  public readonly name = 'in-memory';
  public readonly type = StorageTier.MAIN_CONTEXT;
  
  private events: Map<string, MemoryEvent> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new StorageError('Backend already initialized');
    }
    
    this.initialized = true;
  }

  async store(event: MemoryEvent): Promise<void> {
    if (!this.initialized) {
      throw new StorageError('Backend not initialized');
    }

    // Store the event
    this.events.set(event.id, { ...event });
    
    // Update access metadata
    const stored = this.events.get(event.id)!;
    stored.metadata.lastAccessed = new Date();
    stored.metadata.accessCount++;
  }

  async retrieve(query: MemoryQuery): Promise<MemorySearchResult> {
    if (!this.initialized) {
      throw new StorageError('Backend not initialized');
    }

    const startTime = Date.now();
    let results: MemoryEvent[] = [];

    // If querying by ID, return direct match
    if (query.id) {
      const event = this.events.get(query.id);
      if (event) {
        results = [event];
      }
    } else {
      // Full search across all events
      results = this.searchEvents(query);
    }

    // Apply filters
    results = this.applyFilters(results, query);

    // Sort by relevance/recency
    results = this.sortResults(results, query);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || DEFAULT_SEARCH_LIMIT;
    const paginatedResults = results.slice(offset, offset + limit);

    // Update access metadata for retrieved events
    for (const event of paginatedResults) {
      const stored = this.events.get(event.id);
      if (stored) {
        stored.metadata.lastAccessed = new Date();
        stored.metadata.accessCount++;
      }
    }

    const searchTime = Date.now() - startTime;

    return {
      memories: paginatedResults,
      totalCount: results.length,
      query,
      searchTime
    };
  }

  async update(id: string, updates: Partial<MemoryEvent>): Promise<void> {
    if (!this.initialized) {
      throw new StorageError('Backend not initialized');
    }

    const event = this.events.get(id);
    if (!event) {
      throw new StorageError(`Event not found: ${id}`);
    }

    // Apply updates
    const updatedEvent = { ...event, ...updates };
    updatedEvent.metadata.updated = new Date();
    
    this.events.set(id, updatedEvent);
  }

  async delete(id: string): Promise<void> {
    if (!this.initialized) {
      throw new StorageError('Backend not initialized');
    }

    const deleted = this.events.delete(id);
    if (!deleted) {
      throw new StorageError(`Event not found: ${id}`);
    }
  }

  async consolidate(events: MemoryEvent[]): Promise<MemoryEvent[]> {
    if (!this.initialized) {
      throw new StorageError('Backend not initialized');
    }

    // Simple consolidation: remove duplicates and merge similar events
    const consolidated: MemoryEvent[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      // Simple deduplication based on content similarity
      const contentHash = this.hashContent(event.content.text);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        consolidated.push(event);
      } else {
        // Merge with existing event (increase importance)
        const existing = consolidated.find(e => 
          this.hashContent(e.content.text) === contentHash
        );
        if (existing) {
          existing.metadata.importance = Math.min(
            1.0,
            existing.metadata.importance + 0.1
          );
          existing.metadata.accessCount += event.metadata.accessCount;
        }
      }
    }

    return consolidated;
  }

  async close(): Promise<void> {
    this.events.clear();
    this.initialized = false;
  }

  // Get all events (for testing/debugging)
  getAllEvents(): MemoryEvent[] {
    return Array.from(this.events.values());
  }

  // Get event count
  getEventCount(): number {
    return this.events.size;
  }

  // Clear all events
  clear(): void {
    this.events.clear();
  }

  // Private helper methods

  private searchEvents(query: MemoryQuery): MemoryEvent[] {
    const results: MemoryEvent[] = [];
    const queryLower = query.query.toLowerCase();

    for (const event of this.events.values()) {
      let score = 0;

      // Text matching
      if (event.content.text.toLowerCase().includes(queryLower)) {
        score += 0.8;
      }

      // Keyword matching
      if (event.content.keywords) {
        for (const keyword of event.content.keywords) {
          if (keyword.toLowerCase().includes(queryLower)) {
            score += 0.6;
          }
        }
      }

      // Tag matching
      if (event.content.tags) {
        for (const tag of event.content.tags) {
          if (tag.toLowerCase().includes(queryLower)) {
            score += 0.7;
          }
        }
      }

      // Apply threshold
      if (score >= (query.threshold || 0.5)) {
        results.push({ ...event, _score: score } as any);
      }
    }

    return results;
  }

  private applyFilters(events: MemoryEvent[], query: MemoryQuery): MemoryEvent[] {
    let filtered = events;

    // Filter by memory types
    if (query.memoryTypes && query.memoryTypes.length > 0) {
      filtered = filtered.filter(event => 
        query.memoryTypes!.includes(event.memoryType)
      );
    }

    // Filter by storage tiers
    if (query.storageTiers && query.storageTiers.length > 0) {
      filtered = filtered.filter(event => 
        query.storageTiers!.includes(event.metadata.storageTier)
      );
    }

    // Filter by time range
    if (query.timeRange) {
      filtered = filtered.filter(event => {
        const eventTime = event.timestamp;
        const { start, end } = query.timeRange!;
        
        if (start && eventTime < start) return false;
        if (end && eventTime > end) return false;
        
        return true;
      });
    }

    // Apply custom filters
    if (query.filters) {
      filtered = filtered.filter(event => {
        for (const [key, value] of Object.entries(query.filters!)) {
          if (event.metadata[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    return filtered;
  }

  private sortResults(events: MemoryEvent[], query: MemoryQuery): MemoryEvent[] {
    return events.sort((a, b) => {
      // Sort by score first (if available)
      const scoreA = (a as any)._score || 0;
      const scoreB = (b as any)._score || 0;
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // Then by importance
      const importanceA = a.metadata.importance;
      const importanceB = b.metadata.importance;
      
      if (importanceA !== importanceB) {
        return importanceB - importanceA;
      }

      // Finally by recency
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  private hashContent(content: string): string {
    // Simple hash function for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}
