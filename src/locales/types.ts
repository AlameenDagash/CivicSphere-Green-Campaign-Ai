/**
 * CivicSphere AI — Supported Languages & Localization Types
 * 
 * Configured for English (default) and Hausa for this release.
 * Extensible for Yoruba ('yo'), Igbo ('ig'), and Nigerian Pidgin ('pcm').
 */

export type SupportedLanguage = 'en' | 'ha';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'ha', label: 'Hausa', nativeLabel: 'Hausa' },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'civicsphere_language';

export type TranslationDictionary = Record<string, string>;
