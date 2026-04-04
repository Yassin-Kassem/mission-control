import http from 'http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { SignalBus } from '@missionctl/core';
import { Broadcaster } from './broadcaster.js';

export interface DashboardServerOptions {
  port: number;
}

export interface ServerAddress {
  port: number;
  host: string;
}

export class DashboardServer {
  private httpServer: http.Server;
  private wss: WebSocketServer;
  private broadcaster: Broadcaster;

  constructor(bus: SignalBus, private options: DashboardServerOptions) {
    this.broadcaster = new Broadcaster(bus);

    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
      }
      if (req.url === '/api/signals') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ signals: bus.history() }));
        return;
      }
      res.writeHead(404);
      res.end('Not found');
    });

    this.wss = new WebSocketServer({ server: this.httpServer });

    this.wss.on('connection', (ws: WebSocket) => {
      const listener = (signal: unknown) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(signal));
        }
      };
      this.broadcaster.addListener(listener);
      ws.on('close', () => {
        this.broadcaster.removeListener(listener);
      });
    });
  }

  start(): Promise<ServerAddress> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.options.port, () => {
        const addr = this.httpServer.address();
        if (typeof addr === 'object' && addr) {
          resolve({ port: addr.port, host: 'localhost' });
        }
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.httpServer.close(() => resolve());
      });
    });
  }
}
