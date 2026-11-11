import { BridgeAdapter } from '../adapters/bridge-adapter';
import type { MixerAdapter } from '../adapters/mixer-adapter';
import { BRIDGE_URL_STORAGE_KEY, DEFAULT_BRIDGE_URL } from '../domain/constants';

export function createAdapter(): MixerAdapter {
  if (typeof window === 'undefined') return new BridgeAdapter(DEFAULT_BRIDGE_URL);

  const query = new URLSearchParams(window.location.search).get('bridge');
  const stored = window.localStorage.getItem(BRIDGE_URL_STORAGE_KEY);
  const candidate = query ?? stored;

  return new BridgeAdapter(candidate === '1' ? DEFAULT_BRIDGE_URL : candidate || DEFAULT_BRIDGE_URL);
}
