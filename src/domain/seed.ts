import {
  DEFAULT_CAPABILITIES,
  DEFAULT_EQ_BANDS,
  DEFAULT_GEQ,
  DEMO_DEVICE,
  LIBRARY_STORAGE_KEY,
} from './constants';
import type {
  BusState,
  ChannelState,
  DcaGroupState,
  DemoLibrary,
  DeviceCapabilities,
  EqBand,
  MixerSnapshot,
  StripKind,
} from './types';

interface StripSpec {
  id: string;
  index: number;
  name: string;
  kind: StripKind;
  inputLabel: string;
}

function stripSpecs(capabilities: DeviceCapabilities): StripSpec[] {
  const specs: StripSpec[] = [];
  const monoCount = 16;
  const stereoPairs = Math.min(capabilities.stereoPairCount, 2);

  for (let i = 1; i <= monoCount; i += 1) {
    specs.push({
      id: `ch-${i}`,
      index: i,
      name: `Canal ${i}`,
      kind: 'mono',
      inputLabel: `CH ${i}`,
    });
  }

  for (let p = 0; p < stereoPairs; p += 1) {
    const left = monoCount + p * 2 + 1;
    const right = left + 1;
    specs.push({
      id: `ch-${left}-${right}`,
      index: left,
      name: `Canal ${left}/${right}`,
      kind: 'stereo',
      inputLabel: `CH ${left}/${right}`,
    });
  }

  specs.push({ id: 'usb', index: 19, name: 'USB', kind: 'usb', inputLabel: 'USB' });

  for (let i = 1; i <= capabilities.auxCount; i += 1) {
    specs.push({
      id: `aux-${i}`,
      index: 20 + i,
      name: `Aux ${i}`,
      kind: 'aux',
      inputLabel: `AUX ${i}`,
    });
  }

  for (let i = 1; i <= capabilities.fxSendCount; i += 1) {
    specs.push({
      id: `fx-${i}`,
      index: 20 + capabilities.auxCount + i,
      name: `FX ${i}`,
      kind: 'fx',
      inputLabel: `FX ${i}`,
    });
  }

  specs.push({ id: 'main', index: 30, name: 'Main', kind: 'main', inputLabel: 'MAIN' });

  return specs.slice(0, capabilities.stripCount);
}

function defaultEq(): EqBand[] {
  return DEFAULT_EQ_BANDS.map((band) => ({ ...band }));
}

function makeStrip(spec: StripSpec, auxCount: number, fxCount: number): ChannelState {
  const isInput = spec.kind === 'mono' || spec.kind === 'stereo' || spec.kind === 'usb';
  const sends: Record<string, number> = {};
  const prePost: Record<string, 'pre' | 'post'> = {};

  if (isInput) {
    for (let i = 1; i <= auxCount; i += 1) {
      sends[`aux-${i}`] = 0;
      prePost[`aux-${i}`] = 'post';
    }
    for (let i = 1; i <= fxCount; i += 1) {
      sends[`fx-${i}`] = 0;
      prePost[`fx-${i}`] = 'post';
    }
  }

  return {
    id: spec.id,
    index: spec.index,
    name: spec.name,
    kind: spec.kind,
    inputLabel: spec.inputLabel,
    gain: 0,
    fader: spec.kind === 'main' ? 80 : 75,
    mute: false,
    solo: false,
    pan: 0,
    polarity: false,
    phantom: false,
    delayEnabled: false,
    delayMs: 0,
    eqEnabled: isInput,
    eq: defaultEq(),
    geq: [...DEFAULT_GEQ],
    gate: { enabled: false, threshold: -60, attack: 10, release: 200 },
    comp: { enabled: false, limiter: false, threshold: -20, attack: 20, release: 200, ratio: 3, gain: 0 },
    fx: { enabled: false, type: 'Hall', params: { 'Pre Delay': 20, Decay: 2.4, Size: 50, 'Hi Damp': 6, Mix: 30 } },
    sends,
    prePost,
    mainAssign: isInput,
    dcaGroups: [],
    automix: false,
    meter: isInput ? 0.32 + (spec.index % 4) * 0.05 : spec.kind === 'main' ? 0.42 : 0.18,
  };
}

function makeBuses(auxCount: number, fxCount: number): BusState[] {
  const buses: BusState[] = [];
  for (let i = 1; i <= auxCount; i += 1) {
    buses.push({ id: `aux-${i}`, name: `Aux ${i}`, kind: 'aux', level: 70, mute: false });
  }
  for (let i = 1; i <= fxCount; i += 1) {
    buses.push({ id: `fx-${i}`, name: `FX ${i}`, kind: 'fx', level: 70, mute: false });
  }
  buses.push({ id: 'main', name: 'Main', kind: 'main', level: 80, mute: false });
  return buses;
}

function makeDcaGroups(count: number): DcaGroupState[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `dca-${i + 1}`,
    name: `DCA${i + 1}`,
    gain: 0,
    mute: false,
    solo: false,
    linked: false,
  }));
}

function makeLibrary(strips: ChannelState[], buses: BusState[], dcaGroups: DcaGroupState[], autoMix: MixerSnapshot['autoMix']): DemoLibrary {
  const snapshot = JSON.stringify({ strips, buses, dcaGroups, autoMix });
  const now = new Date().toISOString();
  return {
    presets: [
      {
        id: 'preset-demo-banda',
        name: 'Demo — Banda',
        kind: 'preset',
        createdAt: now,
        snapshot,
      },
      {
        id: 'preset-demo-vocal',
        name: 'Demo — Vocal',
        kind: 'preset',
        createdAt: now,
        snapshot,
      },
    ],
    scenes: [
      {
        id: 'scene-demo-inicial',
        name: 'Cena inicial',
        kind: 'scene',
        createdAt: now,
        snapshot,
      },
    ],
  };
}

export function buildSeedSnapshot(capabilities: DeviceCapabilities = DEFAULT_CAPABILITIES): MixerSnapshot {
  const specs = stripSpecs(capabilities);
  const strips = specs.map((spec) => makeStrip(spec, capabilities.auxCount, capabilities.fxSendCount));
  const buses = makeBuses(capabilities.auxCount, capabilities.fxSendCount);
  const dcaGroups = makeDcaGroups(capabilities.dcaGroupCount);
  const automixChannels: Record<string, boolean> = {};
  for (const strip of strips) {
    if (strip.kind === 'mono' || strip.kind === 'stereo') {
      automixChannels[strip.id] = false;
    }
  }
  const autoMix = { active: false, channels: automixChannels };
  const library = makeLibrary(strips, buses, dcaGroups, autoMix);

  return {
    mode: 'demo',
    connection: 'demo-idle',
    capabilities: { ...capabilities },
    strips,
    buses,
    dcaGroups,
    autoMix,
    library,
    system: {
      deviceName: DEMO_DEVICE.name,
      deviceId: DEMO_DEVICE.id,
      brightness: 80,
      defaultPage: 'mixer',
      language: 'pt-BR',
      ip: DEMO_DEVICE.ip,
      shortcut: 'none',
      firmware: DEMO_DEVICE.firmware,
    },
    outputMatrix: {},
    selectedStripId: strips[0]?.id ?? 'main',
  };
}

export function parseLibrary(raw: string | null): DemoLibrary | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DemoLibrary>;
    if (!parsed || !Array.isArray(parsed.presets) || !Array.isArray(parsed.scenes)) {
      return null;
    }
    const valid = [...parsed.presets, ...parsed.scenes].every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        (item.kind === 'preset' || item.kind === 'scene') &&
        typeof item.createdAt === 'string' &&
        typeof item.snapshot === 'string',
    );
    return valid ? { presets: parsed.presets, scenes: parsed.scenes } : null;
  } catch {
    return null;
  }
}

export { LIBRARY_STORAGE_KEY };
