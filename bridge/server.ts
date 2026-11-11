import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { MixerAction } from '../src/domain/types';
import { BridgeEngine } from './engine';
import { discoverDevices } from './protocol/discovery';
import type { BridgeServerMessage } from './types';

export interface BridgeServerOptions {
  engine: BridgeEngine;
  port?: number;
  host?: string;
  discoveryTargetHost?: string;
}

export interface BridgeServerHandle {
  port: number;
  url: string;
  close: () => Promise<void>;
}

function sendJson(response: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  response.end(payload);
}

function readJson(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('Request body too large'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    request.on('error', reject);
  });
}

export async function startBridgeServer(options: BridgeServerOptions): Promise<BridgeServerHandle> {
  const { engine } = options;
  const host = options.host ?? '127.0.0.1';
  const requestedPort = options.port ?? 8787;

  const server = http.createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      });
      response.end();
      return;
    }

    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, { ok: true, status: engine.getStatus() });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/status') {
        sendJson(response, 200, engine.getStatus());
        return;
      }
      if (request.method === 'GET' && url.pathname === '/state') {
        sendJson(response, 200, engine.getSnapshot());
        return;
      }
      if (request.method === 'POST' && url.pathname === '/connect') {
        const body = (await readJson(request)) as { host?: unknown; port?: unknown };
        if (typeof body.host !== 'string' || !body.host.trim()) {
          sendJson(response, 400, { ok: false, message: 'host é obrigatório' });
          return;
        }
        const port = typeof body.port === 'number' ? body.port : 5000;
        sendJson(response, 200, { ok: true, status: await engine.connect(body.host.trim(), port) });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/disconnect') {
        engine.disconnect();
        sendJson(response, 200, { ok: true, status: engine.getStatus() });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/discover') {
        const body = (await readJson(request)) as { timeoutMs?: unknown };
        const timeoutMs = typeof body.timeoutMs === 'number' ? body.timeoutMs : 2200;
        const devices = await discoverDevices({
          timeoutMs,
          targetHost: options.discoveryTargetHost,
        });
        sendJson(response, 200, { ok: true, devices });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/action') {
        const body = (await readJson(request)) as { action?: MixerAction };
        if (!body.action || typeof body.action !== 'object') {
          sendJson(response, 400, { ok: false, message: 'action é obrigatório' });
          return;
        }
        sendJson(response, 200, await engine.dispatch(body.action));
        return;
      }

      sendJson(response, 404, { ok: false, message: 'Not found' });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        message: error instanceof Error ? error.message : 'Bridge error',
      });
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  const broadcast = (message: BridgeServerMessage) => {
    const payload = JSON.stringify(message);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  };

  const unsubscribe = engine.subscribe((snapshot, status) => {
    broadcast({ type: 'snapshot', snapshot });
    broadcast({ type: 'status', status });
  });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'snapshot', snapshot: engine.getSnapshot() } satisfies BridgeServerMessage));
    socket.send(JSON.stringify({ type: 'status', status: engine.getStatus() } satisfies BridgeServerMessage));

    socket.on('message', async (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as {
          type?: string;
          requestId?: string;
          action?: MixerAction;
        };
        if (message.type !== 'action' || typeof message.requestId !== 'string' || !message.action) {
          return;
        }
        const result = await engine.dispatch(message.action);
        socket.send(
          JSON.stringify({
            type: 'result',
            requestId: message.requestId,
            result,
          } satisfies BridgeServerMessage),
        );
      } catch (error) {
        socket.send(
          JSON.stringify({
            type: 'result',
            requestId: 'unknown',
            result: {
              ok: false,
              simulated: false,
              code: 'invalid',
              message: error instanceof Error ? error.message : 'Invalid bridge message',
            },
          } satisfies BridgeServerMessage),
        );
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, host, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : requestedPort;

  return {
    port,
    url: `ws://${host}:${port}/ws`,
    close: async () => {
      unsubscribe();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
