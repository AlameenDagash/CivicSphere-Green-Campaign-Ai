import React, { useEffect, useState, useRef } from 'react';
import { candidateConfig } from '../../config/candidate.config';
import { useLanguage } from '../../contexts/LanguageContext';
import { Sparkles, Building2, ArrowRight, ShieldCheck } from 'lucide-react';

interface CandidateSplashScreenProps {
  onComplete: () => void;
  overrideDurationMs?: number;
}

export const CandidateSplashScreen: React.FC<CandidateSplashScreenProps> = ({
  onComplete,
  overrideDurationMs,
}) => {
  const { t } = useLanguage();
  const duration = overrideDurationMs ?? candidateConfig.displayDurationMs ?? 3800;

  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const startTime = performance.now();

    const frameId = requestAnimationFrame(function animate(now) {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 100) {
        requestAnimationFrame(animate);
      } else {
        // Trigger exit fade-out
        setIsFadingOut(true);
        setTimeout(() => {
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        }, 320);
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [duration, onComplete]);

  const handleSkip = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome presentation splash screen"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Header Strip */}
      <header className="w-full max-w-4xl flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/30">
            <Sparkles className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold tracking-wider uppercase text-emerald-400">
              CivicSphere AI
            </span>
            <span className="block text-[11px] text-slate-400">
              {t('splash.officialPortal')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition-colors shadow-2xs"
        >
          <span>{t('splash.enterNow')}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </header>

      {/* Main Candidate Card */}
      <main className="my-auto w-full max-w-xl py-8 text-center flex flex-col items-center">
        {/* Candidate Portrait / Seal */}
        <div className="relative mb-6">
          <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full border-2 border-emerald-500/40 p-1.5 shadow-2xl bg-gradient-to-tr from-emerald-600/20 via-slate-800 to-slate-900">
            {candidateConfig.photoUrl && !imageFailed ? (
              <img
                src={candidateConfig.photoUrl}
                alt={candidateConfig.name}
                onError={() => setImageFailed(true)}
                className="h-full w-full rounded-full object-cover shadow-inner"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center text-center p-3">
                <Building2 className="w-10 h-10 text-emerald-400 mb-1" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  Civic Crest
                </span>
              </div>
            )}
          </div>
          {/* Party Insignia Badge */}
          {candidateConfig.party && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-emerald-600 text-[10px] font-bold uppercase tracking-wider text-white shadow-md border border-emerald-400/40">
              {candidateConfig.party}
            </div>
          )}
        </div>

        {/* Candidate Identity */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white max-w-lg">
          {candidateConfig.name}
        </h1>

        <p className="mt-2 text-sm sm:text-base font-semibold text-emerald-400 tracking-wide">
          {candidateConfig.office}
        </p>

        <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
          {candidateConfig.jurisdiction}
        </p>

        {candidateConfig.motto && (
          <p className="mt-4 text-xs italic text-slate-400 max-w-md border-t border-slate-800/80 pt-3">
            "{candidateConfig.motto}"
          </p>
        )}
      </main>

      {/* Footer & Loading Progress Indicator */}
      <footer className="w-full max-w-md pb-4 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('splash.preparingWorkspace')}</span>
        </div>

        {/* Animated Progress Bar */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/50"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-75 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          {t('splash.poweredBy')}
        </div>
      </footer>
    </div>
  );
};
