import { useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { GeqPanel } from './GeqPanel';
import { PeqPanel } from './PeqPanel';
import {
  CompressorPanel,
  DelayPanel,
  FxPanel,
  GatePanel,
  PhantomPowerControl,
} from './ProcessingPanels';
import './processing.css';

type Tab = 'peq' | 'geq' | 'gate' | 'compressor' | 'fx' | 'delay' | 'phantom';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'peq', labelKey: 'processing.peq' },
  { id: 'geq', labelKey: 'processing.geq' },
  { id: 'gate', labelKey: 'processing.gate' },
  { id: 'compressor', labelKey: 'processing.compressor' },
  { id: 'fx', labelKey: 'processing.fx' },
  { id: 'delay', labelKey: 'processing.delay' },
  { id: 'phantom', labelKey: 'processing.phantom' },
];

export function ProcessingView() {
  const { snapshot } = useMixer();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('peq');
  const strip =
    snapshot.strips.find((item) => item.id === snapshot.selectedStripId) ?? snapshot.strips[0];
  const geqAvailable = strip.kind === 'main' || strip.kind === 'aux';
  const tabs = TABS.filter((item) => item.id !== 'geq' || geqAvailable);
  const activeTab = tab === 'geq' && !geqAvailable ? 'peq' : tab;

  return (
    <section className="view processing-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{t('mixer.selectedChannel')}</span>
          <h1>{t('processing.title')}</h1>
          <p>{t('processing.subtitle')}</p>
        </div>
        <div className="channel-badge">
          <span className="mono-tag">{strip.inputLabel}</span>
          <strong>{strip.name}</strong>
        </div>
      </header>

      <div className="tabs" role="tablist" aria-label={t('processing.title')}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            className={`tab${activeTab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {activeTab === 'peq' && <PeqPanel strip={strip} />}
        {activeTab === 'geq' && <GeqPanel strip={strip} />}
        {activeTab === 'gate' && <GatePanel strip={strip} />}
        {activeTab === 'compressor' && <CompressorPanel strip={strip} />}
        {activeTab === 'fx' && <FxPanel strip={strip} />}
        {activeTab === 'delay' && <DelayPanel strip={strip} />}
        {activeTab === 'phantom' && <PhantomPowerControl strip={strip} />}
      </div>
    </section>
  );
}
