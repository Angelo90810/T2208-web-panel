import { useState } from 'react';
import { useMixer } from '../../app/MixerProvider';
import { useI18n } from '../../app/useI18n';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { LibraryItem } from '../../domain/types';
import './presets.css';

function formatDate(value: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export function PresetsView() {
  const { snapshot, dispatch } = useMixer();
  const { t, language } = useI18n();
  const [presetName, setPresetName] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<LibraryItem | null>(null);
  const [recallTarget, setRecallTarget] = useState<LibraryItem | null>(null);
  const [copyTarget, setCopyTarget] = useState<LibraryItem | null>(null);
  const [copyName, setCopyName] = useState('');

  const save = (kind: 'preset' | 'scene') => {
    const name = kind === 'preset' ? presetName : sceneName;
    if (!name.trim()) return;
    void dispatch({ type: 'library.save', kind, name });
    if (kind === 'preset') setPresetName('');
    else setSceneName('');
  };

  const renderItem = (item: LibraryItem) => (
    <article className="library-item" key={item.id}>
      <div className="library-item-main">
        <strong>{item.name}</strong>
        <span>
          {t('presets.createdAt')} {formatDate(item.createdAt, language)}
        </span>
      </div>
      <div className="library-actions">
        <button
          type="button"
          className="btn btn-small btn-primary"
          onClick={() => {
            if (item.kind === 'scene') setRecallTarget(item);
            else void dispatch({ type: 'library.load', itemId: item.id });
          }}
        >
          {item.kind === 'scene' ? t('presets.recall') : t('presets.load')}
        </button>
        <button
          type="button"
          className="btn btn-small btn-ghost"
          onClick={() => {
            setCopyTarget(item);
            setCopyName(`${item.name} (cópia)`);
          }}
        >
          {t('common.copy')}
        </button>
        <button
          type="button"
          className="btn btn-small btn-ghost btn-danger-text"
          onClick={() => setDeleteTarget(item)}
        >
          {t('common.delete')}
        </button>
      </div>

      {copyTarget?.id === item.id && (
        <div className="copy-form">
          <label>
            <span>{t('presets.copyName')}</span>
            <input value={copyName} onChange={(event) => setCopyName(event.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-small btn-primary"
            onClick={() => {
              if (!copyName.trim()) return;
              void dispatch({ type: 'library.copy', itemId: item.id, name: copyName });
              setCopyTarget(null);
            }}
          >
            {t('common.copy')}
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setCopyTarget(null)}>
            {t('common.cancel')}
          </button>
        </div>
      )}
    </article>
  );

  return (
    <section className="view presets-view">
      <header className="view-head">
        <div>
          <span className="eyebrow">{t('presets.localOnly')}</span>
          <h1>{t('presets.title')}</h1>
          <p>{t('presets.subtitle')}</p>
        </div>
        <span className="tag">{t('presets.demoLibrary')}</span>
      </header>

      <div className="library-layout">
        <article className="panel">
          <header className="panel-head">
            <h2>{t('presets.presets')}</h2>
            <span className="tag">{snapshot.library.presets.length}</span>
          </header>
          <div className="save-form">
            <input
              value={presetName}
              placeholder={t('presets.namePlaceholder')}
              aria-label={t('presets.namePlaceholder')}
              onChange={(event) => setPresetName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && save('preset')}
            />
            <button type="button" className="btn btn-primary" onClick={() => save('preset')}>
              {t('presets.savePreset')}
            </button>
          </div>
          <div className="library-list">
            {snapshot.library.presets.length === 0 && <p className="hint">{t('presets.empty')}</p>}
            {snapshot.library.presets.map(renderItem)}
          </div>
        </article>

        <article className="panel">
          <header className="panel-head">
            <h2>{t('presets.scenes')}</h2>
            <span className="tag">{snapshot.library.scenes.length}</span>
          </header>
          <div className="save-form">
            <input
              value={sceneName}
              placeholder={t('presets.sceneNamePlaceholder')}
              aria-label={t('presets.sceneNamePlaceholder')}
              onChange={(event) => setSceneName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && save('scene')}
            />
            <button type="button" className="btn btn-primary" onClick={() => save('scene')}>
              {t('presets.saveScene')}
            </button>
          </div>
          <div className="library-list">
            {snapshot.library.scenes.length === 0 && <p className="hint">{t('presets.empty')}</p>}
            {snapshot.library.scenes.map(renderItem)}
          </div>
        </article>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('presets.deleteTitle', { name: deleteTarget?.name ?? '' })}
        message={t('presets.deleteMessage')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) void dispatch({ type: 'library.delete', itemId: deleteTarget.id });
          setDeleteTarget(null);
        }}
      />

      <ConfirmDialog
        open={recallTarget !== null}
        title={`${t('presets.recall')} "${recallTarget?.name ?? ''}"?`}
        message={t('presets.recallMessage')}
        confirmLabel={t('presets.recall')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setRecallTarget(null)}
        onConfirm={() => {
          if (recallTarget) void dispatch({ type: 'scene.recall', sceneId: recallTarget.id });
          setRecallTarget(null);
        }}
      />
    </section>
  );
}
