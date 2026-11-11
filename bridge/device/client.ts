import net from 'node:net';
import { FrameParser, type T2208Frame } from '../protocol/frame';
import {
  CommandType,
  ackFrame,
  getVersionFrame,
  parseAscii,
  readDeviceNameFrame,
} from '../protocol/commands';
import type { DeviceStatus } from '../types';

export interface TcpDeviceClientOptions {
  host: string;
  port?: number;
  connectTimeoutMs?: number;
  heartbeatMs?: number;
  onFrame?: (frame: T2208Frame) => void;
  onStatus?: (status: DeviceStatus) => void;
}

/**
 * TCP 5000 client for the T2208. It sends only the safe probes recovered from
 * the APK (version, name, keepalive). Control writes are intentionally not
 * wired here until the payload encodings are validated on hardware.
 */
export class TcpDeviceClient {
  private readonly host: string;
  private readonly port: number;
  private readonly connectTimeoutMs: number;
  private readonly heartbeatMs: number;
  private readonly onFrame?: (frame: T2208Frame) => void;
  private readonly onStatus?: (status: DeviceStatus) => void;
  private socket: net.Socket | null = null;
  private parser = new FrameParser();
  private heartbeat: NodeJS.Timeout | null = null;
  private status: DeviceStatus;

  constructor(options: TcpDeviceClientOptions) {
    this.host = options.host;
    this.port = options.port ?? 5000;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 5000;
    this.heartbeatMs = options.heartbeatMs ?? 3000;
    this.onFrame = options.onFrame;
    this.onStatus = options.onStatus;
    this.status = {
      connected: false,
      host: this.host,
      port: this.port,
      version: null,
      name: null,
      lastError: null,
    };
  }

  getStatus(): DeviceStatus {
    return { ...this.status };
  }

  async connect(): Promise<DeviceStatus> {
    this.close();
    const socket = new net.Socket();
    this.socket = socket;
    this.parser = new FrameParser();
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 10_000);

    socket.on('data', (chunk) => {
      const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      for (const frame of this.parser.push(data)) {
        this.handleFrame(frame);
        this.onFrame?.(frame);
      }
    });
    socket.on('error', (error) => {
      this.status = { ...this.status, connected: false, lastError: error.message };
      this.onStatus?.(this.getStatus());
    });
    socket.on('close', () => {
      this.stopHeartbeat();
      this.status = { ...this.status, connected: false };
      this.onStatus?.(this.getStatus());
    });

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`TCP connect timeout to ${this.host}:${this.port}`));
      }, this.connectTimeoutMs);

      socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      socket.connect(this.port, this.host);
    }).catch((error: Error) => {
      this.status = { ...this.status, connected: false, lastError: error.message };
      this.onStatus?.(this.getStatus());
      throw error;
    });

    this.status = {
      ...this.status,
      connected: true,
      lastError: null,
    };
    this.startHeartbeat();
    this.onStatus?.(this.getStatus());

    // Same probes the APK sends after connecting.
    this.send(getVersionFrame());
    this.send(readDeviceNameFrame());
    this.send(ackFrame());

    return this.getStatus();
  }

  send(frame: Buffer): boolean {
    if (!this.socket || !this.status.connected || this.socket.destroyed) return false;
    this.socket.write(frame);
    return true;
  }

  close(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.status = { ...this.status, connected: false };
  }

  private handleFrame(frame: T2208Frame): void {
    let changed = false;
    if (frame.type === CommandType.ReadVersion) {
      const version = parseAscii(frame.payload);
      if (version) {
        this.status = { ...this.status, version };
        changed = true;
      }
    } else if (frame.type === CommandType.ReadDeviceName) {
      const name = parseAscii(frame.payload);
      if (name) {
        this.status = { ...this.status, name };
        changed = true;
      }
    }
    if (changed) this.onStatus?.(this.getStatus());
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      this.send(ackFrame());
    }, this.heartbeatMs);
    this.heartbeat.unref();
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }
}
