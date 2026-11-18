'use client';

import { useEffect, useState } from 'react';

export type HeaderProps = {
  streak?: number;
  isOnboarding?: boolean;
  onShareMilestone?: () => void;
  onSettingsBackup?: () => void;
  onOpenFeatureGuide?: () => void;
};

export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleTheme() {
    const nextIsDark = !isDark;
    document.documentElement.classList.toggle('dark', nextIsDark);
    try {
      window.localStorage.setItem('qazatrack-theme', nextIsDark ? 'dark' : 'light');
    } catch {
      // Ignore localStorage restrictions
    }
    setIsDark(nextIsDark);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={
        className ??
        'inline-flex min-h-[38px] min-w-[38px] max-[380px]:min-h-[36px] max-[380px]:min-w-[36px] items-center justify-center gap-2 rounded-full border border-slate-900/[0.08] bg-white/70 p-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-white/[0.08] dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-800 sm:min-h-[48px] sm:min-w-0 sm:justify-start sm:px-3'
      }
    >
      {isDark ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20.2 15.1A8.3 8.3 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )}
      <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
    </button>
  );
}

function GuideIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0L8 8m4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3H4a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3L5 5.3a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0V2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function Header({
  streak = 0,
  isOnboarding = false,
  onShareMilestone,
  onSettingsBackup,
  onOpenFeatureGuide,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-900/[0.08] bg-[#FAF9F6]/85 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#090D16]/85">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-1.5 overflow-x-hidden px-3 sm:gap-4 sm:px-8">
        <a className="flex min-w-0 items-center gap-2.5 sm:gap-3 text-[var(--foreground)]" href="/" aria-label="QazaTrack home">
          <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[12px] sm:rounded-[13px] bg-emerald-700 text-white shadow-[0_2px_10px_-3px_rgba(4,120,87,0.35)] dark:bg-emerald-500 dark:text-slate-950">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="sm:h-[25px] sm:w-[25px]">
              <path d="M23 5.7A11.5 11.5 0 1 0 25.8 22.4 10 10 0 1 1 23 5.7Z" fill="currentColor" />
              <path d="m9.5 17 3.4 3.4 9.2-9.2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base max-[380px]:text-[15px] sm:text-[17px] font-bold tracking-[-0.035em]">QazaTrack</span>
            <span className="hidden text-xs text-slate-600 dark:text-slate-300 sm:block">Peaceful Spiritual Accounting</span>
          </span>
        </a>

        <nav className="flex items-center gap-1 max-[380px]:gap-0.5 sm:gap-2" aria-label="Account and display controls">
          {!isOnboarding && (
            <>
              <span className="inline-flex min-h-[38px] max-[380px]:min-h-[36px] items-center gap-1 rounded-full bg-amber-100 px-2 max-[380px]:px-1.5 text-xs sm:text-sm font-bold tabular-nums text-amber-900 dark:bg-amber-400/15 dark:text-amber-200 sm:gap-1.5 sm:px-3">
                <span aria-hidden="true" className="text-amber-700 dark:text-amber-300">✦</span>
                <span className="sm:hidden">{streak}d</span>
                <span className="hidden sm:inline">{streak}d streak</span>
              </span>
              <button
                type="button"
                onClick={onShareMilestone}
                aria-label="Share milestone"
                className="inline-flex min-h-[38px] min-w-[38px] max-[380px]:min-h-[36px] max-[380px]:min-w-[36px] items-center justify-center gap-2 rounded-xl p-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100/70 dark:text-emerald-300 dark:hover:bg-emerald-400/10 sm:min-h-[48px] sm:min-w-0 sm:justify-start sm:px-3"
              >
                <ShareIcon />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                type="button"
                onClick={onSettingsBackup}
                aria-label="Open settings and backup"
                className="inline-flex min-h-[38px] min-w-[38px] max-[380px]:min-h-[36px] max-[380px]:min-w-[36px] items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-slate-800 sm:min-h-[48px] sm:min-w-[48px]"
              >
                <SettingsIcon />
              </button>
              {onOpenFeatureGuide && (
                <button
                  type="button"
                  onClick={onOpenFeatureGuide}
                  aria-label="Open feature guide"
                  title="Feature Guide"
                  className="inline-flex min-h-[38px] min-w-[38px] max-[380px]:min-h-[36px] max-[380px]:min-w-[36px] items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-slate-800 sm:min-h-[48px] sm:min-w-[48px]"
                >
                  <GuideIcon />
                </button>
              )}
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
