import { useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LevelMeter } from '../../components/LevelMeter';
import { Toggle } from '../../components/Toggle';
import './automix.css';

export function AutoMixView() {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const [clearOpen, setClearOpen] = useState(false);

  const sources = snapshot.strips.filter(
    (strip) => strip.kind === 'mono' || strip.kind === 'stereo',
  );

  return (
    <section className="view automix-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{snapshot.mode === 'bridge' ? t('bridge.eyebrow') : t('common.simulated')}</span>
          <h1>{t('automix.title')}</h1>
          <p>{t('automix.subtitle')}</p>
        </div>
        <div className="automix-head-actions">
          <div className="inline-toggle">
            <span>{t('automix.active')}</span>
            <Toggle
              label={t('automix.active')}
              checked={snapshot.autoMix.active}
              onChange={(value) => {
                void dispatch({ type: 'automix.setActive', active: value });
              }}
            />
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setClearOpen(true)}>
            {t('automix.clear')}
          </button>
        </div>
      </header>

      <div className={`automix-status${snapshot.autoMix.active ? ' is-active' : ''}`}>
        <span className="activity-dot" aria-hidden="true" />
        <strong>{snapshot.autoMix.active ? t('common.active') : t('common.inactive')}</strong>
        <span>{t('automix.note')}</span>
      </div>

      <div className="automix-grid">
        {sources.map((strip) => {
          const participating = Boolean(snapshot.autoMix.channels[strip.id]);
          return (
            <article className={`automix-card${participating ? ' is-participating' : ''}`} key={strip.id}>
              <header>
                <span className="mono-tag">{strip.inputLabel}</span>
                <strong>{strip.name}</strong>
              </header>
              <LevelMeter level={strip.meter} label={`${t('mixer.meter')} ${strip.name}`} />
              <div className="automix-card-foot">
                <span>{t('automix.participation')}</span>
                <Toggle
                  label={`${t('automix.participation')} ${strip.name}`}
                  checked={participating}
                  onChange={(value) => {
                    void dispatch({
                      type: 'automix.setParticipation',
                      stripId: strip.id,
                      enabled: value,
                    });
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        open={clearOpen}
        title={t('automix.clearTitle')}
        message={t('automix.clearMessage')}
        confirmLabel={t('automix.clear')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setClearOpen(false)}
        onConfirm={() => {
          setClearOpen(false);
          void dispatch({ type: 'automix.clear' });
        }}
      />
    </section>
  );
}
