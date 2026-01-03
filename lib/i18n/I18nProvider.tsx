'use client';

import { createContext, useContext, useMemo } from 'react';
import { translate, type MessageVariables } from './translate';

interface I18nContextValue {
  locale: string;
  t: (key: string, variables?: MessageVariables) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: React.ReactNode;
  locale?: string;
}

export default function I18nProvider({ children, locale = 'zh-TW' }: I18nProviderProps) {
  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      t: (key, variables) => translate(key, variables),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
