/**
 * Lightweight i18n system — no external dependency.
 *
 * Uses flat dot-notation keys (e.g. "hero.title") and a simple
 * React context so every component can call `const { t } = useI18n()`.
 *
 * Supports variable interpolation: t('key', { name: 'Lucas' })
 * renders "Hello, {name}" → "Hello, Lucas".
 */
import { createContext, useContext, useCallback, type ReactNode } from 'react';
import pt from './locales/pt';
import en from './locales/en';
import es from './locales/es';

export type Locale = 'pt' | 'en' | 'es';

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
};

const locales: Record<Locale, Record<string, string>> = { pt, en, es };

interface I18nContextType {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'pt',
  t: (key) => key,
});

interface I18nProviderProps {
  locale: Locale;
  children: ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = locales[locale]?.[key] ?? locales.pt[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
