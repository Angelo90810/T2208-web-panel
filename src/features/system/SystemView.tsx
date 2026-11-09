import { useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { VIEW_META } from '../../app/navigation';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SliderField } from '../../components/SliderField';
import { LANGUAGE_OPTIONS } from '../../i18n/catalog';
import type { Language } from '../../domain/types';
import './system.css';

const SHORTCUTS = ['none', 'mute', 'solo', 'tap'];

function isValidIpv4(value: string): boolean {
  const parts = value.trim().split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
}

export function SystemView() {
  const { snapshot, dispatch } = useMixer();
  const { t } = useI18n();
  const [ipDraft, setIpDraft] = useState(snapshot.system.ip);
  const [ipError, setIpError] = useState(false);
  const [resetScope, setResetScope] = useState<'system' | 'all' | null>(null);

  const set = (setting: 'deviceName' | 'deviceId' | 'defaultPage' | 'shortcut', value: string) => {
    void dispatch({ type: 'system.set', setting, value });
  };

  return (
    <section className="view system-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{t('system.demoOnly')}</span>
          <h1>{t('system.title')}</h1>
          <p>{t('system.subtitle')}</p>
        </div>
        <span className="tag tag--accent">{t('system.noRealWrite')}</span>
      </header>

      <div className="system-layout">
        <article className="panel">
          <header className="panel-head">
            <h2>{t('system.deviceInfo')}</h2>
          </header>
          <dl className="info-grid">
            <div>
              <dt>{t('system.deviceName')}</dt>
              <dd>{snapshot.system.deviceName}</dd>
            </div>
            <div>
              <dt>{t('system.deviceId')}</dt>
              <dd>{snapshot.system.deviceId}</dd>
            </div>
            <div>
              <dt>{t('system.firmware')}</dt>
              <dd>{snapshot.system.firmware}</dd>
            </div>
            <div>
              <dt>{t('system.compatibility')}</dt>
              <dd>{t('common.unverified')}</dd>
            </div>
          </dl>
          <p className="hint">{t('system.versionNote')}</p>
        </article>

        <article className="panel">
          <header className="panel-head">
            <h2>{t('system.title')}</h2>
          </header>

          <div className="form-grid">
            <label className="text-field">
              <span>{t('system.deviceName')}</span>
              <input
                value={snapshot.system.deviceName}
                maxLength={32}
                onChange={(event) => set('deviceName', event.target.value)}
              />
            </label>

            <label className="text-field">
              <span>{t('system.deviceId')}</span>
              <input
                value={snapshot.system.deviceId}
                maxLength={16}
                onChange={(event) => set('deviceId', event.target.value)}
              />
            </label>

            <label className="select-field">
              <span>{t('system.language')}</span>
              <select
                value={snapshot.system.language}
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

            <label className="select-field">
              <span>{t('system.defaultPage')}</span>
              <select
                value={snapshot.system.defaultPage}
                onChange={(event) => set('defaultPage', event.target.value)}
              >
                {VIEW_META.map((view) => (
                  <option key={view.id} value={view.id}>
                    {t(view.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="select-field">
              <span>{t('system.shortcut')}</span>
              <select
                value={snapshot.system.shortcut}
                onChange={(event) => set('shortcut', event.target.value)}
              >
                {SHORTCUTS.map((shortcut) => (
                  <option key={shortcut} value={shortcut}>
                    {shortcut === 'none' ? t('common.none') : shortcut}
                  </option>
                ))}
              </select>
            </label>

            <div className="text-field">
              <span>{t('system.ip')}</span>
              <div className="inline-field">
                <input
                  value={ipDraft}
                  inputMode="decimal"
                  aria-invalid={ipError}
                  onChange={(event) => {
                    setIpDraft(event.target.value);
                    setIpError(false);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-small btn-primary"
                  onClick={() => {
                    if (!isValidIpv4(ipDraft)) {
                      setIpError(true);
                      return;
                    }
                    void dispatch({ type: 'system.set', setting: 'ip', value: ipDraft.trim() });
                  }}
                >
                  {t('common.apply')}
                </button>
              </div>
              {ipError && <small className="field-error">{t('connection.ipInvalid')}</small>}
            </div>
          </div>

          <SliderField
            label={t('system.brightness')}
            value={snapshot.system.brightness}
            min={0}
            max={100}
            unit="%"
            onChange={(value) => {
              void dispatch({ type: 'system.set', setting: 'brightness', value });
            }}
          />

          <p className="hint">{t('system.languageHint')}</p>
        </article>

        <article className="panel">
          <header className="panel-head">
            <h2>{t('system.channelNames')}</h2>
            <span className="tag">{snapshot.strips.length}</span>
          </header>
          <div className="channel-name-list">
            {snapshot.strips.map((strip) => (
              <label className="channel-name-row" key={strip.id}>
                <span className="mono-tag">{strip.inputLabel}</span>
                <input
                  value={strip.name}
                  maxLength={12}
                  aria-label={`${t('common.name')} ${strip.inputLabel}`}
                  onChange={(event) => {
                    void dispatch({ type: 'strip.rename', stripId: strip.id, name: event.target.value });
                  }}
                />
              </label>
            ))}
          </div>
        </article>

        <article className="panel">
          <header className="panel-head">
            <h2>{t('system.factoryReset')}</h2>
          </header>
          <p className="hint">{t('system.resetMessage')}</p>
          <div className="panel-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setResetScope('system')}>
              {t('system.resetSystem')}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setResetScope('all')}>
              {t('system.resetAll')}
            </button>
          </div>
        </article>
      </div>

      <ConfirmDialog
        open={resetScope !== null}
        title={t('system.resetTitle')}
        message={t('system.resetMessage')}
        confirmLabel={resetScope === 'all' ? t('system.resetAll') : t('system.resetSystem')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setResetScope(null)}
        onConfirm={() => {
          if (resetScope) void dispatch({ type: 'system.resetDefaults', scope: resetScope });
          setResetScope(null);
        }}
      />
    </section>
  );
}
