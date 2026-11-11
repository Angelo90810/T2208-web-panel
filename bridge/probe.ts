import { TcpDeviceClient } from './device/client';
import { discoverDevices } from './protocol/discovery';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

async function probeHost(host: string, port: number): Promise<void> {
  const client = new TcpDeviceClient({
    host,
    port,
    connectTimeoutMs: 4000,
    heartbeatMs: 10_000,
  });

  try {
    await client.connect();
    const started = Date.now();
    while (Date.now() - started < 2500) {
      const status = client.getStatus();
      if (status.version && status.name) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const status = client.getStatus();
    console.log(
      JSON.stringify(
        {
          host,
          port,
          connected: status.connected,
          version: status.version,
          name: status.name,
          error: status.lastError,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          host,
          port,
          connected: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

async function main(): Promise<void> {
  if (flag('--help') || flag('-h')) {
    console.log(`T2208 safe probe

Usage:
  npm run probe -- --host 192.168.1.50 [--port 5000]
  npm run probe -- --discover [--target 127.0.0.1]

Only version, device name and keepalive are sent. No control write is made.
`);
    return;
  }

  const port = Number(arg('--port') ?? '5000');

  if (flag('--discover')) {
    const devices = await discoverDevices({
      timeoutMs: Number(arg('--timeout') ?? '2500'),
      targetHost: arg('--target'),
    });
    if (devices.length === 0) {
      console.log('Nenhum dispositivo respondeu à descoberta UDP.');
      return;
    }
    const hosts = [...new Set(devices.map((device) => device.host))];
    console.log(`Descoberta: ${devices.length} resposta(s), ${hosts.length} host(s).`);
    for (const host of hosts) await probeHost(host, port);
    return;
  }

  const host = arg('--host');
  if (!host) {
    console.error('Use --host <ip> ou --discover. Veja --help.');
    process.exitCode = 1;
    return;
  }
  await probeHost(host, port);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
