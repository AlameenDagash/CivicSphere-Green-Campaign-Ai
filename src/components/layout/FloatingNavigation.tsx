import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ArrowLeft, Home, ArrowRight } from 'lucide-react';

interface FloatingNavigationProps {
  className?: string;
}

interface Position {
  x: number;
  y: number;
}

type ActiveAction = 'back' | 'home' | 'forward' | null;

const STORAGE_KEY = 'civicsphere_floating_nav_pos';

function getStoredPosition(): Position | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
        return { x: parsed.x, y: parsed.y };
      }
    }
  } catch {
    // sessionStorage not available
  }
  return null;
}

function savePosition(pos: Position) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // sessionStorage not available
  }
}

function clampPosition(x: number, y: number, width: number, height: number): Position {
  const padding = 10;
  const maxX = Math.max(padding, window.innerWidth - width - padding);
  const maxY = Math.max(padding, window.innerHeight - height - padding);
  return {
    x: Math.min(Math.max(padding, x), maxX),
    y: Math.min(Math.max(padding, y), maxY),
  };
}

export const FloatingNavigation: React.FC<FloatingNavigationProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { isPlatformOwner, isContentLearningManager, isOperationsRewardsManager } = useTenant();
  const { t } = useLanguage();
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [position, setPosition] = useState<Position | null>(() => getStoredPosition());
  const navRef = useRef<HTMLElement>(null);
  const hasDraggedRef = useRef(false);

  // Initialize and validate position on mount
  useEffect(() => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();

    if (position) {
      const clamped = clampPosition(position.x, position.y, rect.width, rect.height);
      if (clamped.x !== position.x || clamped.y !== position.y) {
        setPosition(clamped);
        savePosition(clamped);
      }
    } else {
      const defaultX = (window.innerWidth - rect.width) / 2;
      const defaultY = window.innerHeight - rect.height - 24;
      const clamped = clampPosition(defaultX, defaultY, rect.width, rect.height);
      setPosition(clamped);
      savePosition(clamped);
    }
  }, []);

  // Keep within viewport if window is resized
  useEffect(() => {
    const handleResize = () => {
      if (!navRef.current) return;
      const rect = navRef.current.getBoundingClientRect();
      setPosition((prev) => {
        if (!prev) return prev;
        const clamped = clampPosition(prev.x, prev.y, rect.width, rect.height);
        if (clamped.x !== prev.x || clamped.y !== prev.y) {
          savePosition(clamped);
          return clamped;
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return; // Only primary mouse button or touch
    const navEl = navRef.current;
    if (!navEl) return;

    const rect = navEl.getBoundingClientRect();
    const currentX = position?.x ?? rect.left;
    const currentY = position?.y ?? rect.top;

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    hasDraggedRef.current = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startPointerX;
      const dy = moveEvent.clientY - startPointerY;

      if (!hasDraggedRef.current && Math.hypot(dx, dy) > 4) {
        hasDraggedRef.current = true;
      }

      if (hasDraggedRef.current) {
        const nextPos = clampPosition(currentX + dx, currentY + dy, rect.width, rect.height);
        setPosition(nextPos);
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (hasDraggedRef.current) {
        const dx = upEvent.clientX - startPointerX;
        const dy = upEvent.clientY - startPointerY;
        const finalPos = clampPosition(currentX + dx, currentY + dy, rect.width, rect.height);
        setPosition(finalPos);
        savePosition(finalPos);

        // Reset drag flag after short delay to suppress click
        setTimeout(() => {
          hasDraggedRef.current = false;
        }, 50);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  };

  const handleBack = () => {
    setActiveAction('back');
    window.history.back();
  };

  const handleHome = () => {
    setActiveAction('home');
    const canAccessPlatform = isPlatformOwner || isContentLearningManager || isOperationsRewardsManager;
    navigate(canAccessPlatform ? '/dashboard' : '/tenant/dashboard');
  };

  const handleForward = () => {
    setActiveAction('forward');
    window.history.forward();
  };

  const getButtonClass = (isActive: boolean) =>
    `flex items-center gap-1.5 transition-all duration-150 focus:outline-none focus:ring-2 cursor-pointer ${
      isActive
        ? 'bg-emerald-600 text-white font-medium rounded-full px-3 py-1 shadow-sm focus:ring-emerald-500'
        : 'text-slate-700 hover:text-emerald-700 dark:text-slate-300 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 rounded-full text-xs font-medium px-2 py-1 focus:ring-emerald-600/20'
    }`;

  const getIconClass = (isActive: boolean) =>
    `w-4 h-4 transition-colors duration-150 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-300 group-hover:text-emerald-700'}`;

  return (
    <nav
      ref={navRef}
      aria-label="Floating Navigation"
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
      style={
        position
          ? {
              position: 'fixed',
              left: 0,
              top: 0,
              transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
              touchAction: 'none',
            }
          : {
              touchAction: 'none',
            }
      }
      className={`fixed ${!position ? 'bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2' : ''} z-40 select-none ${className}`}
    >
      <div className="flex items-center gap-1 sm:gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-emerald-300/80 shadow-lg shadow-emerald-900/10 rounded-full px-3 py-1.5 cursor-grab active:cursor-grabbing">
        <button
          type="button"
          onClick={handleBack}
          aria-pressed={activeAction === 'back'}
          className={getButtonClass(activeAction === 'back')}
        >
          <ArrowLeft className={getIconClass(activeAction === 'back')} />
          <span>{t('nav.back')}</span>
        </button>

        <div className="w-px h-3.5 bg-emerald-200/60 dark:bg-emerald-800/50 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={handleHome}
          aria-pressed={activeAction === 'home'}
          className={getButtonClass(activeAction === 'home')}
        >
          <Home className={getIconClass(activeAction === 'home')} />
          <span>{t('nav.home')}</span>
        </button>

        <div className="w-px h-3.5 bg-emerald-200/60 dark:bg-emerald-800/50 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={handleForward}
          aria-pressed={activeAction === 'forward'}
          className={getButtonClass(activeAction === 'forward')}
        >
          <span>{t('nav.forward')}</span>
          <ArrowRight className={getIconClass(activeAction === 'forward')} />
        </button>
      </div>
    </nav>
  );
};

export default FloatingNavigation;
