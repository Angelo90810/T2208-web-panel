import type { BridgeConnectionState, MixerSnapshot } from '../src/domain/types';

export interface DeviceStatus {
  connected: boolean;
  host: string | null;
  port: number;
  version: string | null;
  name: string | null;
  lastError: string | null;
}

export interface BridgeStatus {
  mode: 'bridge';
  connection: BridgeConnectionState;
  device: DeviceStatus;
  dryRun: boolean;
  allowRealWrites: boolean;
  lastError: string | null;
  uptimeMs: number;
}

export interface DiscoveredDevice {
  host: string;
  source: 'hf-a11' | 'ip120';
  raw: string;
}

export interface BridgeSnapshotMessage {
  type: 'snapshot';
  snapshot: MixerSnapshot;
}

export interface BridgeStatusMessage {
  type: 'status';
  status: BridgeStatus;
}

export interface BridgeResultMessage {
  type: 'result';
  requestId: string;
  result: unknown;
}

export type BridgeServerMessage = BridgeSnapshotMessage | BridgeStatusMessage | BridgeResultMessage;

export type BridgeClientMessage =
  | { type: 'hello' }
  | { type: 'action'; requestId: string; action: unknown };
