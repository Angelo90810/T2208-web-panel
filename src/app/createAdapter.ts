import { BridgeAdapter } from '../adapters/bridge-adapter';
import { DemoAdapter } from '../adapters/demo-adapter';
import type { MixerAdapter } from '../adapters/mixer-adapter';
import { BRIDGE_URL_STORAGE_KEY, DEFAULT_BRIDGE_URL } from '../domain/constants';

export function createAdapter(): MixerAdapter {
  if (typeof window === 'undefined') return new DemoAdapter();

  const query = new URLSearchParams(window.location.search).get('bridge');
  const stored = window.localStorage.getItem(BRIDGE_URL_STORAGE_KEY);
  const candidate = query ?? stored;

  if (!candidate) return new DemoAdapter();
  return new BridgeAdapter(candidate === '1' ? DEFAULT_BRIDGE_URL : candidate);
}
