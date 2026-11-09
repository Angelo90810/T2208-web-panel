import { useEffect, useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { LevelMeter } from '../../components/LevelMeter';
import './meters.css';

const RTA_LABELS = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k'];

export function MeterRtaView() {
  const { snapshot } = useMixer();
  const { t } = useI18n();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 140);
    return () => window.clearInterval(timer);
  }, []);

  const selected =
    snapshot.strips.find((strip) => strip.id === snapshot.selectedStripId) ?? snapshot.strips[0];

  const rta = Array.from({ length: 31 }, (_, index) => {
    const wave = Math.sin(index / 3.2 + tick / 5.5) * 0.5 + 0.5;
    const slope = 1 - index / 42;
    return Math.max(0.04, Math.min(0.96, 0.08 + wave * slope * 0.72));
  });

  return (
    <section className="view meters-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{t('meters.liveSimulation')}</span>
          <h1>{t('meters.title')}</h1>
          <p>{t('meters.subtitle')}</p>
        </div>
        <span className="tag">{selected.name}</span>
      </header>

      <div className="meters-layout">
        <article className="panel rta-panel">
          <header className="panel-head">
            <h2>{t('meters.rta')}</h2>
            <span className="tag tag--accent">{t('meters.spectrum')}</span>
          </header>
          <div className="rta" role="img" aria-label={t('meters.spectrum')}>
            {rta.map((level, index) => (
              <div className="rta-bar-wrap" key={index}>
                <div className="rta-bar" style={{ height: `${(level * 100).toFixed(1)}%` }} />
              </div>
            ))}
          </div>
          <div className="rta-axis" aria-hidden="true">
            {RTA_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </article>

        <article className="panel activity-panel">
          <header className="panel-head">
            <h2>{t('meters.activity')}</h2>
          </header>
          <div className="activity-grid">
            <div className={`activity-card${selected.gate.enabled ? ' is-on' : ''}`}>
              <span className="activity-dot" aria-hidden="true" />
              <div>
                <strong>{t('meters.gateOpen')}</strong>
                <span>{selected.gate.enabled ? t('common.enabled') : t('common.disabled')}</span>
              </div>
            </div>
            <div className={`activity-card${selected.comp.enabled ? ' is-on' : ''}`}>
              <span className="activity-dot" aria-hidden="true" />
              <div>
                <strong>{t('meters.compActive')}</strong>
                <span>{selected.comp.enabled ? t('common.enabled') : t('common.disabled')}</span>
              </div>
            </div>
          </div>
          <dl className="mini-stats">
            <div>
              <dt>{t('mixer.fader')}</dt>
              <dd>{selected.fader}</dd>
            </div>
            <div>
              <dt>{t('mixer.gain')}</dt>
              <dd>
                {selected.gain > 0 ? '+' : ''}
                {selected.gain.toFixed(1)} dB
              </dd>
            </div>
            <div>
              <dt>{t('processing.threshold')}</dt>
              <dd>{selected.comp.threshold} dB</dd>
            </div>
            <div>
              <dt>{t('processing.ratio')}</dt>
              <dd>{selected.comp.ratio}:1</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="panel">
        <header className="panel-head">
          <h2>{t('meters.channelMeters')}</h2>
        </header>
        <div className="meter-grid">
          {snapshot.strips.map((strip) => (
            <div className="meter-card" key={strip.id}>
              <span className="meter-card-label">{strip.inputLabel}</span>
              <LevelMeter level={strip.meter} label={`${t('mixer.meter')} ${strip.name}`} />
              <span className="meter-card-name">{strip.name}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
