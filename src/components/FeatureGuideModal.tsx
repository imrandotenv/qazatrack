'use client';

import { useEffect, useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

type FeatureGuideModalProps = {
  open: boolean;
  onClose: () => void;
};

type GuideStep = 1 | 2 | 3 | 4;

export function FeatureGuideModal({ open, onClose }: FeatureGuideModalProps) {
  const [step, setStep] = useState<GuideStep>(1);

  useModalA11y(open, onClose);

  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  // Keyboard navigation for steps
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        if (step < 4) {
          setStep((s) => (s + 1) as GuideStep);
        }
      } else if (e.key === 'ArrowLeft') {
        if (step > 1) {
          setStep((s) => (s - 1) as GuideStep);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, step]);

  if (!open) return null;

  function handleNext() {
    if (step < 4) {
      setStep((s) => (s + 1) as GuideStep);
    } else {
      onClose();
    }
  }

  function handlePrev() {
    if (step > 1) {
      setStep((s) => (s - 1) as GuideStep);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Feature Guide"
        className="relative flex flex-col max-h-[min(92vh,740px)] w-full max-w-lg rounded-3xl border border-slate-900/[0.08] bg-[#FAF9F6] p-5 shadow-2xl transition-all dark:border-white/[0.08] dark:bg-[#090D16] sm:p-7 overflow-hidden"
      >
        {/* Top Row: Progress Indicator + Subtle Dots (Left) and Skip Button (Right) */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-900/[0.06] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Step {step} of 4
            </span>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Feature guide steps">
              {([1, 2, 3, 4] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={step === s}
                  aria-label={`Step ${s} of 4`}
                  onClick={() => setStep(s)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    step === s
                      ? 'w-6 bg-emerald-700 dark:bg-emerald-500'
                      : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Skip"
            className="min-h-[40px] px-3 rounded-lg text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            Skip
          </button>
        </div>

        {/* Content Body: Explanations + Visual Card Preview */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-4 pr-0.5 space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111827]">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold text-lg">
                      +1
                    </span>
                    <div>
                      <span className="block text-sm font-bold text-[var(--foreground)]">Fajr Qaza</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">2 Rak&apos;at Farz</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Single Tap
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-emerald-700 p-2.5 text-center text-xs font-bold text-white shadow-xs dark:bg-emerald-600 dark:text-slate-950">
                  Clear 1 Full Day Set (+1 All 6 Prayers)
                </div>
              </div>

              <div>
                <h3
                  id="feature-guide-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]"
                >
                  One-Tap Salah Logging
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Fast, friction-free tracking for both individual prayers and complete days.
                </p>
              </div>

              <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    1
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Individual Prayers:</strong> Tap{' '}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-emerald-800 dark:bg-slate-800 dark:text-emerald-300">
                      +1
                    </code>{' '}
                    on any prayer card (Fajr, Dhuhr, Asr, Maghrib, Isha, or Witr) to instantly deduct one prayer from your backlog.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    2
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Complete Full Day:</strong> Tap{' '}
                    <strong className="text-[var(--foreground)]">Clear 1 Full Day Set</strong> to log all 5 daily Farz prayers plus Witr simultaneously whenever you make up a whole day.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    3
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Instant Undo:</strong> Tapped by accident? A discreet notification lets you undo any action within 6 seconds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111827]">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-emerald-700 bg-emerald-50/70 p-2 text-center dark:border-emerald-500 dark:bg-emerald-950/40">
                    <span className="block text-xs font-bold text-emerald-900 dark:text-emerald-200">Gentle</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300">1x / day</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2 text-center dark:border-slate-800 dark:bg-slate-900/40">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Steady</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">2x / day</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2 text-center dark:border-slate-800 dark:bg-slate-900/40">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Custom</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Your pace</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <span>✦</span>
                  <span>Focused purely on daily consistency, not guilt</span>
                </div>
              </div>

              <div>
                <h3
                  id="feature-guide-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]"
                >
                  Gentle Daily Pace
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Build steady spiritual momentum without stressful deadlines or burnout.
                </p>
              </div>

              <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    1
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Habit-Centered Rhythm:</strong> Praying 1 Qaza set after each daily Farz prayer takes just ~3 extra minutes and clears a full year in 365 days.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    2
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">No Overwhelming Countdown:</strong> Rather than fixating on large backlog totals, QazaTrack anchors you on your manageable target for today.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    3
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Today&apos;s Salah Check-in:</strong> Mark today&apos;s daily obligatory prayers as Prayed or Missed so nothing slips through the cracks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111827]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-sm">
                      %
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-[var(--foreground)]">Milestone Cards</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">High-resolution PNG export</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white dark:bg-emerald-500 dark:text-slate-950">
                    Shareable
                  </span>
                </div>
              </div>

              <div>
                <h3
                  id="feature-guide-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]"
                >
                  Progress &amp; Shareable Milestones
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Inspect your prayer details anytime and celebrate your consistency.
                </p>
              </div>

              <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    1
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Deep Breakdown:</strong> Review your exact cleared vs. remaining prayers and rak&apos;ats across each Salah whenever you want.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    2
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Clean PNG Cards:</strong> Tap <strong className="text-[var(--foreground)]">Share</strong> in the top header or completion banner to generate an elegant image card to save or share.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    3
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Sadaqah Jariyah:</strong> Inspire loved ones to fulfill their debt alongside you, multiplying spiritual rewards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-slate-900/[0.08] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111827]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-base">
                      🔒
                    </span>
                    <div>
                      <span className="block text-sm font-bold text-[var(--foreground)]">Browser-Only Storage</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">Zero servers · 100% private</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    JSON Backup
                  </span>
                </div>
              </div>

              <div>
                <h3
                  id="feature-guide-title"
                  className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]"
                >
                  100% Private &amp; Offline Backup
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your worship records belong solely to you—never sent to any server.
                </p>
              </div>

              <div className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    1
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Pure Privacy:</strong> All logs remain strictly in your browser&apos;s local storage. No accounts, no ads, and zero analytics tracking.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    2
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">Export JSON:</strong> Open <strong className="text-[var(--foreground)]">Settings</strong> anytime to download a backup file before upgrading phones or clearing cache.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-xs font-bold">
                    3
                  </span>
                  <p>
                    <strong className="text-[var(--foreground)]">One-Click Restore:</strong> Upload your JSON backup on any device to restore your exact counts and progress in seconds.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row: Back (from Step 2 onward) + Next / Got it */}
        <div
          className={`flex items-center pt-4 mt-1 border-t border-slate-900/[0.06] dark:border-white/[0.06] gap-3 ${
            step > 1 ? 'justify-between' : 'justify-end'
          }`}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="min-h-[46px] rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className={`min-h-[46px] ${
              step > 1 ? 'flex-1 sm:flex-initial' : 'w-full sm:w-auto'
            } rounded-xl bg-emerald-700 px-4 sm:px-6 text-sm font-bold text-white whitespace-nowrap hover:bg-emerald-800 active:scale-[0.99] dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700`}
          >
            {step === 4 ? 'Got it, Start Tracking' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  );
}
