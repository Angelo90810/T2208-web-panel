import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { FaderControl } from '../../components/FaderControl';
import { LevelMeter } from '../../components/LevelMeter';
import { faderToDb } from '../../domain/format';
import type { ChannelState } from '../../domain/types';

interface ChannelStripProps {
  strip: ChannelState;
  selected: boolean;
  onSelect: (stripId: string) => void;
}

export function ChannelStrip({ strip, selected, onSelect }: ChannelStripProps) {
  const { dispatch } = useMixer();
  const { t } = useI18n();
  const isMain = strip.kind === 'main';

  return (
    <article
      className={`strip${selected ? ' is-selected' : ''}${strip.mute ? ' is-muted' : ''}${isMain ? ' strip--main' : ''}`}
      onClick={() => onSelect(strip.id)}
    >
      <button
        type="button"
        className="strip-select"
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(strip.id);
        }}
      >
        <span className="strip-label">{strip.inputLabel}</span>
        <span className="strip-name">{strip.name}</span>
      </button>

      <div className="strip-body">
        <LevelMeter level={strip.meter} label={`${t('mixer.meter')} ${strip.name}`} />
        <FaderControl
          value={strip.fader}
          label={`${t('mixer.fader')} ${strip.name}`}
          onChange={(value) => {
            void dispatch({ type: 'strip.set', stripId: strip.id, control: 'fader', value });
          }}
        />
      </div>

      <div className="strip-readout">
        {faderToDb(strip.fader)}
      </div>

      <div className="strip-buttons">
        <button
          type="button"
          className={`mini-btn${strip.mute ? ' is-on is-mute' : ''}`}
          aria-pressed={strip.mute}
          aria-label={`${t('mixer.mute')} ${strip.name}`}
          onClick={(event) => {
            event.stopPropagation();
            void dispatch({ type: 'strip.set', stripId: strip.id, control: 'mute', value: !strip.mute });
          }}
        >
          M
        </button>
        <button
          type="button"
          className={`mini-btn${strip.solo ? ' is-on is-solo' : ''}`}
          aria-pressed={strip.solo}
          aria-label={`${t('mixer.solo')} ${strip.name}`}
          onClick={(event) => {
            event.stopPropagation();
            void dispatch({ type: 'strip.set', stripId: strip.id, control: 'solo', value: !strip.solo });
          }}
        >
          S
        </button>
      </div>
    </article>
  );
}
