import { useEffect, useRef, useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { Icon } from '../../components/Icon';
import { BRIDGE_URL_STORAGE_KEY, DEFAULT_BRIDGE_URL } from '../../domain/constants';
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

interface BridgeDevice {
  host: string;
  source: string;
  raw?: string;
}

function isValidIpv4(value: string): boolean {
  const parts = value.trim().split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
}

function bridgeHttpBase(url: string): string {
  return url.replace(/^ws/, 'http').replace(/\/ws\/?$/, '');
}

export function ConnectionView() {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState(false);
  const [ipDraft, setIpDraft] = useState(snapshot.system.ip);
  const [ipError, setIpError] = useState(false);
  const [bridgeUrl, setBridgeUrl] = useState(snapshot.bridge?.url || DEFAULT_BRIDGE_URL);
  const [bridgeError, setBridgeError] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const [devices, setDevices] = useState<BridgeDevice[]>([]);
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

  const useBridgeMode = () => {
    const url = bridgeUrl.trim();
    if (!/^wss?:\/\//.test(url)) {
      setBridgeError(t('bridge.invalidUrl'));
      return;
    }
    window.localStorage.setItem(BRIDGE_URL_STORAGE_KEY, url);
    const next = new URL(window.location.href);
    next.searchParams.set('bridge', url);
    window.location.assign(next.toString());
  };

  const useDemoMode = () => {
    window.localStorage.removeItem(BRIDGE_URL_STORAGE_KEY);
    const next = new URL(window.location.href);
    next.searchParams.delete('bridge');
    window.location.assign(next.toString());
  };

  const discoverBridge = async () => {
    if (discovering) return;
    setDiscovering(true);
    setDiscoveryError('');
    try {
      const response = await fetch(`${bridgeHttpBase(bridgeUrl)}/discover`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const body = (await response.json()) as { devices?: BridgeDevice[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? `HTTP ${response.status}`);
      setDevices(body.devices ?? []);
    } catch (error) {
      setDiscoveryError(error instanceof Error ? error.message : 'Falha na descoberta.');
    } finally {
      setDiscovering(false);
    }
  };

  const connectBridge = async (host: string) => {
    setBridgeError('');
    const result = await dispatch({ type: 'bridge.connect', host, port: 5000 });
    if (!result.ok) setBridgeError(result.message ?? 'Falha ao conectar.');
  };

  const reconnectBridge = async () => {
    const bridge = snapshot.bridge;
    if (!bridge?.deviceHost) {
      await discoverBridge();
      return;
    }
    await connectBridge(bridge.deviceHost);
  };

  const disconnectBridge = () => {
    void dispatch({ type: 'bridge.disconnect' });
  };

  const connected = snapshot.connection === 'demo-connected';
  const bridge = snapshot.bridge;
  const isBridge = snapshot.mode === 'bridge';

  return (
    <section className="view connection-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{isBridge ? t('bridge.eyebrow') : t('common.simulated')}</span>
          <h1>{isBridge ? t('bridge.title') : t('connection.title')}</h1>
          <p>{isBridge ? t('bridge.subtitle') : t('connection.subtitle')}</p>
        </div>
        <span className="tag tag--warn">
          {isBridge ? t('bridge.realScan') : t('connection.noRealScan')}
        </span>
      </header>

      <div className="connection-layout">
        {isBridge ? (
          <article className="panel">
            <header className="panel-head">
              <h2>{t('bridge.title')}</h2>
              <span className="tag tag--accent">{t('bridge.active')}</span>
            </header>
            <p className="hint">{t('bridge.hint')}</p>

            {bridge ? (
              <dl className="info-grid">
                <div>
                  <dt>{t('bridge.deviceHost')}</dt>
                  <dd>{bridge.deviceHost ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('bridge.version')}</dt>
                  <dd>{bridge.version ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('bridge.deviceName')}</dt>
                  <dd>{bridge.deviceName ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('bridge.dryRunLabel')}</dt>
                  <dd>{bridge.dryRun ? t('common.on') : t('common.off')}</dd>
                </div>
              </dl>
            ) : (
              <p className="hint">{t('bridge.notConfigured')}</p>
            )}

            {bridge?.lastError && <p className="hint warning-text">{bridge.lastError}</p>}
            {bridgeError && <small className="field-error">{bridgeError}</small>}

            <div className="panel-actions">
              <button type="button" className="btn btn-primary" onClick={() => void reconnectBridge()}>
                {t('bridge.reconnect')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={disconnectBridge}>
                {t('bridge.disconnect')}
              </button>
            </div>

            <div className="scenario-block">
              <h3>{t('bridge.discovery')}</h3>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void discoverBridge()}
                disabled={discovering}
              >
                <Icon name="scan" size={16} />
                {discovering ? t('bridge.discovering') : t('bridge.discover')}
              </button>
              {discoveryError && <p className="hint warning-text">{discoveryError}</p>}
              <div className="device-list">
                {!discovering && devices.length === 0 && (
                  <p className="hint">{t('bridge.noDevices')}</p>
                )}
                {devices.map((device) => (
                  <article className="device-card" key={`${device.source}-${device.host}`}>
                    <div className="device-icon">
                      <Icon name="mixer" size={24} />
                    </div>
                    <div className="device-info">
                      <strong>{device.host}</strong>
                      <span>{device.source}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      onClick={() => void connectBridge(device.host)}
                    >
                      {t('bridge.connectDevice')}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </article>
        ) : (
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
                        void dispatch({
                          type: 'demo.setConnectionScenario',
                          state: 'demo-disconnected',
                        });
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
                    className={`chip${snapshot.connection === scenario.state ? ' is-active' : ''}`}
                    aria-pressed={snapshot.connection === scenario.state}
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
        )}

        <div className="connection-side">
          {!isBridge && (
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
            </article>
          )}

          <article className="panel">
            <header className="panel-head">
              <h2>{t('bridge.config')}</h2>
              <span className="tag">{isBridge ? t('bridge.active') : t('bridge.inactive')}</span>
            </header>
            <p className="hint">{t('bridge.hint')}</p>
            <label className="text-field">
              <span>{t('bridge.wsUrl')}</span>
              <input
                value={bridgeUrl}
                onChange={(event) => {
                  setBridgeUrl(event.target.value);
                  setBridgeError('');
                }}
              />
            </label>
            {bridgeError && <small className="field-error">{bridgeError}</small>}
            <div className="panel-actions">
              <button type="button" className="btn btn-primary" onClick={useBridgeMode}>
                {t('bridge.use')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={useDemoMode}>
                {t('bridge.useDemo')}
              </button>
            </div>
            <div className="protocol-note">
              <Icon name="link" size={18} />
              <p>{t('connection.protocolNote')}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
