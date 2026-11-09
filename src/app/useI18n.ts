import { useCallback } from 'react';
import { translate } from '../i18n/catalog';
import type { Language } from '../domain/types';
import { useMixer } from './MixerProvider';

export function useI18n(): {
  t: (key: string, vars?: Record<string, string | number>) => string;
  language: Language;
} {
  const { snapshot } = useMixer();
  const language = snapshot.system.language;
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language],
  );
  return { t, language };
}
