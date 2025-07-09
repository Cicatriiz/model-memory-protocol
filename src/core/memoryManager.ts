import { MemoryEvent, StorageBackend, MemoryCollector, MemoryExporter, MemoryProcessor } from './types';

/**
 * MemoryManager handles memory storage, processing, and retrieval.
 */
export class MemoryManager {
  private backends: StorageBackend[] = [];
  private collectors: MemoryCollector[] = [];
  private processors: MemoryProcessor[] = [];
  private exporters: MemoryExporter[] = [];

  constructor() {
    // Initialize the memory manager.
  }

  /**
   * Adds a storage backend.
   * @param backend The storage backend to add.
   */
  addBackend(backend: StorageBackend) {
    this.backends.push(backend);
  }

  /**
   * Adds a memory collector.
   * @param collector The memory collector to add.
   */
  addCollector(collector: MemoryCollector) {
    this.collectors.push(collector);
  }

  /**
   * Adds a memory processor.
   * @param processor The memory processor to add.
   */
  addProcessor(processor: MemoryProcessor) {
    this.processors.push(processor);
  }

  /**
   * Adds a memory exporter.
   * @param exporter The memory exporter to add.
   */
  addExporter(exporter: MemoryExporter) {
    this.exporters.push(exporter);
  }

  /**
   * Stores a memory event across all backends.
   * @param event The memory event to store.
   */
  async store(event: MemoryEvent) {
    for (const backend of this.backends) {
      await backend.store(event);
    }
  }

  /**
   * Collects memory events from all collectors.
   * @returns The memory events collected.
   */
  async collect(): Promise<MemoryEvent[]> {
    const collectedEvents: MemoryEvent[] = [];
    for (const collector of this.collectors) {
      const events = await collector.collect(collectedEvents);
      collectedEvents.push(...events);
    }
    return collectedEvents;
  }

  /**
   * Processes memory events with all processors.
   * @param events The memory events to process.
   * @returns The processed memory events.
   */
  async process(events: MemoryEvent[]): Promise<MemoryEvent[]> {
    let processedEvents = [...events];
    for (const processor of this.processors) {
      processedEvents = await processor.process(processedEvents);
    }
    return processedEvents;
  }

  /**
   * Exports memory events using all exporters.
   * @param events The memory events to export.
   */
  async export(events: MemoryEvent[]) {
    for (const exporter of this.exporters) {
      await exporter.export(events);
    }
  }
}
