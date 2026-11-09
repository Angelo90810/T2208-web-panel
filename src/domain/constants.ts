import type { DeviceCapabilities, EqBand } from './types';

export const LIBRARY_STORAGE_KEY = 't2208-demo-library-v1';

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

export const FX_TYPES = ['Hall', 'Room', 'Plate', 'Delay', 'Chorus', 'Echo'];

export const FX_PARAMETERS: Record<string, string[]> = {
  Hall: ['Pre Delay', 'Decay', 'Size', 'Hi Damp', 'Mix'],
  Room: ['Pre Delay', 'Decay', 'Size', 'Hi Damp', 'Mix'],
  Plate: ['Pre Delay', 'Decay', 'Size', 'Hi Damp', 'Mix'],
  Delay: ['Time', 'Feedback', 'Hi Damp', 'Mix'],
  Chorus: ['Rate', 'Depth', 'Mix'],
  Echo: ['Time', 'Feedback', 'Mix'],
};

export const DEFAULT_PAGE = 'mixer';

export const DEMO_DEVICE = {
  name: 'T2208 DEMO',
  id: 'DEMO-2208',
  ip: '192.168.1.100',
  firmware: 'V1.1 (alvo do app)',
};
