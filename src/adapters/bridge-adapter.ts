import { DEFAULT_BRIDGE_URL } from '../domain/constants';
import { buildEmptySnapshot } from '../domain/seed';
import type {
  BridgeConnectionState,
  DispatchResult,
  MixerAction,
  MixerSnapshot,
} from '../domain/types';
import type { MixerAdapter } from './mixer-adapter';

interface BridgeStatusPayload {
  connection: BridgeConnectionState;
  device: {
    host: string | null;
    port: number;
    connected: boolean;
    version: string | null;
    name: string | null;
    lastError: string | null;
  };
  dryRun: boolean;
  allowRealWrites: boolean;
  lastError: string | null;
}

interface PendingRequest {
  resolve: (result: DispatchResult) => void;
  timer: number;
}

function requestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Browser adapter for the local bridge. It is deliberately a thin transport:
 * the bridge owns the device socket and the authoritative snapshot. If the
 * bridge is offline the panel stays on its last snapshot and never pretends
 * to be connected to a mixer.
 */
export class BridgeAdapter implements MixerAdapter {
  private snapshot: MixerSnapshot;
  private readonly listeners = new Set<(snapshot: MixerSnapshot) => void>();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly url: string;
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private closed = false;

  constructor(url = DEFAULT_BRIDGE_URL) {
    this.url = url;
    const base = buildEmptySnapshot();
    this.snapshot = {
      ...base,
      mode: 'bridge',
      connection: 'bridge-unavailable',
      bridge: {
        url,
        deviceHost: null,
        devicePort: 5000,
        connected: false,
        version: null,
        deviceName: null,
        dryRun: true,
        allowRealWrites: false,
        lastError: null,
      },
    };
  }

  getSnapshot = (): MixerSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: MixerSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    this.open();
    return () => {
      this.listeners.delete(listener);
    };
  };

  dispatch = async (action: MixerAction): Promise<DispatchResult> => {
    if (action.type === 'demo.setConnectionScenario') {
      return {
        ok: false,
        simulated: true,
        code: 'not-supported',
        message: 'Cenários demo não existem no modo ponte.',
      };
    }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.open();
      return {
        ok: false,
        simulated: false,
        code: 'not-supported',
        message: 'Ponte local indisponível.',
      };
    }

    const id = requestId();
    const socket = this.socket;
    return new Promise<DispatchResult>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        resolve({
          ok: false,
          simulated: false,
          code: 'not-supported',
          message: 'Tempo esgotado aguardando a ponte.',
        });
      }, 5000);
      this.pending.set(id, { resolve, timer });
      socket.send(JSON.stringify({ type: 'action', requestId: id, action }));
    });
  };

  close = (): void => {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    for (const [id, pending] of this.pending) {
      window.clearTimeout(pending.timer);
      pending.resolve({
        ok: false,
        simulated: false,
        code: 'not-supported',
        message: 'Ponte encerrada.',
      });
      this.pending.delete(id);
    }
  };

  private open(): void {
    if (this.closed || this.socket) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch (error) {
      this.setOffline(error instanceof Error ? error.message : 'URL da ponte inválida.');
      return;
    }
    this.socket = socket;

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'hello' }));
      this.snapshot = {
        ...this.snapshot,
        bridge: this.snapshot.bridge
          ? { ...this.snapshot.bridge, lastError: null }
          : this.snapshot.bridge,
      };
      this.emit();
    });

    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      this.handleMessage(event.data);
    });

    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = null;
      this.setOffline('Ponte local offline.');
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      socket.close();
    });
  }

  private handleMessage(raw: string): void {
    let message: {
      type?: string;
      snapshot?: MixerSnapshot;
      status?: BridgeStatusPayload;
      requestId?: string;
      result?: DispatchResult;
    };
    try {
      message = JSON.parse(raw) as typeof message;
    } catch {
      return;
    }

    if (message.type === 'snapshot' && message.snapshot) {
      const incoming = message.snapshot;
      this.snapshot = {
        ...incoming,
        mode: 'bridge',
        bridge: {
          url: this.url,
          deviceHost: incoming.bridge?.deviceHost ?? null,
          devicePort: incoming.bridge?.devicePort ?? 5000,
          connected: incoming.bridge?.connected ?? false,
          version: incoming.bridge?.version ?? null,
          deviceName: incoming.bridge?.deviceName ?? null,
          dryRun: incoming.bridge?.dryRun ?? true,
          allowRealWrites: incoming.bridge?.allowRealWrites ?? false,
          lastError: incoming.bridge?.lastError ?? null,
        },
      };
      this.emit();
      return;
    }

    if (message.type === 'status' && message.status) {
      this.applyStatus(message.status);
      return;
    }

    if (message.type === 'result' && typeof message.requestId === 'string' && message.result) {
      const pending = this.pending.get(message.requestId);
      if (pending) {
        window.clearTimeout(pending.timer);
        this.pending.delete(message.requestId);
        pending.resolve(message.result);
      }
    }
  }

  private applyStatus(status: BridgeStatusPayload): void {
    this.snapshot = {
      ...this.snapshot,
      connection: status.connection,
      bridge: {
        url: this.url,
        deviceHost: status.device.host,
        devicePort: status.device.port,
        connected: status.device.connected,
        version: status.device.version,
        deviceName: status.device.name,
        dryRun: status.dryRun,
        allowRealWrites: status.allowRealWrites,
        lastError: status.lastError,
      },
    };
    this.emit();
  }

  private setOffline(message: string): void {
    this.snapshot = {
      ...this.snapshot,
      connection: 'bridge-unavailable',
      bridge: {
        url: this.url,
        deviceHost: this.snapshot.bridge?.deviceHost ?? null,
        devicePort: this.snapshot.bridge?.devicePort ?? 5000,
        connected: false,
        version: this.snapshot.bridge?.version ?? null,
        deviceName: this.snapshot.bridge?.deviceName ?? null,
        dryRun: this.snapshot.bridge?.dryRun ?? true,
        allowRealWrites: this.snapshot.bridge?.allowRealWrites ?? false,
        lastError: message,
      },
    };
    this.emit();
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, 2500);
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.snapshot);
  }
}
