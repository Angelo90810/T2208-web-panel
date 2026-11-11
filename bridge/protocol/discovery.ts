import dgram from 'node:dgram';
import type { DiscoveredDevice } from '../types';

const HF_A11_TOKEN = Buffer.from('HF-A11ASSISTHREAD', 'ascii');
const IP120_PROBE = Buffer.from([0x01, 0x02, 0x00, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xff, 0x11]);
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;

export interface DiscoveryOptions {
  /** Unicast target for tests; omit to use 255.255.255.255. */
  targetHost?: string;
  hfPort?: number;
  ipPort?: number;
  /** Local port used by the IP120/IP210 path. The app uses 5005. */
  ipLocalPort?: number;
  timeoutMs?: number;
}

interface SocketResult {
  socket: dgram.Socket;
  port: number;
}

function bindSocket(port: number, host: string): Promise<SocketResult> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const onError = (error: Error) => {
      socket.close();
      reject(error);
    };
    socket.once('error', onError);
    socket.bind(port, host, () => {
      socket.off('error', onError);
      socket.setBroadcast(true);
      const address = socket.address();
      resolve({ socket, port: address.port });
    });
  });
}

function extractHost(raw: string, fallback: string): string {
  return raw.match(IPV4)?.[0] ?? fallback;
}

export async function discoverDevices(options: DiscoveryOptions = {}): Promise<DiscoveredDevice[]> {
  const target = options.targetHost ?? '255.255.255.255';
  const hfPort = options.hfPort ?? 48899;
  const ipPort = options.ipPort ?? 8000;
  const ipLocalPort = options.ipLocalPort ?? 5005;
  const timeoutMs = options.timeoutMs ?? 2200;
  const found = new Map<string, DiscoveredDevice>();
  const sockets: dgram.Socket[] = [];

  const add = (device: DiscoveredDevice) => {
    const key = `${device.source}:${device.host}`;
    if (!found.has(key)) found.set(key, device);
  };

  const hf = await bindSocket(0, '0.0.0.0').catch(() => null);
  if (hf) {
    sockets.push(hf.socket);
    hf.socket.on('message', (message, remote) => {
      const raw = message.toString('ascii');
      if (!raw) return;
      add({ host: extractHost(raw, remote.address), source: 'hf-a11', raw });
    });
    hf.socket.send(HF_A11_TOKEN, hfPort, target);
  }

  const ip = await bindSocket(ipLocalPort, '0.0.0.0').catch(() => null);
  if (ip) {
    sockets.push(ip.socket);
    ip.socket.on('message', (message, remote) => {
      if (message.length < 12) return;
      const raw = message.toString('ascii');
      add({ host: extractHost(raw, remote.address), source: 'ip120', raw });
    });
    ip.socket.send(IP120_PROBE, ipPort, target);
  }

  if (sockets.length === 0) return [];

  await new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });

  for (const socket of sockets) {
    try {
      socket.close();
    } catch {
      // Already closed by a socket error.
    }
  }

  return [...found.values()];
}
