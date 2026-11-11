// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { T2208Simulator } from '../device/simulator';
import { BridgeEngine } from '../engine';
import { startBridgeServer, type BridgeServerHandle } from '../server';
import type { MixerSnapshot } from '../../src/domain/types';

function waitFor<T>(check: () => T | undefined, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const value = check();
      if (value !== undefined) {
        clearInterval(timer);
        resolve(value);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for bridge message'));
      }
    }, 20);
  });
}

describe('local bridge server', () => {
  const simulator = new T2208Simulator({
    host: '127.0.0.1',
    tcpPort: 0,
    hfPort: 0,
    ipPort: 0,
  });
  let engine: BridgeEngine;
  let server: BridgeServerHandle;

  beforeAll(async () => {
    const addresses = await simulator.start();
    engine = new BridgeEngine({
      deviceHost: addresses.host,
      devicePort: addresses.tcpPort,
      dryRun: true,
    });
    await engine.start();
    server = await startBridgeServer({ engine, port: 0 });
  });

  afterAll(async () => {
    await server.close();
    engine.disconnect();
    await simulator.stop();
  });

  it('serves health and the bridge snapshot over HTTP', async () => {
    const response = await fetch(`http://127.0.0.1:${server.port}/health`);
    const body = (await response.json()) as { ok: boolean; status: { connection: string } };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status.connection).toBe('bridge-connected');

    const stateResponse = await fetch(`http://127.0.0.1:${server.port}/state`);
    const snapshot = (await stateResponse.json()) as MixerSnapshot;
    expect(snapshot.mode).toBe('bridge');
    expect(snapshot.bridge?.version).toBe('V1.1');
  });

  it('applies an action over WebSocket and broadcasts the new snapshot', async () => {
    const socket = new WebSocket(server.url);
    let snapshot: MixerSnapshot | undefined;
    let result: { ok: boolean; simulated: boolean } | undefined;

    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as {
        type: string;
        snapshot?: MixerSnapshot;
        result?: { ok: boolean; simulated: boolean };
      };
      if (message.type === 'snapshot') snapshot = message.snapshot;
      if (message.type === 'result') result = message.result;
    });

    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });

    socket.send(
      JSON.stringify({
        type: 'action',
        requestId: 'test-1',
        action: { type: 'strip.set', stripId: 'ch-1', control: 'fader', value: 33 },
      }),
    );

    const received = await waitFor(() => (result && snapshot ? { result, snapshot } : undefined));
    expect(received.result.ok).toBe(true);
    expect(received.result.simulated).toBe(true);
    expect(received.snapshot.strips.find((strip) => strip.id === 'ch-1')?.fader).toBe(33);

    socket.close();
  });
});
