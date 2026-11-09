import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { SliderField } from '../../components/SliderField';
import { Toggle } from '../../components/Toggle';
import type { ChannelState } from '../../domain/types';

export function PeqPanel({ strip }: { strip: ChannelState }) {
  const { dispatch } = useMixer();
  const { t } = useI18n();

  const setBand = (bandId: string, field: string, value: number | boolean) => {
    void dispatch({
      type: 'processing.set',
      stripId: strip.id,
      section: 'peq',
      controlKey: `${bandId}.${field}`,
      value,
    });
  };

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>{t('processing.peq')}</h2>
        <div className="inline-toggle">
          <span>{t('processing.eqEnabled')}</span>
          <Toggle
            label={t('processing.eqEnabled')}
            checked={strip.eqEnabled}
            onChange={(value) => {
              void dispatch({
                type: 'processing.set',
                stripId: strip.id,
                section: 'peq',
                controlKey: 'eqEnabled',
                value,
              });
            }}
          />
        </div>
      </header>

      <div className="peq-bands">
        {strip.eq.map((band) => {
          const bandNumber = band.id.startsWith('band') ? band.id.slice(4) : null;
          return (
            <section className={`peq-band peq-band--${band.type}`} key={band.id}>
              <header className="peq-band-head">
                <strong>
                  {bandNumber
                    ? t('processing.band', { index: bandNumber })
                    : band.type === 'hpf'
                      ? t('processing.hpf')
                      : t('processing.lpf')}
                </strong>
                <Toggle
                  label={`${band.id} ${t('common.enabled')}`}
                  checked={band.enabled}
                  onChange={(value) => setBand(band.id, 'enabled', value)}
                />
              </header>
              <SliderField
                label={t('processing.freq')}
                value={band.freq}
                min={20}
                max={20000}
                step={10}
                unit=" Hz"
                onChange={(value) => setBand(band.id, 'freq', value)}
              />
              {band.type === 'peq' && (
                <SliderField
                  label={t('processing.gain')}
                  value={band.gain}
                  min={-15}
                  max={15}
                  step={0.5}
                  unit=" dB"
                  onChange={(value) => setBand(band.id, 'gain', value)}
                />
              )}
              <SliderField
                label={t('processing.q')}
                value={band.q}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(value) => setBand(band.id, 'q', value)}
              />
            </section>
          );
        })}
      </div>

      <div className="panel-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            for (const band of strip.eq) {
              if (band.type === 'peq') setBand(band.id, 'gain', 0);
            }
          }}
        >
          {t('processing.flat')}
        </button>
      </div>
    </div>
  );
}
