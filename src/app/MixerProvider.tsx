import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { MixerAdapter } from '../adapters/mixer-adapter';
import type { DispatchResult, MixerAction, MixerSnapshot } from '../domain/types';

interface MixerContextValue {
  snapshot: MixerSnapshot;
  dispatch: (action: MixerAction) => Promise<DispatchResult>;
}

const MixerContext = createContext<MixerContextValue | null>(null);

export function MixerProvider({ adapter, children }: { adapter: MixerAdapter; children: ReactNode }) {
  const snapshot = useSyncExternalStore(adapter.subscribe, adapter.getSnapshot, adapter.getSnapshot);
  const value = useMemo<MixerContextValue>(
    () => ({
      snapshot,
      dispatch: (action) => adapter.dispatch(action),
    }),
    [adapter, snapshot],
  );

  return <MixerContext.Provider value={value}>{children}</MixerContext.Provider>;
}

export function useMixer(): MixerContextValue {
  const value = useContext(MixerContext);
  if (!value) {
    throw new Error('useMixer must be used inside MixerProvider');
  }
  return value;
}
