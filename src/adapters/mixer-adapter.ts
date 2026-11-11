import type { MixerAction, MixerSnapshot, DispatchResult } from '../domain/types';

export interface MixerAdapter {
  getSnapshot(): MixerSnapshot;
  subscribe(listener: (snapshot: MixerSnapshot) => void): () => void;
  dispatch(action: MixerAction): Promise<DispatchResult>;
  close?(): void;
}
