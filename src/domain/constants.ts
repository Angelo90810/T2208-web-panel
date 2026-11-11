import type { DeviceCapabilities, EqBand } from './types';

export const LIBRARY_STORAGE_KEY = 't2208-demo-library-v1';
export const BRIDGE_URL_STORAGE_KEY = 't2208-bridge-url';
export const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:8787/ws';

export function defaultBridgeUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BRIDGE_URL;
  const host = window.location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return DEFAULT_BRIDGE_URL;
  }
  return `ws://${host}:8787/ws`;
}

export const DEFAULT_CAPABILITIES: DeviceCapabilities = {
  stripCount: 30,
  inputChannelCount: 20,
  stereoPairCount: 2,
  auxCount: 8,
  fxSendCount: 2,
  dcaGroupCount: 6,
  phantomChannelCount: 16,
  digitalCard: 'unknown',
  verified: false,
};

export const FADER_MIN = 0;
export const FADER_MAX = 100;
export const GAIN_MIN = -60;
export const GAIN_MAX = 10;
export const PAN_MIN = -100;
export const PAN_MAX = 100;
export const DELAY_MAX_MS = 300;

export const GATE_THRESHOLD_MIN = -84;
export const GATE_THRESHOLD_MAX = 0;
export const GATE_ATTACK_MIN = 0.5;
export const GATE_ATTACK_MAX = 200;
export const GATE_RELEASE_MIN = 10;
export const GATE_RELEASE_MAX = 1000;

export const COMP_THRESHOLD_MIN = -30;
export const COMP_THRESHOLD_MAX = 20;
export const COMP_ATTACK_MIN = 10;
export const COMP_ATTACK_MAX = 150;
export const COMP_RELEASE_MIN = 10;
export const COMP_RELEASE_MAX = 1000;
export const COMP_RATIO_MIN = 1;
export const COMP_RATIO_MAX = 10;

export const PEQ_GAIN_MIN = -24;
export const PEQ_GAIN_MAX = 24;
export const PEQ_Q_MIN = 0.4;
export const PEQ_Q_MAX = 24;
export const GEQ_MIN = -24;
export const GEQ_MAX = 24;

export const EQ_FREQUENCIES = [20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000];

export const DEFAULT_EQ_BANDS: EqBand[] = [
  { id: 'hpf', type: 'hpf', freq: 80, gain: 0, q: 0.7, enabled: false },
  { id: 'band1', type: 'peq', freq: 120, gain: 0, q: 1, enabled: true },
  { id: 'band2', type: 'peq', freq: 800, gain: 0, q: 1, enabled: true },
  { id: 'band3', type: 'peq', freq: 4000, gain: 0, q: 1, enabled: true },
  { id: 'band4', type: 'peq', freq: 10000, gain: 0, q: 1, enabled: true },
  { id: 'lpf', type: 'lpf', freq: 16000, gain: 0, q: 0.7, enabled: false },
];

export const DEFAULT_GEQ = Array.from({ length: 31 }, () => 0);

export const FX_TYPES = [
  'Hall',
  'Room',
  'Plate',
  'Delay',
  'Stdelay',
  'Tremolo',
  'Flanger',
  'Chorus',
  'DelayRev',
  'StDelayRev',
  'FlangerRev',
  'ChorusRev',
];

export const FX_PARAMETERS: Record<string, string[]> = {
  Hall: ['Pre Delay', 'Decay', 'Room Size', 'Hi Damp', 'Efx Out', 'Dry Out'],
  Room: ['Pre Delay', 'Decay', 'Room Size', 'Hi Damp', 'Efx Out', 'Dry Out'],
  Plate: ['Pre Delay', 'Decay', 'Room Size', 'Hi Damp', 'Efx Out', 'Dry Out'],
  Delay: ['Time', 'Decay', 'Hi Damp', 'Efx Out', 'Dry Out'],
  Stdelay: ['L Time', 'R Time', 'L Decay', 'R Decay', 'Hi Damp', 'Efx Out', 'Dry Out'],
  Tremolo: ['Feed Back', 'Depth', 'ModFreq', 'Efx Out', 'Dry Out'],
  Flanger: ['Feed Back', 'Depth', 'ModFreq', 'Efx Out', 'Dry Out'],
  Chorus: ['Pre Delay', 'Rev Decay', 'Room Size', 'Rev Hi', 'Rev Out', 'ModF.B', 'ModDepth', 'ModFreq', 'Mod Out', 'Dry Out'],
  DelayRev: ['Pre Delay', 'Rev Decay', 'Room Size', 'Rev Hi', 'Rev Out', 'L Time', 'R Time', 'L Decay', 'R Decay', 'Echo Hi', 'Echo Out', 'Dry Out'],
  StDelayRev: ['Pre Delay', 'Rev Decay', 'Room Size', 'Rev Hi', 'Rev Out', 'L Time', 'R Time', 'L Decay', 'R Decay', 'Echo Hi', 'Echo Out', 'Dry Out'],
  FlangerRev: ['Pre Delay', 'Rev Decay', 'Room Size', 'Rev Hi', 'Rev Out', 'ModF.B', 'ModDepth', 'ModFreq', 'Mod Out', 'Dry Out'],
  ChorusRev: ['Pre Delay', 'Rev Decay', 'Room Size', 'Rev Hi', 'Rev Out', 'ModF.B', 'ModDepth', 'ModFreq', 'Mod Out', 'Dry Out'],
};

export const DEFAULT_PAGE = 'mixer';

export const DEMO_DEVICE = {
  name: 'T2208',
  id: '',
  ip: '',
  firmware: 'V1.1',
};
