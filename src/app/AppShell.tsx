import { useState } from 'react';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { BridgeBanner } from '../components/BridgeBanner';
import { DemoBanner } from '../components/DemoBanner';
import { Icon } from '../components/Icon';
import { AutoMixView } from '../features/automix/AutoMixView';
import { ConnectionView } from '../features/connection/ConnectionView';
import { MeterRtaView } from '../features/meters/MeterRtaView';
import { MixerView } from '../features/mixer/MixerView';
import { PresetsView } from '../features/presets/PresetsView';
import { ProcessingView } from '../features/processing/ProcessingView';
import { RoutingView } from '../features/routing/RoutingView';
import { SystemView } from '../features/system/SystemView';
import { LANGUAGE_OPTIONS } from '../i18n/catalog';
import type { Language } from '../domain/types';
import { useMixer } from './MixerProvider';
import { VIEW_META, isViewId, type ViewId } from './navigation';
import { useI18n } from './useI18n';
import './AppShell.css';

function renderView(view: ViewId) {
  switch (view) {
    case 'mixer':
      return <MixerView />;
    case 'meters':
      return <MeterRtaView />;
    case 'processing':
      return <ProcessingView />;
    case 'routing':
      return <RoutingView />;
    case 'automix':
      return <AutoMixView />;
    case 'presets':
      return <PresetsView />;
    case 'system':
      return <SystemView />;
    case 'connection':
      return <ConnectionView />;
    default:
      return <MixerView />;
  }
}

export function AppShell() {
  const { snapshot, dispatch } = useMixer();
  const { t, language } = useI18n();
  const [view, setView] = useState<ViewId>(() =>
    isViewId(snapshot.system.defaultPage) ? snapshot.system.defaultPage : 'mixer',
  );
  const hasDevice =
    snapshot.mode === 'demo'
      ? snapshot.strips.length > 0
      : snapshot.connection === 'bridge-connected';
  const activeView: ViewId = hasDevice ? view : 'connection';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <div className="brand-text">
            <strong>{t('app.title')}</strong>
            <span>{t('app.subtitle')}</span>
          </div>
        </div>

        <div className="header-actions">
          <ConnectionStatus />
          <label className="lang-select">
            <span className="sr-only">{t('system.language')}</span>
            <select
              value={language}
              aria-label={t('system.language')}
              onChange={(event) => {
                void dispatch({
                  type: 'system.set',
                  setting: 'language',
                  value: event.target.value as Language,
                });
              }}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {snapshot.mode === 'demo' ? <DemoBanner /> : <BridgeBanner />}

      <div className="app-body">
        <nav className="app-nav" aria-label={t('app.subtitle')}>
          {VIEW_META.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${activeView === item.id ? ' is-active' : ''}`}
              aria-current={activeView === item.id ? 'page' : undefined}
              title={t(item.labelKey)}
              disabled={!hasDevice && item.id !== 'connection'}
              onClick={() => setView(item.id)}
            >
              <Icon name={item.icon} size={19} />
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        <main className="app-main" id="main">
          {renderView(activeView)}
        </main>
      </div>

      <footer className="app-footer">
        {snapshot.mode === 'demo' ? (
          <>
            <span className="footer-badge">{t('demo.short')}</span>
            <span>{t('demo.detail')}</span>
          </>
        ) : (
          <>
            <span className="footer-badge">PONTE</span>
            <span>
              {snapshot.bridge?.deviceHost
                ? `${t('bridge.deviceHost')}: ${snapshot.bridge.deviceHost}`
                : snapshot.connection === 'bridge-unavailable'
                  ? t('bridge.offline')
                  : t('bridge.waiting')}
            </span>
          </>
        )}
      </footer>
    </div>
  );
}
