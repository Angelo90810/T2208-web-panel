import { useEffect, useMemo, useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useBankSize } from '../../app/useBankSize';
import { useI18n } from '../../app/useI18n';
import { Icon } from '../../components/Icon';
import { faderToDb } from '../../domain/format';
import { ChannelDetailPanel } from './ChannelDetailPanel';
import { ChannelStrip } from './ChannelStrip';
import './mixer.css';

export function MixerView() {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const bankSize = useBankSize();
  const [bank, setBank] = useState(0);

  const bankStrips = useMemo(
    () => snapshot.strips.filter((strip) => strip.kind !== 'main'),
    [snapshot.strips],
  );
  const mainStrip = snapshot.strips.find((strip) => strip.kind === 'main');
  const totalBanks = Math.max(1, Math.ceil(bankStrips.length / bankSize));

  useEffect(() => {
    setBank((current) => Math.min(current, totalBanks - 1));
  }, [totalBanks]);

  const visible = bankStrips.slice(bank * bankSize, bank * bankSize + bankSize);
  const selected =
    snapshot.strips.find((strip) => strip.id === snapshot.selectedStripId) ?? snapshot.strips[0];

  const select = (stripId: string) => {
    void dispatch({ type: 'strip.select', stripId });
  };

  return (
    <section className="view mixer-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{t('common.simulated')}</span>
          <h1>{t('mixer.title')}</h1>
          <p>{t('mixer.subtitle')}</p>
        </div>
        <span className="tag tag--accent">{bankStrips.length + (mainStrip ? 1 : 0)} strips</span>
      </header>

      <div className="mixer-toolbar">
        <div className="bank-nav">
          <button
            type="button"
            className="btn btn-icon"
            aria-label={t('common.previous')}
            disabled={bank === 0}
            onClick={() => setBank((current) => Math.max(0, current - 1))}
          >
            <Icon name="chevronLeft" />
          </button>
          <span className="bank-label" aria-live="polite">
            {t('mixer.bankLabel', { current: bank + 1, total: totalBanks })}
          </span>
          <button
            type="button"
            className="btn btn-icon"
            aria-label={t('common.next')}
            disabled={bank >= totalBanks - 1}
            onClick={() => setBank((current) => Math.min(totalBanks - 1, current + 1))}
          >
            <Icon name="chevronRight" />
          </button>
        </div>
        <label className="channel-jump">
          <span className="sr-only">{t('mixer.jump')}</span>
          <select
            value={selected.id}
            aria-label={t('mixer.jump')}
            onChange={(event) => {
              const stripId = event.target.value;
              select(stripId);
              const index = bankStrips.findIndex((strip) => strip.id === stripId);
              if (index >= 0) setBank(Math.floor(index / bankSize));
            }}
          >
            {snapshot.strips.map((strip) => (
              <option key={strip.id} value={strip.id}>
                {strip.inputLabel} — {strip.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mixer-layout">
        <div className="mixer-bank">
          <div className="bank-strips">
            {visible.map((strip) => (
              <ChannelStrip
                key={strip.id}
                strip={strip}
                selected={strip.id === selected.id}
                onSelect={select}
              />
            ))}
          </div>
          {mainStrip && (
            <div className="master-row">
              <div className="master-info">
                <span className="eyebrow">{t('mixer.main')}</span>
                <strong>{mainStrip.name}</strong>
                <span className="mono-tag">{mainStrip.inputLabel}</span>
              </div>
              <input
                className="master-fader"
                type="range"
                min={0}
                max={100}
                value={mainStrip.fader}
                aria-label={`${t('mixer.fader')} ${mainStrip.name}`}
                onChange={(event) => {
                  void dispatch({
                    type: 'strip.set',
                    stripId: mainStrip.id,
                    control: 'fader',
                    value: Number(event.target.value),
                  });
                }}
              />
              <span className="master-db">{faderToDb(mainStrip.fader)}</span>
              <div className="master-buttons">
                <button
                  type="button"
                  className={`mini-btn${mainStrip.mute ? ' is-on is-mute' : ''}`}
                  aria-pressed={mainStrip.mute}
                  aria-label={`${t('mixer.mute')} ${mainStrip.name}`}
                  onClick={() => {
                    void dispatch({
                      type: 'strip.set',
                      stripId: mainStrip.id,
                      control: 'mute',
                      value: !mainStrip.mute,
                    });
                  }}
                >
                  M
                </button>
                <button
                  type="button"
                  className={`mini-btn${mainStrip.solo ? ' is-on is-solo' : ''}`}
                  aria-pressed={mainStrip.solo}
                  aria-label={`${t('mixer.solo')} ${mainStrip.name}`}
                  onClick={() => {
                    void dispatch({
                      type: 'strip.set',
                      stripId: mainStrip.id,
                      control: 'solo',
                      value: !mainStrip.solo,
                    });
                  }}
                >
                  S
                </button>
              </div>
            </div>
          )}
        </div>

        <ChannelDetailPanel strip={selected} />
      </div>
    </section>
  );
}
