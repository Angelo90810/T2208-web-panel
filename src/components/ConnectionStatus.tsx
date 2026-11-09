import { useMixer } from '../app/MixerProvider';
import { useI18n } from '../app/useI18n';

export function ConnectionStatus() {
  const { snapshot } = useMixer();
  const { t } = useI18n();
  const state = snapshot.demoConnection;
  const tone =
    state === 'demo-connected'
      ? 'ok'
      : state === 'demo-connecting' || state === 'demo-discovering'
        ? 'busy'
        : state === 'demo-firmware-model-mismatch' || state === 'demo-bridge-unavailable'
          ? 'warn'
          : 'idle';

  return (
    <span className={`status-pill status-pill--${tone}`} role="status" aria-live="polite">
      <span className="status-dot" aria-hidden="true" />
      {t(`status.${state}`)}
    </span>
  );
}
