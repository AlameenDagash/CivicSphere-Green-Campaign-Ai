import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Languages } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 text-xs shadow-2xs shrink-0"
      role="group"
      aria-label="Language selector"
    >
      <div className="hidden xs:flex items-center pl-1.5 pr-1 text-slate-400" aria-hidden="true">
        <Languages className="w-3.5 h-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        aria-label="Select English language"
        className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 min-h-[30px] min-w-[26px] flex items-center justify-center ${
          language === 'en'
            ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-bold'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ha')}
        aria-pressed={language === 'ha'}
        aria-label="Select Hausa language"
        className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-all duration-150 min-h-[30px] min-w-[26px] flex items-center justify-center ${
          language === 'ha'
            ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/60 font-bold'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
        }`}
      >
        HA
      </button>
    </div>
  );
};
