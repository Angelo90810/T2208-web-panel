export type StripKind = 'mono' | 'stereo' | 'usb' | 'aux' | 'fx' | 'main';

export type DemoConnectionState =
  | 'demo-idle'
  | 'demo-discovering'
  | 'demo-connecting'
  | 'demo-connected'
  | 'demo-disconnected'
  | 'demo-firmware-model-mismatch'
  | 'demo-bridge-unavailable';

export type Language = 'pt-BR' | 'en' | 'zh-CN';

export interface DeviceCapabilities {
  stripCount: number;
  inputChannelCount: number;
  stereoPairCount: number;
  auxCount: number;
  fxSendCount: number;
  dcaGroupCount: number;
  phantomChannelCount: number;
  digitalCard: 'unknown' | 'present' | 'absent';
  verified: boolean;
}

export interface EqBand {
  id: string;
  type: 'peq' | 'hpf' | 'lpf';
  freq: number;
  gain: number;
  q: number;
  enabled: boolean;
}

export interface GateState {
  enabled: boolean;
  threshold: number;
  attack: number;
  release: number;
}

export interface CompressorState {
  enabled: boolean;
  threshold: number;
  attack: number;
  release: number;
  ratio: number;
  gain: number;
}

export interface FxState {
  enabled: boolean;
  type: string;
  params: Record<string, number>;
}

export interface ChannelState {
  id: string;
  index: number;
  name: string;
  kind: StripKind;
  inputLabel: string;
  gain: number;
  fader: number;
  mute: boolean;
  solo: boolean;
  pan: number;
  polarity: boolean;
  phantom: boolean;
  delayEnabled: boolean;
  delayMs: number;
  eqEnabled: boolean;
  eq: EqBand[];
  geq: number[];
  gate: GateState;
  comp: CompressorState;
  fx: FxState;
  sends: Record<string, number>;
  prePost: Record<string, 'pre' | 'post'>;
  mainAssign: boolean;
  dcaGroups: string[];
  automix: boolean;
  meter: number;
}

export interface BusState {
  id: string;
  name: string;
  kind: 'aux' | 'fx' | 'main';
  level: number;
  mute: boolean;
}

export interface DcaGroupState {
  id: string;
  name: string;
  gain: number;
  mute: boolean;
  solo: boolean;
  linked: boolean;
}

export interface AutoMixState {
  active: boolean;
  channels: Record<string, boolean>;
}

export interface LibraryItem {
  id: string;
  name: string;
  kind: 'preset' | 'scene';
  createdAt: string;
  snapshot: string;
}

export interface DemoLibrary {
  presets: LibraryItem[];
  scenes: LibraryItem[];
}

export interface SystemSettings {
  deviceName: string;
  deviceId: string;
  brightness: number;
  defaultPage: string;
  language: Language;
  ip: string;
  shortcut: string;
  firmware: string;
}

export interface MixerSnapshot {
  mode: 'demo';
  demoConnection: DemoConnectionState;
  capabilities: DeviceCapabilities;
  strips: ChannelState[];
  buses: BusState[];
  dcaGroups: DcaGroupState[];
  autoMix: AutoMixState;
  library: DemoLibrary;
  system: SystemSettings;
  outputMatrix: Record<string, boolean>;
  selectedStripId: string;
}

export interface DispatchResult {
  ok: boolean;
  simulated: true;
  code: 'applied' | 'invalid' | 'not-supported';
  message?: string;
}

export type StripControl =
  | 'fader'
  | 'gain'
  | 'mute'
  | 'solo'
  | 'pan'
  | 'polarity'
  | 'phantom48v'
  | 'delayEnabled'
  | 'delayMs'
  | 'mainAssign';

export type ProcessingSection = 'peq' | 'geq' | 'gate' | 'compressor' | 'fx' | 'delay';

export type SystemSetting =
  | 'deviceName'
  | 'deviceId'
  | 'brightness'
  | 'defaultPage'
  | 'language'
  | 'ip'
  | 'shortcut';

export type MixerAction =
  | { type: 'strip.select'; stripId: string }
  | {
      type: 'strip.set';
      stripId: string;
      control: StripControl;
      value: number | boolean;
    }
  | { type: 'strip.rename'; stripId: string; name: string }
  | { type: 'strip.map'; stripId: string; inputLabel: string }
  | {
      type: 'processing.set';
      stripId: string;
      section: ProcessingSection;
      controlKey: string;
      value: number | boolean | string;
    }
  | { type: 'routing.setSend'; stripId: string; busId: string; level: number }
  | {
      type: 'routing.setPrePost';
      stripId: string;
      busId: string;
      position: 'pre' | 'post';
    }
  | {
      type: 'routing.setOutput';
      sourceId: string;
      destinationId: string;
      enabled: boolean;
    }
  | { type: 'dca.assign'; stripId: string; dcaGroupId: string; assigned: boolean }
  | {
      type: 'dca.set';
      dcaGroupId: string;
      control: 'gain' | 'mute' | 'solo';
      value: number | boolean;
    }
  | { type: 'dca.link'; dcaGroupIds: string[]; linked: boolean }
  | { type: 'automix.setActive'; active: boolean }
  | { type: 'automix.setParticipation'; stripId: string; enabled: boolean }
  | { type: 'automix.clear' }
  | { type: 'library.save'; kind: 'preset' | 'scene'; name: string }
  | { type: 'library.load'; itemId: string }
  | { type: 'library.delete'; itemId: string }
  | { type: 'library.copy'; itemId: string; name: string }
  | { type: 'scene.recall'; sceneId: string }
  | { type: 'system.set'; setting: SystemSetting; value: string | number }
  | { type: 'system.resetDefaults'; scope: 'all' | 'system' }
  | { type: 'demo.setConnectionScenario'; state: DemoConnectionState };

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
