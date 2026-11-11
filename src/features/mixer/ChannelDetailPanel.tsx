import { useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SliderField } from '../../components/SliderField';
import { Toggle } from '../../components/Toggle';
import { DELAY_MAX_MS } from '../../domain/constants';
import type { ChannelState } from '../../domain/types';

const KIND_LABELS: Record<ChannelState['kind'], string> = {
  mono: 'MONO',
  stereo: 'STEREO',
  usb: 'USB',
  aux: 'AUX',
  fx: 'FX',
  main: 'MAIN',
};

export function ChannelDetailPanel({ strip }: { strip: ChannelState }) {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const [phantomOpen, setPhantomOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState('');
  const isInput = strip.kind === 'mono' || strip.kind === 'stereo' || strip.kind === 'usb';
  const canMain = isInput || strip.kind === 'fx';
  const linkable = strip.kind === 'mono' || strip.kind === 'aux';
  const canPhantom = strip.kind === 'mono' && strip.index <= snapshot.capabilities.phantomChannelCount;

  return (
    <aside className="detail-panel" aria-label={t('mixer.selectedChannel')}>
      <header className="detail-head">
        <div>
          <span className="eyebrow">{t('mixer.selectedChannel')}</span>
          <h2>{strip.name}</h2>
        </div>
        <span className="tag">{KIND_LABELS[strip.kind]}</span>
      </header>

      <div className="detail-grid">
        <SliderField
          label={t('mixer.gain')}
          value={strip.gain}
          min={-60}
          max={10}
          step={0.5}
          unit=" dB"
          onChange={(value) => {
            void dispatch({ type: 'strip.set', stripId: strip.id, control: 'gain', value });
          }}
        />
        <SliderField
          label={t('mixer.pan')}
          value={strip.pan}
          min={-100}
          max={100}
          step={1}
          onChange={(value) => {
            void dispatch({ type: 'strip.set', stripId: strip.id, control: 'pan', value });
          }}
        />
      </div>

      <div className="toggle-grid">
        <div className="toggle-row">
          <span>{t('mixer.polarity')}</span>
          <Toggle
            label={`${t('mixer.polarity')} ${strip.name}`}
            checked={strip.polarity}
            onChange={(value) => {
              void dispatch({ type: 'strip.set', stripId: strip.id, control: 'polarity', value });
            }}
          />
        </div>

        {linkable && (
          <div className="toggle-row">
            <span>{t('mixer.link')}</span>
            <Toggle
              label={`${t('mixer.link')} ${strip.name}`}
              checked={strip.linked}
              onChange={(value) => {
                void dispatch({ type: 'strip.set', stripId: strip.id, control: 'link', value });
              }}
            />
          </div>
        )}

        {canMain && (
          <div className="toggle-row">
            <span>{t('mixer.mainAssign')}</span>
            <Toggle
              label={`${t('mixer.mainAssign')} ${strip.name}`}
              checked={strip.mainAssign}
              onChange={(value) => {
                void dispatch({ type: 'strip.set', stripId: strip.id, control: 'mainAssign', value });
              }}
            />
          </div>
        )}

        <div className="toggle-row">
          <span>{t('mixer.delay')}</span>
          <Toggle
            label={`${t('mixer.delay')} ${strip.name}`}
            checked={strip.delayEnabled}
            onChange={(value) => {
              void dispatch({ type: 'strip.set', stripId: strip.id, control: 'delayEnabled', value });
            }}
          />
        </div>

        {canPhantom && (
          <div className="toggle-row">
            <span className="phantom-label">
              {t('mixer.phantom')}
              <small>{t('processing.warning48')}</small>
            </span>
            <Toggle
              label={`${t('mixer.phantom')} ${strip.name}`}
              checked={strip.phantom}
              onChange={(value) => {
                if (value && !strip.phantom) {
                  setPhantomOpen(true);
                  return;
                }
                void dispatch({ type: 'strip.set', stripId: strip.id, control: 'phantom48v', value });
              }}
            />
          </div>
        )}
      </div>

      <SliderField
        label={t('mixer.delay')}
        value={strip.delayMs}
        min={0}
        max={DELAY_MAX_MS}
        step={1}
        unit=" ms"
        disabled={!strip.delayEnabled}
        onChange={(value) => {
          void dispatch({ type: 'strip.set', stripId: strip.id, control: 'delayMs', value });
        }}
      />

      <div className="detail-section">
        <h3>{t('mixer.dca')}</h3>
        <div className="dca-checks">
          {snapshot.dcaGroups.map((group) => (
            <label key={group.id} className="check-chip">
              <input
                type="checkbox"
                checked={strip.dcaGroups.includes(group.id)}
                onChange={(event) => {
                  void dispatch({
                    type: 'dca.assign',
                    stripId: strip.id,
                    dcaGroupId: group.id,
                    assigned: event.target.checked,
                  });
                }}
              />
              {group.name}
            </label>
          ))}
        </div>
      </div>

      <div className="detail-section">
        <h3>{t('mixer.copy')}</h3>
        <p className="hint">{t('mixer.copyHint')}</p>
        <div className="copy-row">
          <select
            aria-label={t('mixer.copyTo')}
            value={copyTarget}
            onChange={(event) => setCopyTarget(event.target.value)}
          >
            <option value="">{t('mixer.copyTo')}</option>
            {snapshot.strips
              .filter((item) => item.id !== strip.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.inputLabel} · {item.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!copyTarget}
            onClick={() => {
              if (!copyTarget) return;
              void dispatch({ type: 'strip.copy', fromId: strip.id, toId: copyTarget });
              setCopyTarget('');
            }}
          >
            {t('mixer.copyAction')}
          </button>
        </div>
      </div>

      <p className="hint">{t('mixer.notes')}</p>

      <ConfirmDialog
        open={phantomOpen}
        title={t('processing.warning48Title', { channel: strip.name })}
        message={t('processing.warning48')}
        confirmLabel={t('processing.confirm48')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setPhantomOpen(false)}
        onConfirm={() => {
          setPhantomOpen(false);
          void dispatch({ type: 'strip.set', stripId: strip.id, control: 'phantom48v', value: true });
        }}
      />
    </aside>
  );
}
