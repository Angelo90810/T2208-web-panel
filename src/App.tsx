import { useEffect, useMemo } from 'react';
import type { MixerAdapter } from './adapters/mixer-adapter';
import { AppShell } from './app/AppShell';
import { createAdapter } from './app/createAdapter';
import { MixerProvider } from './app/MixerProvider';

export default function App({ adapter: injected }: { adapter?: MixerAdapter } = {}) {
  const adapter = useMemo(() => injected ?? createAdapter(), [injected]);

  useEffect(
    () => () => {
      adapter.close?.();
    },
    [adapter],
  );

  return (
    <MixerProvider adapter={adapter}>
      <AppShell />
    </MixerProvider>
  );
}
