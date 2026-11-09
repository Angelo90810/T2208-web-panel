import { useMemo, useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { SliderField } from '../../components/SliderField';
import { Toggle } from '../../components/Toggle';
import './routing.css';

type Tab = 'sends' | 'dca' | 'digital' | 'matrix';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'sends', labelKey: 'routing.sends' },
  { id: 'dca', labelKey: 'routing.dcaAssign' },
  { id: 'digital', labelKey: 'routing.digitalIo' },
  { id: 'matrix', labelKey: 'routing.matrix' },
];

const INPUT_KINDS = new Set(['mono', 'stereo', 'usb']);

export function RoutingView() {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('sends');

  const inputStrips = useMemo(
    () => snapshot.strips.filter((strip) => INPUT_KINDS.has(strip.kind)),
    [snapshot.strips],
  );
  const [sendStripId, setSendStripId] = useState(inputStrips[0]?.id ?? '');
  const sendStrip = inputStrips.find((strip) => strip.id === sendStripId) ?? inputStrips[0];
  const auxBuses = snapshot.buses.filter((bus) => bus.kind === 'aux');
  const fxBuses = snapshot.buses.filter((bus) => bus.kind === 'fx');

  return (
    <section className="view routing-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{t('common.simulated')}</span>
          <h1>{t('routing.title')}</h1>
          <p>{t('routing.subtitle')}</p>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label={t('routing.title')}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'sends' && sendStrip && (
        <div className="panel">
          <header className="panel-head">
            <h2>{t('routing.sends')}</h2>
            <label className="select-field select-field--inline">
              <span>{t('common.channel')}</span>
              <select value={sendStrip.id} onChange={(event) => setSendStripId(event.target.value)}>
                {inputStrips.map((strip) => (
                  <option key={strip.id} value={strip.id}>
                    {strip.inputLabel} — {strip.name}
                  </option>
                ))}
              </select>
            </label>
          </header>

          <div className="send-list">
            {[...auxBuses, ...fxBuses].map((bus) => {
              const level = sendStrip.sends[bus.id] ?? 0;
              const position = sendStrip.prePost[bus.id] ?? 'post';
              return (
                <div className="send-row" key={bus.id}>
                  <span className="send-name">{bus.name}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={level}
                    aria-label={`${bus.name} ${sendStrip.name}`}
                    onChange={(event) => {
                      void dispatch({
                        type: 'routing.setSend',
                        stripId: sendStrip.id,
                        busId: bus.id,
                        level: Number(event.target.value),
                      });
                    }}
                  />
                  <output>{level}</output>
                  <div className="segmented" role="group" aria-label={`${bus.name} ${t('routing.prePost')}`}>
                    <button
                      type="button"
                      aria-pressed={position === 'pre'}
                      onClick={() => {
                        void dispatch({
                          type: 'routing.setPrePost',
                          stripId: sendStrip.id,
                          busId: bus.id,
                          position: 'pre',
                        });
                      }}
                    >
                      {t('common.pre')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={position === 'post'}
                      onClick={() => {
                        void dispatch({
                          type: 'routing.setPrePost',
                          stripId: sendStrip.id,
                          busId: bus.id,
                          position: 'post',
                        });
                      }}
                    >
                      {t('common.post')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="toggle-row panel-toggle">
            <span>{t('routing.mainAssign')}</span>
            <Toggle
              label={`${t('routing.mainAssign')} ${sendStrip.name}`}
              checked={sendStrip.mainAssign}
              onChange={(value) => {
                void dispatch({ type: 'strip.set', stripId: sendStrip.id, control: 'mainAssign', value });
              }}
            />
          </div>
        </div>
      )}

      {tab === 'dca' && (
        <div className="dca-layout">
          <div className="dca-cards">
            {snapshot.dcaGroups.map((group) => {
              const members = snapshot.strips.filter((strip) => strip.dcaGroups.includes(group.id)).length;
              return (
                <article className="panel dca-card" key={group.id}>
                  <header className="panel-head">
                    <h2>{group.name}</h2>
                    <span className="tag">{t('dca.members', { count: members })}</span>
                  </header>
                  <SliderField
                    label={t('dca.gain')}
                    value={group.gain}
                    min={-60}
                    max={10}
                    step={0.5}
                    unit=" dB"
                    onChange={(value) => {
                      void dispatch({ type: 'dca.set', dcaGroupId: group.id, control: 'gain', value });
                    }}
                  />
                  <div className="dca-actions">
                    <button
                      type="button"
                      className={`mini-btn${group.mute ? ' is-on is-mute' : ''}`}
                      aria-pressed={group.mute}
                      aria-label={`${t('dca.mute')} ${group.name}`}
                      onClick={() => {
                        void dispatch({ type: 'dca.set', dcaGroupId: group.id, control: 'mute', value: !group.mute });
                      }}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`mini-btn${group.solo ? ' is-on is-solo' : ''}`}
                      aria-pressed={group.solo}
                      aria-label={`${t('dca.solo')} ${group.name}`}
                      onClick={() => {
                        void dispatch({ type: 'dca.set', dcaGroupId: group.id, control: 'solo', value: !group.solo });
                      }}
                    >
                      S
                    </button>
                    <Toggle
                      label={`${t('dca.link')} ${group.name}`}
                      checked={group.linked}
                      onChange={(value) => {
                        void dispatch({ type: 'dca.link', dcaGroupIds: [group.id], linked: value });
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <article className="panel">
            <header className="panel-head">
              <h2>{t('routing.assignment')}</h2>
              <span className="tag">{t('routing.dcaHint')}</span>
            </header>
            <div className="table-scroll">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>{t('common.channel')}</th>
                    {snapshot.dcaGroups.map((group) => (
                      <th key={group.id}>{group.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.strips
                    .filter((strip) => strip.kind !== 'main')
                    .map((strip) => (
                      <tr key={strip.id}>
                        <th>
                          <span className="mono-tag">{strip.inputLabel}</span>
                          <small>{strip.name}</small>
                        </th>
                        {snapshot.dcaGroups.map((group) => (
                          <td key={group.id}>
                            <input
                              type="checkbox"
                              aria-label={`${strip.name} → ${group.name}`}
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
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      )}

      {tab === 'digital' && (
        <div className="panel">
          <header className="panel-head">
            <h2>{t('routing.digitalIo')}</h2>
            <span className="tag tag--warn">{t('common.unverified')}</span>
          </header>
          <p className="hint">
            {snapshot.capabilities.digitalCard === 'present'
              ? t('routing.digitalCardPresent')
              : snapshot.capabilities.digitalCard === 'absent'
                ? t('routing.digitalCardAbsent')
                : t('routing.digitalCardUnknown')}
          </p>
          <div className="digital-grid">
            {Array.from({ length: 16 }, (_, index) => (
              <div className="digital-box" key={`in-${index}`}>
                <span>IN {index + 1}</span>
                <span className="digital-state">{t('common.unverified')}</span>
              </div>
            ))}
            {Array.from({ length: 8 }, (_, index) => (
              <div className="digital-box" key={`out-${index}`}>
                <span>OUT {index + 1}</span>
                <span className="digital-state">{t('common.unverified')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'matrix' && (
        <div className="panel">
          <header className="panel-head">
            <h2>{t('routing.outputMatrix')}</h2>
            <span className="tag">{t('common.simulated')}</span>
          </header>
          <div className="table-scroll">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>{t('routing.source')}</th>
                  {Array.from({ length: 8 }, (_, index) => (
                    <th key={index}>OUT {index + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.buses.map((bus) => (
                  <tr key={bus.id}>
                    <th>{bus.name}</th>
                    {Array.from({ length: 8 }, (_, index) => {
                      const key = `${bus.id}->out-${index + 1}`;
                      return (
                        <td key={key}>
                          <input
                            type="checkbox"
                            aria-label={`${bus.name} → OUT ${index + 1}`}
                            checked={Boolean(snapshot.outputMatrix[key])}
                            onChange={(event) => {
                              void dispatch({
                                type: 'routing.setOutput',
                                sourceId: bus.id,
                                destinationId: `out-${index + 1}`,
                                enabled: event.target.checked,
                              });
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
