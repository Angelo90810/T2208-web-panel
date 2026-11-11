import { DemoAdapter } from '../src/adapters/demo-adapter';
import type {
  BridgeConnectionState,
  DeviceCapabilities,
  DispatchResult,
  MixerAction,
  MixerSnapshot,
  StorageLike,
} from '../src/domain/types';
import { TcpDeviceClient } from './device/client';
import type { BridgeStatus, DeviceStatus } from './types';

export interface BridgeEngineOptions {
  url?: string;
  deviceHost?: string | null;
  devicePort?: number;
  dryRun?: boolean;
  allowRealWrites?: boolean;
  capabilities?: DeviceCapabilities;
}

function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function versionMatches(version: string | null): boolean {
  return !version || /^v?1\.1/i.test(version);
}

export class BridgeEngine {
  private readonly demo: DemoAdapter;
  private readonly options: BridgeEngineOptions;
  private readonly listeners = new Set<(snapshot: MixerSnapshot, status: BridgeStatus) => void>();
  private client: TcpDeviceClient | null = null;
  private startedAt = Date.now();
  private status: BridgeStatus;

  constructor(options: BridgeEngineOptions = {}) {
    this.options = options;
    this.demo = new DemoAdapter({
      storage: memoryStorage(),
      capabilities: options.capabilities,
    });
    this.demo.subscribe(() => this.emit());
    this.status = {
      mode: 'bridge',
      connection: 'bridge-idle',
      device: {
        connected: false,
        host: options.deviceHost ?? null,
        port: options.devicePort ?? 5000,
        version: null,
        name: null,
        lastError: null,
      },
      dryRun: options.dryRun ?? true,
      allowRealWrites: options.allowRealWrites ?? false,
      lastError: null,
      uptimeMs: 0,
    };
  }

  async start(): Promise<BridgeStatus> {
    this.startedAt = Date.now();
    if (this.options.deviceHost) {
      await this.connect(this.options.deviceHost, this.options.devicePort ?? 5000);
    }
    return this.getStatus();
  }

  async connect(host: string, port = 5000): Promise<BridgeStatus> {
    this.disconnect();
    this.status = {
      ...this.status,
      connection: 'bridge-connecting',
      lastError: null,
      device: {
        connected: false,
        host,
        port,
        version: null,
        name: null,
        lastError: null,
      },
    };
    this.emit();

    const client = new TcpDeviceClient({
      host,
      port,
      onStatus: (device) => this.onDeviceStatus(device),
    });
    this.client = client;

    try {
      const device = await client.connect();
      this.status = {
        ...this.status,
        device,
        connection: versionMatches(device.version) ? 'bridge-connected' : 'bridge-firmware-mismatch',
        lastError: device.version && !versionMatches(device.version)
          ? `Firmware ${device.version} fora do alvo V1.1`
          : null,
      };
    } catch (error) {
      this.status = {
        ...this.status,
        connection: 'bridge-unavailable',
        lastError: error instanceof Error ? error.message : 'Falha ao conectar',
        device: {
          ...this.status.device,
          connected: false,
          lastError: error instanceof Error ? error.message : 'Falha ao conectar',
        },
      };
    }

    this.emit();
    return this.getStatus();
  }

  disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.status = {
      ...this.status,
      connection: 'bridge-disconnected',
      device: { ...this.status.device, connected: false },
    };
    this.emit();
  }

  async dispatch(action: MixerAction): Promise<DispatchResult> {
    if (action.type === 'bridge.connect') {
      await this.connect(action.host, action.port ?? 5000);
      return { ok: true, simulated: false, code: 'applied', confirmed: true };
    }
    if (action.type === 'bridge.disconnect') {
      this.disconnect();
      return { ok: true, simulated: false, code: 'applied', confirmed: true };
    }

    const result = await this.demo.dispatch(action);
    return {
      ...result,
      simulated: true,
      confirmed: false,
      message:
        result.message ??
        (this.status.dryRun
          ? 'Estado da ponte; escrita real em dry-run.'
          : 'Estado otimista da ponte; confirmação da mesa ainda não implementada.'),
    };
  }

  getSnapshot(): MixerSnapshot {
    const base = this.demo.getSnapshot();
    const device = this.status.device;
    return {
      ...base,
      mode: 'bridge',
      connection: this.status.connection,
      system: {
        ...base.system,
        ip: device.host ?? base.system.ip,
        firmware: device.version ?? base.system.firmware,
      },
      bridge: {
        url: this.options.url ?? '',
        deviceHost: device.host,
        devicePort: device.port,
        connected: device.connected,
        version: device.version,
        deviceName: device.name,
        dryRun: this.status.dryRun,
        allowRealWrites: this.status.allowRealWrites,
        lastError: this.status.lastError,
      },
    };
  }

  getStatus(): BridgeStatus {
    return {
      ...this.status,
      uptimeMs: Date.now() - this.startedAt,
    };
  }

  subscribe(listener: (snapshot: MixerSnapshot, status: BridgeStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private onDeviceStatus(device: DeviceStatus): void {
    const connection: BridgeConnectionState = device.connected
      ? versionMatches(device.version)
        ? 'bridge-connected'
        : 'bridge-firmware-mismatch'
      : this.status.connection === 'bridge-connecting'
        ? 'bridge-connecting'
        : 'bridge-disconnected';

    this.status = {
      ...this.status,
      device,
      connection,
      lastError: device.lastError ?? this.status.lastError,
    };
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    const status = this.getStatus();
    for (const listener of this.listeners) listener(snapshot, status);
  }
}
