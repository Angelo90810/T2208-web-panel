import { useMemo } from 'react';
import { DemoAdapter } from './adapters/demo-adapter';
import { AppShell } from './app/AppShell';
import { MixerProvider } from './app/MixerProvider';

export default function App() {
  const adapter = useMemo(() => new DemoAdapter(), []);

  return (
    <MixerProvider adapter={adapter}>
      <AppShell />
    </MixerProvider>
  );
}
