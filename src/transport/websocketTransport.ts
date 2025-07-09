import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { Transport, ProtocolMessage, TransportError } from '../core/types.js';

/**
 * WebSocket transport implementation for real-time memory protocol communication
 * Follows MCP transport patterns with JSON-RPC 2.0 messaging
 */
export class WebSocketTransport extends EventEmitter implements Transport {
  public readonly name = 'websocket';
  
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: ProtocolMessage[] = [];
  private connected = false;

  constructor(url: string, options: {
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    heartbeatInterval?: number;
  } = {}) {
    super();
    this.url = url;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000;
    
    if (options.heartbeatInterval) {
      this.setupHeartbeat(options.heartbeatInterval);
    }
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          
          // Send queued messages
          this.flushMessageQueue();
          
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString()) as ProtocolMessage;
            this.emit('message', message);
          } catch (error: any) {
            this.emit('error', new TransportError(
              `Failed to parse message: ${error.message}`,
              { data: data.toString() }
            ));
          }
        });

        this.ws.on('close', (code: number, reason: string) => {
          this.connected = false;
          this.emit('disconnected', { code, reason });
          
          // Attempt reconnection if not intentional
          if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
          }
        });

        this.ws.on('error', (error: Error) => {
          this.emit('error', new TransportError(
            `WebSocket error: ${error.message}`,
            error
          ));
          reject(error);
        });

        this.ws.on('ping', () => {
          this.ws?.pong();
        });

        this.ws.on('pong', () => {
          this.emit('pong');
        });

      } catch (error: any) {
        reject(new TransportError(
          `Failed to create WebSocket connection: ${error.message}`,
          error
        ));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.ws) {
      return;
    }

    return new Promise((resolve) => {
      this.ws!.close(1000, 'Normal closure');
      this.ws!.on('close', () => {
        this.connected = false;
        this.cleanup();
        resolve();
      });
    });
  }

  async send(message: ProtocolMessage): Promise<void> {
    if (!this.connected) {
      // Queue message for later sending
      this.messageQueue.push(message);
      throw new TransportError('Not connected - message queued');
    }

    if (!this.ws) {
      throw new TransportError('WebSocket not initialized');
    }

    try {
      // Add transport headers
      const messageWithHeaders = {
        ...message,
        headers: {
          ...message.headers,
          'transport': 'websocket',
          'timestamp': new Date().toISOString()
        }
      };

      const serialized = JSON.stringify(messageWithHeaders);
      this.ws.send(serialized);
      
      this.emit('messageSent', message);
    } catch (error: any) {
      throw new TransportError(
        `Failed to send message: ${error.message}`,
        error
      );
    }
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Send a ping to check connection health
  ping(): void {
    if (this.ws && this.connected) {
      this.ws.ping();
    }
  }

  // Get connection statistics
  getStats(): {
    connected: boolean;
    readyState: string;
    queuedMessages: number;
    reconnectAttempts: number;
  } {
    return {
      connected: this.connected,
      readyState: this.ws ? this.getReadyStateString() : 'CLOSED',
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++;
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.emit('reconnecting', { attempt: this.reconnectAttempts });
      this.connect().catch(error => {
        this.emit('reconnectError', error);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnection();
        } else {
          this.emit('reconnectFailed', { 
            attempts: this.reconnectAttempts,
            error 
          });
        }
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message).catch(error => {
          this.emit('error', error);
        });
      }
    }
  }

  private setupHeartbeat(interval: number): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.connected) {
        this.ping();
      }
    }, interval);
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.messageQueue = [];
    this.ws = null;
  }

  private getReadyStateString(): string {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}

/**
 * WebSocket Server Transport for accepting incoming connections
 */
export class WebSocketServerTransport extends EventEmitter implements Transport {
  public readonly name = 'websocket-server';
  
  private server: WebSocket.Server | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private port: number;
  private connected = false;

  constructor(port: number, options: {
    maxClients?: number;
    heartbeatInterval?: number;
  } = {}) {
    super();
    this.port = port;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = new WebSocket.Server({ 
          port: this.port,
          perMessageDeflate: true
        });

        this.server.on('connection', (ws: WebSocket, request) => {
          const clientId = this.generateClientId();
          this.clients.set(clientId, ws);
          
          this.emit('clientConnected', { clientId, request });

          ws.on('message', (data: WebSocket.Data) => {
            try {
              const message = JSON.parse(data.toString()) as ProtocolMessage;
              this.emit('message', message, clientId);
            } catch (error: any) {
              this.emit('error', new TransportError(
                `Failed to parse message from client ${clientId}: ${error.message}`,
                { clientId, data: data.toString() }
              ));
            }
          });

          ws.on('close', () => {
            this.clients.delete(clientId);
            this.emit('clientDisconnected', { clientId });
          });

          ws.on('error', (error: Error) => {
            this.emit('error', new TransportError(
              `Client ${clientId} error: ${error.message}`,
              { clientId, error }
            ));
          });
        });

        this.server.on('listening', () => {
          this.connected = true;
          this.emit('connected');
          resolve();
        });

        this.server.on('error', (error: Error) => {
          reject(new TransportError(
            `Server error: ${error.message}`,
            error
          ));
        });

      } catch (error: any) {
        reject(new TransportError(
          `Failed to create WebSocket server: ${error.message}`,
          error
        ));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.close(1000, 'Server shutdown');
      }
      this.clients.clear();

      // Close server
      this.server!.close(() => {
        this.connected = false;
        this.server = null;
        this.emit('disconnected');
        resolve();
      });
    });
  }

  async send(message: ProtocolMessage, clientId?: string): Promise<void> {
    if (!this.connected) {
      throw new TransportError('Server not connected');
    }

    const messageWithHeaders = {
      ...message,
      headers: {
        ...message.headers,
        'transport': 'websocket-server',
        'timestamp': new Date().toISOString()
      }
    };

    const serialized = JSON.stringify(messageWithHeaders);

    if (clientId) {
      // Send to specific client
      const client = this.clients.get(clientId);
      if (!client) {
        throw new TransportError(`Client not found: ${clientId}`);
      }
      
      client.send(serialized);
    } else {
      // Broadcast to all clients
      for (const client of this.clients.values()) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(serialized);
        }
      }
    }

    this.emit('messageSent', message, clientId);
  }

  isConnected(): boolean {
    return this.connected && this.server !== null;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClients(): string[] {
    return Array.from(this.clients.keys());
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
