import { useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SliderField } from '../../components/SliderField';
import { Toggle } from '../../components/Toggle';
import {
  COMP_ATTACK_MAX,
  COMP_ATTACK_MIN,
  COMP_RATIO_MAX,
  COMP_RATIO_MIN,
  COMP_RELEASE_MAX,
  COMP_RELEASE_MIN,
  COMP_THRESHOLD_MAX,
  COMP_THRESHOLD_MIN,
  DELAY_MAX_MS,
  FX_PARAMETERS,
  FX_TYPES,
  GATE_ATTACK_MAX,
  GATE_ATTACK_MIN,
  GATE_RELEASE_MAX,
  GATE_RELEASE_MIN,
  GATE_THRESHOLD_MAX,
  GATE_THRESHOLD_MIN,
} from '../../domain/constants';
import type { ChannelState } from '../../domain/types';

function useProcessingDispatch(strip: ChannelState, section: 'gate' | 'compressor' | 'fx' | 'delay') {
  const { dispatch } = useMixer();
  return (controlKey: string, value: number | boolean | string) => {
    void dispatch({ type: 'processing.set', stripId: strip.id, section, controlKey, value });
  };
}

export function GatePanel({ strip }: { strip: ChannelState }) {
  const { t } = useI18n();
  const set = useProcessingDispatch(strip, 'gate');

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>{t('processing.gate')}</h2>
        <div className="inline-toggle">
          <span>{t('common.enabled')}</span>
          <Toggle
            label={`${t('processing.gate')} ${t('common.enabled')}`}
            checked={strip.gate.enabled}
            onChange={(value) => set('enabled', value)}
          />
        </div>
      </header>
      <div className="slider-grid">
        <SliderField
          label={t('processing.threshold')}
          value={strip.gate.threshold}
          min={GATE_THRESHOLD_MIN}
          max={GATE_THRESHOLD_MAX}
          unit=" dB"
          onChange={(value) => set('threshold', value)}
        />
        <SliderField
          label={t('processing.attack')}
          value={strip.gate.attack}
          min={GATE_ATTACK_MIN}
          max={GATE_ATTACK_MAX}
          unit=" ms"
          onChange={(value) => set('attack', value)}
        />
        <SliderField
          label={t('processing.release')}
          value={strip.gate.release}
          min={GATE_RELEASE_MIN}
          max={GATE_RELEASE_MAX}
          step={10}
          unit=" ms"
          onChange={(value) => set('release', value)}
        />
      </div>
    </div>
  );
}

export function CompressorPanel({ strip }: { strip: ChannelState }) {
  const { t } = useI18n();
  const set = useProcessingDispatch(strip, 'compressor');

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>{t('processing.compressor')}</h2>
        <div className="inline-toggle">
          <span>{t('common.enabled')}</span>
          <Toggle
            label={`${t('processing.compressor')} ${t('common.enabled')}`}
            checked={strip.comp.enabled}
            onChange={(value) => set('enabled', value)}
          />
        </div>
      </header>
      <div className="slider-grid">
        <SliderField
          label={t('processing.threshold')}
          value={strip.comp.threshold}
          min={COMP_THRESHOLD_MIN}
          max={COMP_THRESHOLD_MAX}
          unit=" dB"
          onChange={(value) => set('threshold', value)}
        />
        <SliderField
          label={t('processing.attack')}
          value={strip.comp.attack}
          min={COMP_ATTACK_MIN}
          max={COMP_ATTACK_MAX}
          unit=" ms"
          onChange={(value) => set('attack', value)}
        />
        <SliderField
          label={t('processing.release')}
          value={strip.comp.release}
          min={COMP_RELEASE_MIN}
          max={COMP_RELEASE_MAX}
          step={10}
          unit=" ms"
          onChange={(value) => set('release', value)}
        />
        <SliderField
          label={t('processing.ratio')}
          value={strip.comp.ratio}
          min={COMP_RATIO_MIN}
          max={COMP_RATIO_MAX}
          step={0.5}
          unit=":1"
          onChange={(value) => set('ratio', value)}
        />
        <SliderField
          label={t('processing.makeup')}
          value={strip.comp.gain}
          min={0}
          max={24}
          step={0.5}
          unit=" dB"
          onChange={(value) => set('gain', value)}
        />
      </div>
    </div>
  );
}

export function FxPanel({ strip }: { strip: ChannelState }) {
  const { t } = useI18n();
  const set = useProcessingDispatch(strip, 'fx');
  const params = FX_PARAMETERS[strip.fx.type] ?? [];

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>{t('processing.fx')}</h2>
        <div className="inline-toggle">
          <span>{t('common.enabled')}</span>
          <Toggle
            label={`${t('processing.fx')} ${t('common.enabled')}`}
            checked={strip.fx.enabled}
            onChange={(value) => set('enabled', value)}
          />
        </div>
      </header>

      <label className="select-field">
        <span>{t('processing.fxType')}</span>
        <select value={strip.fx.type} onChange={(event) => set('type', event.target.value)}>
          {FX_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <div className="slider-grid">
        {params.map((param) => (
          <SliderField
            key={param}
            label={param}
            value={strip.fx.params[param] ?? 0}
            min={0}
            max={100}
            unit="%"
            onChange={(value) => set(`param.${param}`, value)}
          />
        ))}
      </div>
    </div>
  );
}

export function DelayPanel({ strip }: { strip: ChannelState }) {
  const { t } = useI18n();
  const set = useProcessingDispatch(strip, 'delay');

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>{t('processing.delay')}</h2>
        <div className="inline-toggle">
          <span>{t('common.enabled')}</span>
          <Toggle
            label={`${t('processing.delay')} ${t('common.enabled')}`}
            checked={strip.delayEnabled}
            onChange={(value) => set('enabled', value)}
          />
        </div>
      </header>
      <SliderField
        label={t('processing.delay')}
        value={strip.delayMs}
        min={0}
        max={DELAY_MAX_MS}
        unit=" ms"
        disabled={!strip.delayEnabled}
        onChange={(value) => set('ms', value)}
      />
    </div>
  );
}

export function PhantomPowerControl({ strip }: { strip: ChannelState }) {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const supported = strip.kind === 'mono' && strip.index <= snapshot.capabilities.phantomChannelCount;

  if (!supported) {
    return (
      <div className="panel">
        <header className="panel-head">
          <h2>{t('processing.phantom')}</h2>
        </header>
        <p className="hint">{t('common.notAvailable')}</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <header className="panel-head">
        <h2>{t('processing.phantom')}</h2>
        <Toggle
          label={`${t('processing.phantom')} ${strip.name}`}
          checked={strip.phantom}
          onChange={(value) => {
            if (value && !strip.phantom) {
              setOpen(true);
              return;
            }
            void dispatch({ type: 'strip.set', stripId: strip.id, control: 'phantom48v', value });
          }}
        />
      </header>
      <p className="hint warning-text">{t('processing.warning48')}</p>
      <ConfirmDialog
        open={open}
        title={t('processing.warning48Title', { channel: strip.name })}
        message={t('processing.warning48')}
        confirmLabel={t('processing.confirm48')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          void dispatch({ type: 'strip.set', stripId: strip.id, control: 'phantom48v', value: true });
        }}
      />
    </div>
  );
}
