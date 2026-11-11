import { describe, expect, it, vi } from 'vitest';
import { DemoAdapter } from './demo-adapter';
import type { StorageLike } from '../domain/types';

function memoryStorage(seed: Record<string, string> = {}): StorageLike & { dump: () => Record<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    dump: () => Object.fromEntries(data),
  };
}

describe('DemoAdapter', () => {
  it('seeds the confirmed 30-strip profile', () => {
    const adapter = new DemoAdapter({ storage: memoryStorage() });
    const snapshot = adapter.getSnapshot();

    expect(snapshot.mode).toBe('demo');
    expect(snapshot.strips).toHaveLength(30);
    expect(snapshot.strips.filter((strip) => strip.kind === 'mono')).toHaveLength(16);
    expect(snapshot.strips.filter((strip) => strip.kind === 'stereo')).toHaveLength(2);
    expect(snapshot.strips.filter((strip) => strip.kind === 'usb')).toHaveLength(1);
    expect(snapshot.strips.filter((strip) => strip.kind === 'aux')).toHaveLength(8);
    expect(snapshot.strips.filter((strip) => strip.kind === 'fx')).toHaveLength(2);
    expect(snapshot.strips.filter((strip) => strip.kind === 'main')).toHaveLength(1);
    expect(snapshot.dcaGroups).toHaveLength(6);
    expect(snapshot.capabilities.verified).toBe(false);
  });

  it('adaptsToInjectedCapabilities', () => {
    const adapter = new DemoAdapter({
      storage: memoryStorage(),
      capabilities: {
        stripCount: 27,
        inputChannelCount: 16,
        stereoPairCount: 0,
        auxCount: 8,
        fxSendCount: 1,
        dcaGroupCount: 4,
        phantomChannelCount: 16,
        digitalCard: 'absent',
        verified: false,
      },
    });
    const snapshot = adapter.getSnapshot();
    expect(snapshot.strips).toHaveLength(27);
    expect(snapshot.strips.filter((strip) => strip.kind === 'stereo')).toHaveLength(0);
    expect(snapshot.strips.filter((strip) => strip.kind === 'fx')).toHaveLength(1);
    expect(snapshot.dcaGroups).toHaveLength(4);
  });

  it('updates a channel control and notifies subscribers', async () => {
    const adapter = new DemoAdapter({ storage: memoryStorage() });
    const listener = vi.fn();
    adapter.subscribe(listener);

    const result = await adapter.dispatch({ type: 'strip.set', stripId: 'ch-1', control: 'fader', value: 42 });

    expect(result).toEqual({ ok: true, simulated: true, code: 'applied' });
    expect(adapter.getSnapshot().strips[0].fader).toBe(42);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('rejects phantom power on a stereo pair', async () => {
    const adapter = new DemoAdapter({ storage: memoryStorage() });
    const result = await adapter.dispatch({
      type: 'strip.set',
      stripId: 'ch-17-18',
      control: 'phantom48v',
      value: true,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('not-supported');
    expect(adapter.getSnapshot().strips.find((strip) => strip.id === 'ch-17-18')?.phantom).toBe(false);
  });

  it('toggles the simulated limiter independently of the compressor', async () => {
    const adapter = new DemoAdapter({ storage: memoryStorage() });
    const result = await adapter.dispatch({
      type: 'processing.set',
      stripId: 'ch-1',
      section: 'compressor',
      controlKey: 'limiter',
      value: true,
    });

    expect(result.ok).toBe(true);
    expect(adapter.getSnapshot().strips[0].comp.limiter).toBe(true);
    expect(adapter.getSnapshot().strips[0].comp.enabled).toBe(false);
  });

  it('usesSeedWhenStoredLibraryIsAbsent', () => {
    const adapter = new DemoAdapter({ storage: memoryStorage() });
    expect(adapter.getSnapshot().library.presets.length).toBeGreaterThan(0);
    expect(adapter.getSnapshot().library.scenes.length).toBeGreaterThan(0);
  });

  it('fallsBackToSeedWhenStoredLibraryIsInvalid', () => {
    const adapter = new DemoAdapter({
      storage: memoryStorage({ 't2208-demo-library-v1': '{not-json' }),
    });
    expect(adapter.getSnapshot().library.presets).toHaveLength(2);
  });

  it('persists a saved preset across adapter instances', async () => {
    const storage = memoryStorage();
    const first = new DemoAdapter({ storage });
    const saved = await first.dispatch({ type: 'library.save', kind: 'preset', name: 'Meu preset' });
    expect(saved.ok).toBe(true);

    const second = new DemoAdapter({ storage });
    expect(second.getSnapshot().library.presets.some((item) => item.name === 'Meu preset')).toBe(true);
  });

  it('applies a saved preset back to the mixer state', async () => {
    const adapter = new DemoAdapter({ storage: memoryStorage() });
    await adapter.dispatch({ type: 'strip.set', stripId: 'ch-1', control: 'fader', value: 10 });
    const saved = await adapter.dispatch({ type: 'library.save', kind: 'preset', name: 'Fader baixo' });
    expect(saved.ok).toBe(true);

    await adapter.dispatch({ type: 'strip.set', stripId: 'ch-1', control: 'fader', value: 90 });
    const item = adapter.getSnapshot().library.presets.find((preset) => preset.name === 'Fader baixo');
    expect(item).toBeDefined();

    const loaded = await adapter.dispatch({ type: 'library.load', itemId: item!.id });
    expect(loaded.ok).toBe(true);
    expect(adapter.getSnapshot().strips.find((strip) => strip.id === 'ch-1')?.fader).toBe(10);
  });

  it('keeps the demo connection states simulated', async () => {
    const adapter = new DemoAdapter({ storage: memoryStorage() });
    await adapter.dispatch({ type: 'demo.setConnectionScenario', state: 'demo-connected' });
    expect(adapter.getSnapshot().connection).toBe('demo-connected');
    expect(adapter.getSnapshot().connection.startsWith('demo-')).toBe(true);
  });
});
