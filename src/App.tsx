import { useEffect, useMemo } from 'react';
import { AppShell } from './app/AppShell';
import { createAdapter } from './app/createAdapter';
import { MixerProvider } from './app/MixerProvider';

export default function App() {
  const adapter = useMemo(() => createAdapter(), []);

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
