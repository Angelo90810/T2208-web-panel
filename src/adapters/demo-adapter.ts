import {
  COMP_ATTACK_MAX,
  COMP_ATTACK_MIN,
  COMP_RATIO_MAX,
  COMP_RATIO_MIN,
  COMP_RELEASE_MAX,
  COMP_RELEASE_MIN,
  COMP_THRESHOLD_MAX,
  COMP_THRESHOLD_MIN,
  DEFAULT_CAPABILITIES,
  DELAY_MAX_MS,
  FX_TYPES,
  GATE_ATTACK_MAX,
  GATE_ATTACK_MIN,
  GATE_RELEASE_MAX,
  GATE_RELEASE_MIN,
  GATE_THRESHOLD_MAX,
  GATE_THRESHOLD_MIN,
  GEQ_MAX,
  GEQ_MIN,
  LIBRARY_STORAGE_KEY,
  PEQ_GAIN_MAX,
  PEQ_GAIN_MIN,
  PEQ_Q_MAX,
  PEQ_Q_MIN,
} from '../domain/constants';
import { buildSeedSnapshot, parseLibrary } from '../domain/seed';
import type {
  ChannelState,
  DemoConnectionState,
  DemoLibrary,
  DeviceCapabilities,
  DispatchResult,
  LibraryItem,
  MixerAction,
  MixerSnapshot,
  StorageLike,
} from '../domain/types';
import type { MixerAdapter } from './mixer-adapter';

const CONNECTION_STATES: DemoConnectionState[] = [
  'demo-idle',
  'demo-discovering',
  'demo-connecting',
  'demo-connected',
  'demo-disconnected',
  'demo-firmware-model-mismatch',
  'demo-bridge-unavailable',
];

const LANGUAGES = new Set(['pt-BR', 'en', 'zh-CN']);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function defaultStorage(): StorageLike {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    },
  };
}

function librarySnapshot(snapshot: MixerSnapshot): string {
  return JSON.stringify({
    strips: snapshot.strips,
    buses: snapshot.buses,
    dcaGroups: snapshot.dcaGroups,
    autoMix: snapshot.autoMix,
    outputMatrix: snapshot.outputMatrix,
  });
}

function findLibraryItem(library: DemoLibrary, itemId: string): LibraryItem | undefined {
  return [...library.presets, ...library.scenes].find((item) => item.id === itemId);
}

export interface DemoAdapterOptions {
  storage?: StorageLike;
  capabilities?: DeviceCapabilities;
}

export class DemoAdapter implements MixerAdapter {
  private snapshot: MixerSnapshot;
  private readonly listeners = new Set<(snapshot: MixerSnapshot) => void>();
  private readonly storage: StorageLike;
  private readonly linkBackups = new Map<string, ChannelState>();

  constructor(options: DemoAdapterOptions = {}) {
    this.storage = options.storage ?? defaultStorage();
    this.snapshot = buildSeedSnapshot(options.capabilities ?? DEFAULT_CAPABILITIES);
    const stored = parseLibrary(this.storage.getItem(LIBRARY_STORAGE_KEY));
    if (stored) {
      this.snapshot = { ...this.snapshot, library: stored };
    }
  }

  getSnapshot = (): MixerSnapshot => this.snapshot;

  subscribe = (listener: (snapshot: MixerSnapshot) => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async dispatch(action: MixerAction): Promise<DispatchResult> {
    const result = this.apply(action);
    if (result.ok) {
      this.emit();
    }
    return result;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }

  private persistLibrary(library: DemoLibrary): void {
    try {
      this.storage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
    } catch {
      // A failed demo-library write must not break the panel.
    }
  }

  private updateStrip(stripId: string, update: (strip: ChannelState) => ChannelState): boolean {
    const index = this.snapshot.strips.findIndex((strip) => strip.id === stripId);
    if (index < 0) return false;
    const strips = this.snapshot.strips.map((strip, i) => (i === index ? update(strip) : strip));
    this.snapshot = { ...this.snapshot, strips };
    return true;
  }

  private setLink(stripId: string, linked: boolean): boolean {
    const source = this.snapshot.strips.find((strip) => strip.id === stripId);
    if (!source) return false;

    const pairIndex = source.kind === 'mono'
      ? source.index % 2 === 1 ? source.index + 1 : source.index - 1
      : source.kind === 'aux'
        ? (source.index - 20) % 2 === 1 ? source.index + 1 : source.index - 1
        : -1;
    const pair = this.snapshot.strips.find(
      (strip) => strip.kind === source.kind && strip.index === pairIndex,
    );
    if (!pair) return false;

    if (!linked) {
      const backup = this.linkBackups.get(pair.id);
      this.snapshot = {
        ...this.snapshot,
        strips: this.snapshot.strips.map((strip) => {
          if (strip.id === source.id) return { ...strip, linked: false };
          if (strip.id === pair.id) return backup ? { ...backup, linked: false } : { ...strip, linked: false };
          return strip;
        }),
      };
      this.linkBackups.delete(pair.id);
      return true;
    }

    this.linkBackups.set(pair.id, { ...pair });
    const copied: ChannelState = {
      ...pair,
      gain: source.gain,
      fader: source.fader,
      mute: source.mute,
      solo: source.solo,
      pan: source.pan,
      polarity: source.polarity,
      delayEnabled: source.delayEnabled,
      delayMs: source.delayMs,
      eqEnabled: source.eqEnabled,
      eq: source.eq.map((band) => ({ ...band })),
      geq: [...source.geq],
      gate: { ...source.gate },
      comp: { ...source.comp },
      fx: { ...source.fx, params: { ...source.fx.params } },
      sends: { ...source.sends },
      prePost: { ...source.prePost },
      mainAssign: source.mainAssign,
      linked: true,
    };

    this.snapshot = {
      ...this.snapshot,
      strips: this.snapshot.strips.map((strip) => {
        if (strip.id === source.id) return { ...strip, linked: true };
        if (strip.id === pair.id) return copied;
        return strip;
      }),
    };
    return true;
  }

  private apply(action: MixerAction): DispatchResult {
    switch (action.type) {
      case 'strip.select': {
        if (!this.snapshot.strips.some((strip) => strip.id === action.stripId)) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Canal inexistente.' };
        }
        this.snapshot = { ...this.snapshot, selectedStripId: action.stripId };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'strip.set': {
        const target = this.snapshot.strips.find((strip) => strip.id === action.stripId);
        if (!target) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Canal inexistente.' };
        }
        let value = action.value;
        if (typeof value === 'number' && !isNumber(value)) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Valor inválido.' };
        }
        if (action.control === 'fader' && typeof value === 'number') value = clamp(value, 0, 100);
        if (action.control === 'gain' && typeof value === 'number') value = clamp(value, -60, 10);
        if (action.control === 'pan' && typeof value === 'number') value = clamp(value, -100, 100);
        if (action.control === 'delayMs' && typeof value === 'number') value = clamp(value, 0, DELAY_MAX_MS);
        if (action.control === 'link') {
          if (typeof value !== 'boolean') {
            return { ok: false, simulated: true, code: 'invalid', message: 'Valor inválido.' };
          }
          return this.setLink(action.stripId, value)
            ? { ok: true, simulated: true, code: 'applied' }
            : { ok: false, simulated: true, code: 'not-supported', message: 'Canal sem par de link.' };
        }
        if (action.control === 'mainAssign' && (target.kind === 'aux' || target.kind === 'main')) {
          return { ok: false, simulated: true, code: 'not-supported', message: 'Este canal não vai para o Main.' };
        }
        if (action.control === 'phantom48v') {
          if (target.kind !== 'mono' || target.index > this.snapshot.capabilities.phantomChannelCount) {
            return { ok: false, simulated: true, code: 'not-supported', message: '48V indisponível neste canal.' };
          }
          if (typeof value !== 'boolean') {
            return { ok: false, simulated: true, code: 'invalid', message: 'Valor inválido.' };
          }
        }
        const updated = this.updateStrip(action.stripId, (strip) => {
          switch (action.control) {
            case 'fader':
              return { ...strip, fader: Number(value) };
            case 'gain':
              return { ...strip, gain: Number(value) };
            case 'mute':
              return { ...strip, mute: Boolean(value) };
            case 'solo':
              return { ...strip, solo: Boolean(value) };
            case 'pan':
              return { ...strip, pan: Number(value) };
            case 'polarity':
              return { ...strip, polarity: Boolean(value) };
            case 'phantom48v':
              return { ...strip, phantom: Boolean(value) };
            case 'delayEnabled':
              return { ...strip, delayEnabled: Boolean(value) };
            case 'delayMs':
              return { ...strip, delayMs: Number(value) };
            case 'mainAssign':
              return { ...strip, mainAssign: Boolean(value) };
            default:
              return strip;
          }
        });
        return updated
          ? { ok: true, simulated: true, code: 'applied' }
          : { ok: false, simulated: true, code: 'invalid' };
      }

      case 'strip.rename': {
        const name = action.name.trim().slice(0, 12);
        return this.updateStrip(action.stripId, (strip) => ({ ...strip, name }))
          ? { ok: true, simulated: true, code: 'applied' }
          : { ok: false, simulated: true, code: 'invalid' };
      }

      case 'strip.map': {
        const inputLabel = action.inputLabel.trim().slice(0, 16);
        if (!inputLabel) return { ok: false, simulated: true, code: 'invalid', message: 'Entrada vazia.' };
        return this.updateStrip(action.stripId, (strip) => ({ ...strip, inputLabel }))
          ? { ok: true, simulated: true, code: 'applied' }
          : { ok: false, simulated: true, code: 'invalid' };
      }

      case 'strip.copy': {
        const from = this.snapshot.strips.find((strip) => strip.id === action.fromId);
        const to = this.snapshot.strips.find((strip) => strip.id === action.toId);
        if (!from || !to || from.id === to.id) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Origem/destino inválidos.' };
        }
        const updated = this.updateStrip(to.id, (target) => ({
          ...target,
          polarity: from.polarity,
          gain: from.gain,
          delayEnabled: from.delayEnabled,
          delayMs: from.delayMs,
          gate: { ...from.gate },
          comp: { ...from.comp },
          eqEnabled: from.eqEnabled,
          eq: from.eq.map((band) => ({ ...band })),
          sends: { ...from.sends },
          prePost: { ...from.prePost },
          mainAssign: from.mainAssign,
        }));
        return updated
          ? { ok: true, simulated: true, code: 'applied' }
          : { ok: false, simulated: true, code: 'invalid' };
      }

      case 'processing.set': {
        const strip = this.snapshot.strips.find((item) => item.id === action.stripId);
        if (!strip) return { ok: false, simulated: true, code: 'invalid', message: 'Canal inexistente.' };
        const result = this.applyProcessing(strip, action);
        if (!result.ok) return result;
        this.updateStrip(action.stripId, () => result.strip);
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'routing.setSend': {
        const bus = this.snapshot.buses.find((item) => item.id === action.busId);
        if (!bus || !isNumber(action.level)) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Bus inválido.' };
        }
        const level = clamp(action.level, 0, 100);
        return this.updateStrip(action.stripId, (strip) => ({
          ...strip,
          sends: { ...strip.sends, [action.busId]: level },
        }))
          ? { ok: true, simulated: true, code: 'applied' }
          : { ok: false, simulated: true, code: 'invalid' };
      }

      case 'routing.setPrePost': {
        const bus = this.snapshot.buses.find((item) => item.id === action.busId);
        if (!bus) return { ok: false, simulated: true, code: 'invalid', message: 'Bus inválido.' };
        return this.updateStrip(action.stripId, (strip) => ({
          ...strip,
          prePost: { ...strip.prePost, [action.busId]: action.position },
        }))
          ? { ok: true, simulated: true, code: 'applied' }
          : { ok: false, simulated: true, code: 'invalid' };
      }

      case 'routing.setOutput': {
        const key = `${action.sourceId}->${action.destinationId}`;
        const outputMatrix = { ...this.snapshot.outputMatrix };
        if (action.enabled) outputMatrix[key] = true;
        else delete outputMatrix[key];
        this.snapshot = { ...this.snapshot, outputMatrix };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'dca.assign': {
        const group = this.snapshot.dcaGroups.find((item) => item.id === action.dcaGroupId);
        if (!group) return { ok: false, simulated: true, code: 'invalid', message: 'DCA inválido.' };
        const updated = this.updateStrip(action.stripId, (strip) => {
          const groups = new Set(strip.dcaGroups);
          if (action.assigned) groups.add(action.dcaGroupId);
          else groups.delete(action.dcaGroupId);
          return { ...strip, dcaGroups: [...groups] };
        });
        return updated
          ? { ok: true, simulated: true, code: 'applied' }
          : { ok: false, simulated: true, code: 'invalid' };
      }

      case 'dca.set': {
        const exists = this.snapshot.dcaGroups.some((item) => item.id === action.dcaGroupId);
        if (!exists) return { ok: false, simulated: true, code: 'invalid', message: 'DCA inválido.' };
        this.snapshot = {
          ...this.snapshot,
          dcaGroups: this.snapshot.dcaGroups.map((group) =>
            group.id === action.dcaGroupId
              ? {
                  ...group,
                  ...(action.control === 'gain' ? { gain: clamp(Number(action.value), -60, 10) } : {}),
                  ...(action.control === 'mute' ? { mute: Boolean(action.value) } : {}),
                  ...(action.control === 'solo' ? { solo: Boolean(action.value) } : {}),
                }
              : group,
          ),
        };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'dca.rename': {
        const name = action.name.trim().slice(0, 8);
        if (!name) return { ok: false, simulated: true, code: 'invalid', message: 'Nome vazio.' };
        const exists = this.snapshot.dcaGroups.some((item) => item.id === action.dcaGroupId);
        if (!exists) return { ok: false, simulated: true, code: 'invalid', message: 'DCA inválido.' };
        this.snapshot = {
          ...this.snapshot,
          dcaGroups: this.snapshot.dcaGroups.map((group) =>
            group.id === action.dcaGroupId ? { ...group, name } : group,
          ),
        };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'dca.link': {
        const ids = new Set(action.dcaGroupIds);
        this.snapshot = {
          ...this.snapshot,
          dcaGroups: this.snapshot.dcaGroups.map((group) =>
            ids.has(group.id) ? { ...group, linked: action.linked } : group,
          ),
        };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'automix.setActive': {
        this.snapshot = {
          ...this.snapshot,
          autoMix: { ...this.snapshot.autoMix, active: Boolean(action.active) },
        };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'automix.setParticipation': {
        if (!(action.stripId in this.snapshot.autoMix.channels)) {
          return { ok: false, simulated: true, code: 'not-supported', message: 'Canal fora do AutoMix.' };
        }
        this.snapshot = {
          ...this.snapshot,
          autoMix: {
            ...this.snapshot.autoMix,
            channels: { ...this.snapshot.autoMix.channels, [action.stripId]: Boolean(action.enabled) },
          },
        };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'automix.clear': {
        const channels = Object.fromEntries(
          Object.keys(this.snapshot.autoMix.channels).map((id) => [id, false]),
        );
        this.snapshot = { ...this.snapshot, autoMix: { active: false, channels } };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'library.save': {
        const name = action.name.trim().slice(0, 32);
        if (!name) return { ok: false, simulated: true, code: 'invalid', message: 'Nome vazio.' };
        const item: LibraryItem = {
          id: `${action.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          kind: action.kind,
          createdAt: new Date().toISOString(),
          snapshot: librarySnapshot(this.snapshot),
        };
        const library: DemoLibrary =
          action.kind === 'preset'
            ? { ...this.snapshot.library, presets: [...this.snapshot.library.presets, item] }
            : { ...this.snapshot.library, scenes: [...this.snapshot.library.scenes, item] };
        this.snapshot = { ...this.snapshot, library };
        this.persistLibrary(library);
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'library.load':
      case 'scene.recall': {
        const itemId = action.type === 'library.load' ? action.itemId : action.sceneId;
        const item = findLibraryItem(this.snapshot.library, itemId);
        if (!item || (action.type === 'scene.recall' && item.kind !== 'scene')) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Item inexistente.' };
        }
        return this.applyLibraryItem(item);
      }

      case 'library.delete': {
        const exists = findLibraryItem(this.snapshot.library, action.itemId);
        if (!exists) return { ok: false, simulated: true, code: 'invalid', message: 'Item inexistente.' };
        const library: DemoLibrary = {
          presets: this.snapshot.library.presets.filter((item) => item.id !== action.itemId),
          scenes: this.snapshot.library.scenes.filter((item) => item.id !== action.itemId),
        };
        this.snapshot = { ...this.snapshot, library };
        this.persistLibrary(library);
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'library.copy': {
        const item = findLibraryItem(this.snapshot.library, action.itemId);
        if (!item) return { ok: false, simulated: true, code: 'invalid', message: 'Item inexistente.' };
        const name = action.name.trim().slice(0, 32);
        if (!name) return { ok: false, simulated: true, code: 'invalid', message: 'Nome vazio.' };
        const copy: LibraryItem = {
          ...item,
          id: `${item.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          createdAt: new Date().toISOString(),
        };
        const library: DemoLibrary =
          item.kind === 'preset'
            ? { ...this.snapshot.library, presets: [...this.snapshot.library.presets, copy] }
            : { ...this.snapshot.library, scenes: [...this.snapshot.library.scenes, copy] };
        this.snapshot = { ...this.snapshot, library };
        this.persistLibrary(library);
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'system.set': {
        if (action.setting === 'language' && !LANGUAGES.has(String(action.value))) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Idioma inválido.' };
        }
        if (action.setting === 'brightness') {
          this.snapshot = {
            ...this.snapshot,
            system: { ...this.snapshot.system, brightness: clamp(Number(action.value), 0, 100) },
          };
          return { ok: true, simulated: true, code: 'applied' };
        }
        if (typeof action.value !== 'string') {
          return { ok: false, simulated: true, code: 'invalid', message: 'Valor vazio.' };
        }
        const system = { ...this.snapshot.system };
        const value = action.value.trim();
        if (action.setting === 'deviceName') system.deviceName = value;
        else if (action.setting === 'deviceId') system.deviceId = value;
        else if (action.setting === 'defaultPage') system.defaultPage = value;
        else if (action.setting === 'language') system.language = value as typeof system.language;
        else if (action.setting === 'ip') system.ip = value;
        else if (action.setting === 'shortcut') system.shortcut = value;
        this.snapshot = { ...this.snapshot, system };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'system.resetDefaults': {
        const seed = buildSeedSnapshot(this.snapshot.capabilities);
        if (action.scope === 'system') {
          this.snapshot = { ...this.snapshot, system: seed.system };
        } else {
          this.snapshot = {
            ...this.snapshot,
            strips: seed.strips,
            buses: seed.buses,
            dcaGroups: seed.dcaGroups,
            autoMix: seed.autoMix,
            system: seed.system,
            outputMatrix: {},
            selectedStripId: seed.strips.some((strip) => strip.id === this.snapshot.selectedStripId)
              ? this.snapshot.selectedStripId
              : seed.selectedStripId,
          };
        }
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'demo.setConnectionScenario': {
        if (!CONNECTION_STATES.includes(action.state)) {
          return { ok: false, simulated: true, code: 'invalid', message: 'Estado inválido.' };
        }
        this.snapshot = { ...this.snapshot, connection: action.state };
        return { ok: true, simulated: true, code: 'applied' };
      }

      case 'bridge.connect':
      case 'bridge.disconnect': {
        return {
          ok: false,
          simulated: true,
          code: 'not-supported',
          message: 'A ponte local só existe no modo bridge.',
        };
      }

      default:
        return { ok: false, simulated: true, code: 'not-supported' };
    }
  }

  private applyProcessing(
    strip: ChannelState,
    action: Extract<MixerAction, { type: 'processing.set' }>,
  ): { ok: true; strip: ChannelState } | { ok: false; simulated: true; code: 'invalid' | 'not-supported'; message?: string } {
    const { section, controlKey, value } = action;

    if (section === 'peq') {
      if (controlKey === 'eqEnabled') {
        return { ok: true, strip: { ...strip, eqEnabled: Boolean(value) } };
      }
      const [bandId, field] = controlKey.split('.');
      const band = strip.eq.find((item) => item.id === bandId);
      if (!band || !field) {
        return { ok: false, simulated: true, code: 'invalid', message: 'Banda inválida.' };
      }
      const eq = strip.eq.map((item) => {
        if (item.id !== bandId) return item;
        if (field === 'enabled') return { ...item, enabled: Boolean(value) };
        if (field === 'type' && typeof value === 'string' && ['peq', 'hpf', 'lpf'].includes(value)) {
          return { ...item, type: value as typeof item.type };
        }
        if (field === 'freq' && isNumber(value)) return { ...item, freq: clamp(value, 20, 20000) };
        if (field === 'gain' && isNumber(value)) return { ...item, gain: clamp(value, PEQ_GAIN_MIN, PEQ_GAIN_MAX) };
        if (field === 'q' && isNumber(value)) return { ...item, q: clamp(value, PEQ_Q_MIN, PEQ_Q_MAX) };
        return item;
      });
      return { ok: true, strip: { ...strip, eq } };
    }

    if (section === 'geq') {
      const index = Number(controlKey);
      if (!Number.isInteger(index) || index < 0 || index >= strip.geq.length || !isNumber(value)) {
        return { ok: false, simulated: true, code: 'invalid', message: 'Banda GEQ inválida.' };
      }
      const geq = strip.geq.map((gain, i) => (i === index ? clamp(value, GEQ_MIN, GEQ_MAX) : gain));
      return { ok: true, strip: { ...strip, geq } };
    }

    if (section === 'gate') {
      if (controlKey === 'enabled') return { ok: true, strip: { ...strip, gate: { ...strip.gate, enabled: Boolean(value) } } };
      if (!isNumber(value)) return { ok: false, simulated: true, code: 'invalid' };
      if (controlKey === 'threshold') return { ok: true, strip: { ...strip, gate: { ...strip.gate, threshold: clamp(value, GATE_THRESHOLD_MIN, GATE_THRESHOLD_MAX) } } };
      if (controlKey === 'attack') return { ok: true, strip: { ...strip, gate: { ...strip.gate, attack: clamp(value, GATE_ATTACK_MIN, GATE_ATTACK_MAX) } } };
      if (controlKey === 'release') return { ok: true, strip: { ...strip, gate: { ...strip.gate, release: clamp(value, GATE_RELEASE_MIN, GATE_RELEASE_MAX) } } };
      return { ok: false, simulated: true, code: 'invalid' };
    }

    if (section === 'compressor') {
      if (controlKey === 'enabled') return { ok: true, strip: { ...strip, comp: { ...strip.comp, enabled: Boolean(value) } } };
      if (!isNumber(value)) return { ok: false, simulated: true, code: 'invalid' };
      if (controlKey === 'threshold') return { ok: true, strip: { ...strip, comp: { ...strip.comp, threshold: clamp(value, COMP_THRESHOLD_MIN, COMP_THRESHOLD_MAX) } } };
      if (controlKey === 'attack') return { ok: true, strip: { ...strip, comp: { ...strip.comp, attack: clamp(value, COMP_ATTACK_MIN, COMP_ATTACK_MAX) } } };
      if (controlKey === 'release') return { ok: true, strip: { ...strip, comp: { ...strip.comp, release: clamp(value, COMP_RELEASE_MIN, COMP_RELEASE_MAX) } } };
      if (controlKey === 'ratio') return { ok: true, strip: { ...strip, comp: { ...strip.comp, ratio: clamp(value, COMP_RATIO_MIN, COMP_RATIO_MAX) } } };
      if (controlKey === 'gain') return { ok: true, strip: { ...strip, comp: { ...strip.comp, gain: clamp(value, 0, 24) } } };
      return { ok: false, simulated: true, code: 'invalid' };
    }

    if (section === 'fx') {
      if (controlKey === 'enabled') return { ok: true, strip: { ...strip, fx: { ...strip.fx, enabled: Boolean(value) } } };
      if (controlKey === 'type' && typeof value === 'string' && FX_TYPES.includes(value)) {
        return { ok: true, strip: { ...strip, fx: { ...strip.fx, type: value } } };
      }
      if (controlKey.startsWith('param.') && isNumber(value)) {
        const name = controlKey.slice(6);
        return {
          ok: true,
          strip: { ...strip, fx: { ...strip.fx, params: { ...strip.fx.params, [name]: clamp(value, 0, 100) } } },
        };
      }
      return { ok: false, simulated: true, code: 'invalid' };
    }

    if (section === 'delay') {
      if (controlKey === 'enabled') return { ok: true, strip: { ...strip, delayEnabled: Boolean(value) } };
      if (controlKey === 'ms' && isNumber(value)) {
        return { ok: true, strip: { ...strip, delayMs: clamp(value, 0, DELAY_MAX_MS) } };
      }
      return { ok: false, simulated: true, code: 'invalid' };
    }

    return { ok: false, simulated: true, code: 'not-supported' };
  }

  private applyLibraryItem(item: LibraryItem): DispatchResult {
    try {
      const parsed = JSON.parse(item.snapshot) as Partial<MixerSnapshot>;
      if (!Array.isArray(parsed.strips) || !Array.isArray(parsed.buses) || !Array.isArray(parsed.dcaGroups)) {
        return { ok: false, simulated: true, code: 'invalid', message: 'Snapshot inválido.' };
      }
      this.snapshot = {
        ...this.snapshot,
        strips: parsed.strips,
        buses: parsed.buses,
        dcaGroups: parsed.dcaGroups,
        autoMix: parsed.autoMix ?? this.snapshot.autoMix,
        outputMatrix: parsed.outputMatrix ?? {},
        selectedStripId: parsed.strips.some((strip) => strip.id === this.snapshot.selectedStripId)
          ? this.snapshot.selectedStripId
          : parsed.strips[0]?.id ?? this.snapshot.selectedStripId,
      };
      return { ok: true, simulated: true, code: 'applied' };
    } catch {
      return { ok: false, simulated: true, code: 'invalid', message: 'Snapshot inválido.' };
    }
  }
}
