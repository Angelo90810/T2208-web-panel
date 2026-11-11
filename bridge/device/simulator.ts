import dgram from 'node:dgram';
import net from 'node:net';
import { FrameParser, type T2208Frame } from '../protocol/frame';
import {
  CommandType,
  ackFrame,
  asciiPayload,
  encodeCommand,
} from '../protocol/commands';

export interface SimulatorOptions {
  host?: string;
  tcpPort?: number;
  hfPort?: number;
  ipPort?: number;
  version?: string;
  name?: string;
}

export interface SimulatorAddresses {
  host: string;
  tcpPort: number;
  hfPort: number;
  ipPort: number;
}

/**
 * Minimal T2208 stand-in for tests and for the demo bridge. It answers the
 * safe probes (version, name, preset list, ACK) and discovery. It does not
 * emulate DSP state; control frames receive an ACK so the transport can be
 * exercised end to end.
 */
export class T2208Simulator {
  private readonly host: string;
  private readonly requestedTcpPort: number;
  private readonly requestedHfPort: number;
  private readonly requestedIpPort: number;
  private readonly version: string;
  private readonly name: string;
  private tcpServer: net.Server | null = null;
  private hfSocket: dgram.Socket | null = null;
  private ipSocket: dgram.Socket | null = null;
  private readonly parsers = new Map<net.Socket, FrameParser>();
  readonly receivedTypes: number[] = [];
  addresses: SimulatorAddresses | null = null;

  constructor(options: SimulatorOptions = {}) {
    this.host = options.host ?? '127.0.0.1';
    this.requestedTcpPort = options.tcpPort ?? 5000;
    this.requestedHfPort = options.hfPort ?? 48899;
    this.requestedIpPort = options.ipPort ?? 8000;
    this.version = options.version ?? 'V1.1';
    this.name = options.name ?? 'T2208-SIM';
  }

  async start(): Promise<SimulatorAddresses> {
    this.tcpServer = net.createServer((socket) => this.onConnection(socket));
    await new Promise<void>((resolve, reject) => {
      this.tcpServer!.once('error', reject);
      this.tcpServer!.listen(this.requestedTcpPort, this.host, () => resolve());
    });
    const tcpPort = (this.tcpServer.address() as net.AddressInfo).port;

    this.hfSocket = dgram.createSocket('udp4');
    await new Promise<void>((resolve, reject) => {
      this.hfSocket!.once('error', reject);
      this.hfSocket!.bind(this.requestedHfPort, this.host, () => resolve());
    });
    this.hfSocket.on('message', (message, remote) => {
      if (message.toString('ascii').includes('HF-A11ASSISTHREAD')) {
        this.hfSocket!.send(
          Buffer.from(`${this.host},AABBCCDDEEFF,`, 'ascii'),
          remote.port,
          remote.address,
        );
      }
    });
    const hfPort = (this.hfSocket.address() as { port: number }).port;

    this.ipSocket = dgram.createSocket('udp4');
    await new Promise<void>((resolve, reject) => {
      this.ipSocket!.once('error', reject);
      this.ipSocket!.bind(this.requestedIpPort, this.host, () => resolve());
    });
    this.ipSocket.on('message', (message, remote) => {
      if (message.length >= 12) {
        this.ipSocket!.send(
          Buffer.from(`${this.host},AABBCCDDEEFF,`, 'ascii'),
          remote.port,
          remote.address,
        );
      }
    });
    const ipPort = (this.ipSocket.address() as { port: number }).port;

    this.addresses = { host: this.host, tcpPort, hfPort, ipPort };
    return this.addresses;
  }

  private onConnection(socket: net.Socket): void {
    this.parsers.set(socket, new FrameParser());
    socket.on('data', (chunk) => {
      const parser = this.parsers.get(socket);
      if (!parser) return;
      const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      for (const frame of parser.push(data)) {
        this.receivedTypes.push(frame.type);
        socket.write(this.replyFor(frame));
      }
    });
    socket.on('close', () => this.parsers.delete(socket));
    socket.on('error', () => this.parsers.delete(socket));
  }

  private replyFor(frame: T2208Frame): Buffer {
    switch (frame.type) {
      case CommandType.ReadVersion:
        return encodeCommand(
          CommandType.ReadVersion,
          asciiPayload(this.version, 6),
          16,
        );
      case CommandType.ReadDeviceName:
        return encodeCommand(
          CommandType.ReadDeviceName,
          asciiPayload(this.name, 17),
          27,
        );
      case CommandType.ReadPresetList:
        return encodeCommand(CommandType.ReadPresetList, Buffer.from([0]), 11);
      case CommandType.Ack:
        return ackFrame();
      default:
        return ackFrame();
    }
  }

  async stop(): Promise<void> {
    for (const socket of this.parsers.keys()) socket.destroy();
    this.parsers.clear();

    if (this.tcpServer) {
      await new Promise<void>((resolve) => this.tcpServer!.close(() => resolve()));
      this.tcpServer = null;
    }
    for (const socket of [this.hfSocket, this.ipSocket]) {
      if (!socket) continue;
      await new Promise<void>((resolve) => socket.close(() => resolve()));
    }
    this.hfSocket = null;
    this.ipSocket = null;
    this.addresses = null;
  }
}
