import { useI18n } from '../app/useI18n';
import { useMixer } from '../app/MixerProvider';
import { Icon } from './Icon';

export function BridgeBanner() {
  const { snapshot } = useMixer();
  const { t } = useI18n();
  const offline =
    snapshot.connection === 'bridge-unavailable' || snapshot.connection === 'bridge-disconnected';
  const detail = offline
    ? t('bridge.offline')
    : snapshot.bridge?.dryRun
      ? t('bridge.dryRun')
      : t('bridge.live');

  return (
    <div className="demo-banner bridge-banner" role="status">
      <Icon name="warning" size={16} />
      <strong>{t('bridge.banner')}</strong>
      <span>{detail}</span>
    </div>
  );
}
