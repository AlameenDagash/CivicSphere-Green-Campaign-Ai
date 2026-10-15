import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  getTranslation,
} from '../locales';

export interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): SupportedLanguage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'ha') {
        return stored;
      }
    }
  } catch {
    // localStorage might be unavailable or restricted; fall back gracefully
  }
  return DEFAULT_LANGUAGE;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    // Validate supported language
    const isValid = SUPPORTED_LANGUAGES.some((opt) => opt.code === newLang);
    const targetLang = isValid ? newLang : DEFAULT_LANGUAGE;

    setLanguageState(targetLang);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, targetLang);
      }
    } catch {
      // Graceful fallback if localStorage is blocked
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getTranslation(language, key);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
