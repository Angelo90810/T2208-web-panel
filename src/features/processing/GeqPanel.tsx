import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { GEQ_MAX, GEQ_MIN } from '../../domain/constants';
import type { ChannelState } from '../../domain/types';

const LABELS: Record<number, string> = {
  0: '20',
  5: '100',
  10: '315',
  15: '1k',
  20: '3.1k',
  25: '10k',
  30: '20k',
};

export function GeqPanel({ strip }: { strip: ChannelState }) {
  const { dispatch } = useMixer();
  const { t } = useI18n();

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>{t('processing.geq')}</h2>
        <span className="tag">{t('processing.geqBands')}</span>
      </header>

      <div className="geq" role="group" aria-label={t('processing.geq')}>
        {strip.geq.map((gain, index) => (
          <div className="geq-band" key={index}>
            <span className="geq-value">{gain > 0 ? `+${gain}` : gain}</span>
            <input
              className="geq-slider"
              type="range"
              min={GEQ_MIN}
              max={GEQ_MAX}
              step={1}
              value={gain}
              aria-label={`${t('processing.band', { index: index + 1 })}`}
              onChange={(event) => {
                void dispatch({
                  type: 'processing.set',
                  stripId: strip.id,
                  section: 'geq',
                  controlKey: String(index),
                  value: Number(event.target.value),
                });
              }}
            />
            <span className="geq-label">{LABELS[index] ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
