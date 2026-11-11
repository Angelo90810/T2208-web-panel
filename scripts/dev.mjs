import { spawn } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const children = [];
let shuttingDown = false;
const lan = process.argv.includes('--lan');
const viteArgs = process.argv.slice(2).filter((arg) => arg !== '--lan');

function start(command, args, name) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) console.error(`[dev] ${name} encerrado por ${signal}`);
    else if (code !== 0) console.error(`[dev] ${name} saiu com código ${code}`);
    shutdown(code ?? 0);
  });
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      // The process may already be gone.
    }
  }
  process.exit(code);
}

async function bridgeIsUp() {
  try {
    const response = await fetch('http://127.0.0.1:8787/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBridge() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await bridgeIsUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

if (await bridgeIsUp()) {
  console.log('[dev] ponte já está rodando em 127.0.0.1:8787');
  if (lan) {
    console.warn('[dev] a ponte existente pode estar em 127.0.0.1; para tablet/celular, feche-a e suba com --lan.');
  }
} else {
  console.log('[dev] subindo ponte local...');
  const bridgeArgs = [path.join(root, 'node_modules/tsx/dist/cli.mjs'), 'bridge/index.ts'];
  if (lan) bridgeArgs.push('--host', '0.0.0.0');
  start(process.execPath, bridgeArgs, 'ponte');
  const ready = await waitForBridge();
  if (!ready) console.warn('[dev] a ponte não respondeu em 10 s; o painel vai abrir offline.');
}

console.log('[dev] subindo Vite...');
if (lan && !viteArgs.includes('--host')) viteArgs.push('--host', '0.0.0.0');
start(
  process.execPath,
  [path.join(root, 'node_modules/vite/bin/vite.js'), ...viteArgs],
  'vite',
);

// Keep the wrapper alive while the children run.
await new Promise(() => {});
