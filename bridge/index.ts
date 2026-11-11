import { T2208Simulator } from './device/simulator';
import { BridgeEngine } from './engine';
import { startBridgeServer } from './server';

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

async function main(): Promise<void> {
  if (flag('--help') || flag('-h')) {
    console.log(`T2208 local bridge

Usage:
  npm run bridge -- [options]
  npm run bridge:sim

Options:
  --host <host>            HTTP/WS bind host (default 127.0.0.1)
  --port <port>            HTTP/WS port (default 8787)
  --device <ip>            T2208 IPv4 address (TCP 5000)
  --device-port <port>     T2208 TCP port (default 5000)
  --allow-real-writes      Reservado; escrita de controle ainda não implementada
  --simulate               Start a local T2208 simulator and connect to it
  --help                   Show this help

Environment:
  T2208_BRIDGE_PORT, T2208_DEVICE_HOST, T2208_DEVICE_PORT, T2208_ALLOW_REAL_WRITES
`);
    return;
  }

  const simulate = flag('--simulate');
  const bindHost = arg('--host', process.env.T2208_BRIDGE_HOST ?? '127.0.0.1')!;
  const bridgePort = Number(arg('--port', process.env.T2208_BRIDGE_PORT ?? '8787'));
  // Control payloads are not validated yet; keep the bridge read-only even if
  // an operator passes the old flag.
  const allowRealWrites = false;
  if (flag('--allow-real-writes') || process.env.T2208_ALLOW_REAL_WRITES === '1') {
    console.warn('[bridge] escrita de controle ainda não implementada; flag ignorada');
  }

  let simulator: T2208Simulator | null = null;
  let deviceHost = arg('--device', process.env.T2208_DEVICE_HOST) ?? null;
  let devicePort = Number(arg('--device-port', process.env.T2208_DEVICE_PORT ?? '5000'));

  if (simulate) {
    simulator = new T2208Simulator({ host: '127.0.0.1' });
    const addresses = await simulator.start();
    deviceHost = addresses.host;
    devicePort = addresses.tcpPort;
    console.log(
      `[sim] T2208 simulator TCP ${addresses.tcpPort}, HF-A11 UDP ${addresses.hfPort}, IP120 UDP ${addresses.ipPort}`,
    );
  }

  const engine = new BridgeEngine({
    url: `ws://${bindHost}:${bridgePort}/ws`,
    deviceHost,
    devicePort,
    dryRun: !allowRealWrites,
    allowRealWrites,
  });

  await engine.start();

  const server = await startBridgeServer({
    engine,
    host: bindHost,
    port: bridgePort,
    discoveryTargetHost: simulate ? '127.0.0.1' : undefined,
  });

  console.log(`[bridge] HTTP  http://${bindHost}:${server.port}`);
  console.log(`[bridge] WS    ${server.url}`);
  console.log(`[bridge] mode  ${allowRealWrites ? 'REAL WRITES ENABLED (unverified)' : 'dry-run'}`);
  if (!deviceHost) {
    console.log('[bridge] sem --device; use POST /connect ou POST /discover para achar a mesa');
  }

  const shutdown = async () => {
    console.log('\n[bridge] encerrando...');
    await server.close();
    engine.disconnect();
    if (simulator) await simulator.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error) => {
  console.error('[bridge] fatal:', error);
  process.exit(1);
});
