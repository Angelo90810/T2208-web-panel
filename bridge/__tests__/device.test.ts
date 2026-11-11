// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { T2208Simulator } from '../device/simulator';
import { TcpDeviceClient } from '../device/client';
import { discoverDevices } from '../protocol/discovery';
import { getVersionFrame } from '../protocol/commands';
import type { DeviceStatus } from '../types';

describe('T2208 simulator and TCP client', () => {
  const simulator = new T2208Simulator({
    host: '127.0.0.1',
    tcpPort: 0,
    hfPort: 0,
    ipPort: 0,
  });

  beforeAll(async () => {
    await simulator.start();
  });

  afterAll(async () => {
    await simulator.stop();
  });

  it('answers version and name probes over TCP 5000', async () => {
    const addresses = simulator.addresses!;
    let resolveVersion!: (status: DeviceStatus) => void;
    const versionSeen = new Promise<DeviceStatus>((resolve) => {
      resolveVersion = resolve;
    });

    const client = new TcpDeviceClient({
      host: addresses.host,
      port: addresses.tcpPort,
      connectTimeoutMs: 2000,
      heartbeatMs: 60_000,
      onStatus: (status) => {
        if (status.version && status.name) resolveVersion(status);
      },
    });

    await client.connect();
    const status = await versionSeen;
    expect(status.version).toBe('V1.1');
    expect(status.name).toBe('T2208-SIM');
    expect(simulator.receivedTypes).toContain(44);
    expect(simulator.receivedTypes).toContain(37);

    client.send(getVersionFrame());
    expect(client.getStatus().connected).toBe(true);
    client.close();
  });

  it('discovers the simulator through both UDP probes', async () => {
    const addresses = simulator.addresses!;
    const devices = await discoverDevices({
      targetHost: '127.0.0.1',
      hfPort: addresses.hfPort,
      ipPort: addresses.ipPort,
      ipLocalPort: 0,
      timeoutMs: 500,
    });

    expect(devices.length).toBeGreaterThanOrEqual(2);
    expect(devices.map((device) => device.source)).toEqual(
      expect.arrayContaining(['hf-a11', 'ip120']),
    );
    expect(devices.every((device) => device.host === '127.0.0.1')).toBe(true);
  });
});
