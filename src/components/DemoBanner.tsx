import { useI18n } from '../app/useI18n';
import { Icon } from './Icon';

export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="demo-banner" role="status">
      <Icon name="warning" size={16} />
      <strong>{t('demo.banner')}</strong>
      <span>{t('demo.detail')}</span>
    </div>
  );
}
