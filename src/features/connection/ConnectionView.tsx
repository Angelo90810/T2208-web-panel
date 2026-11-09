import { useEffect, useRef, useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { Icon } from '../../components/Icon';
import type { DemoConnectionState } from '../../domain/types';
import './connection.css';

const SCENARIOS: { state: DemoConnectionState; labelKey: string }[] = [
  { state: 'demo-idle', labelKey: 'connection.scenarioIdle' },
  { state: 'demo-discovering', labelKey: 'connection.scenarioDiscovering' },
  { state: 'demo-connecting', labelKey: 'connection.scenarioConnecting' },
  { state: 'demo-connected', labelKey: 'connection.scenarioConnected' },
  { state: 'demo-disconnected', labelKey: 'connection.scenarioDisconnected' },
  { state: 'demo-firmware-model-mismatch', labelKey: 'connection.scenarioMismatch' },
  { state: 'demo-bridge-unavailable', labelKey: 'connection.scenarioBridge' },
];

function isValidIpv4(value: string): boolean {
  const parts = value.trim().split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
}

export function ConnectionView() {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(false);
  const [ipDraft, setIpDraft] = useState(snapshot.system.ip);
  const [ipError, setIpError] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    },
    [],
  );

  const later = (fn: () => void, delay: number) => {
    const timer = window.setTimeout(fn, delay);
    timers.current.push(timer);
  };

  const scan = () => {
    if (scanning) return;
    setScanning(true);
    setFound(false);
    void dispatch({ type: 'demo.setConnectionScenario', state: 'demo-discovering' });
    later(() => {
      setScanning(false);
      setFound(true);
      void dispatch({ type: 'demo.setConnectionScenario', state: 'demo-idle' });
    }, 1200);
  };

  const connect = () => {
    void dispatch({ type: 'demo.setConnectionScenario', state: 'demo-connecting' });
    later(() => {
      void dispatch({ type: 'demo.setConnectionScenario', state: 'demo-connected' });
    }, 800);
  };

  const connected = snapshot.demoConnection === 'demo-connected';

  return (
    <section className="view connection-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{t('common.simulated')}</span>
          <h1>{t('connection.title')}</h1>
          <p>{t('connection.subtitle')}</p>
        </div>
        <span className="tag tag--warn">{t('connection.noRealScan')}</span>
      </header>

      <div className="connection-layout">
        <article className="panel">
          <header className="panel-head">
            <h2>{t('connection.devices')}</h2>
            <button type="button" className="btn btn-primary" onClick={scan} disabled={scanning}>
              <Icon name="scan" size={16} />
              {scanning ? t('connection.scanning') : t('connection.scan')}
            </button>
          </header>

          <div className="device-list">
            {!found && !connected && <p className="hint">{t('connection.noRealScan')}</p>}
            {(found || connected) && (
              <article className={`device-card${connected ? ' is-connected' : ''}`}>
                <div className="device-icon">
                  <Icon name="mixer" size={24} />
                </div>
                <div className="device-info">
                  <strong>{t('connection.found')}</strong>
                  <span>{t('connection.demoDevice')}</span>
                </div>
                {connected ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      void dispatch({ type: 'demo.setConnectionScenario', state: 'demo-disconnected' });
                    }}
                  >
                    {t('connection.disconnect')}
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={connect}>
                    {t('connection.connect')}
                  </button>
                )}
              </article>
            )}
          </div>

          <div className="scenario-block">
            <h3>{t('connection.scenario')}</h3>
            <div className="scenario-buttons">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario.state}
                  type="button"
                  className={`chip${snapshot.demoConnection === scenario.state ? ' is-active' : ''}`}
                  aria-pressed={snapshot.demoConnection === scenario.state}
                  onClick={() => {
                    void dispatch({ type: 'demo.setConnectionScenario', state: scenario.state });
                  }}
                >
                  {t(scenario.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </article>

        <article className="panel">
          <header className="panel-head">
            <h2>{t('connection.ipConfig')}</h2>
          </header>
          <label className="text-field">
            <span>{t('connection.manualIp')}</span>
            <input
              value={ipDraft}
              inputMode="decimal"
              aria-invalid={ipError}
              onChange={(event) => {
                setIpDraft(event.target.value);
                setIpError(false);
              }}
            />
          </label>
          {ipError && <small className="field-error">{t('connection.ipInvalid')}</small>}
          <div className="panel-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!isValidIpv4(ipDraft)) {
                  setIpError(true);
                  return;
                }
                void dispatch({ type: 'system.set', setting: 'ip', value: ipDraft.trim() });
              }}
            >
              {t('connection.applyIp')}
            </button>
          </div>

          <div className="protocol-note">
            <Icon name="link" size={18} />
            <p>{t('connection.protocolNote')}</p>
          </div>
        </article>
      </div>
    </section>
  );
}
