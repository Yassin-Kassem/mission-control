import { describe, it, expect, afterEach } from 'vitest';
import { DashboardServer } from '../../src/dashboard/server.js';
import { SignalBus } from '@missionctl/core';

describe('DashboardServer', () => {
  let server: DashboardServer;

  afterEach(async () => {
    if (server) await server.stop();
  });

  it('starts and stops on a given port', async () => {
    const bus = new SignalBus();
    server = new DashboardServer(bus, { port: 0 });
    const address = await server.start();
    expect(address.port).toBeGreaterThan(0);
    await server.stop();
  });

  it('serves a health check endpoint', async () => {
    const bus = new SignalBus();
    server = new DashboardServer(bus, { port: 0 });
    const address = await server.start();
    const res = await fetch(`http://localhost:${address.port}/api/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
  });
});
