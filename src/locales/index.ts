import type { SupportedLanguage, TranslationDictionary } from './types';
import { en } from './en';
import { ha } from './ha';

export * from './types';
export { en } from './en';
export { ha } from './ha';

export const dictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  ha,
};

/**
 * Resolves translation string by key with safe fallback to English.
 * Guarantees rendering never crashes or returns empty on missing keys.
 */
export function getTranslation(language: SupportedLanguage, key: string): string {
  const activeDict = dictionaries[language];
  if (activeDict && activeDict[key]) {
    return activeDict[key];
  }
  // Fallback to English dictionary
  if (en[key]) {
    return en[key];
  }
  // Ultimate safety fallback returns key itself
  return key;
}
