'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQazaStore } from '../hooks/useQazaStore';
import {
  calculatePayoffProjection,
  estimateFromDuration,
  PRAYER_RAKATS,
  totalRakatsRemaining,
} from '../lib/calculator';
import type { PaceMode, PrayerKey, QazaCounts } from '../types/qaza';

type EstimationMode = 'duration' | 'exact';
type NumericKey = keyof QazaCounts;

const prayerLabels: Array<[NumericKey, string]> = [
  ['fajr', 'Fajr'],
  ['dhuhr', 'Dhuhr'],
  ['asr', 'Asr'],
  ['maghrib', 'Maghrib'],
  ['isha', 'Isha'],
  ['witr', 'Witr'],
  ['fasts', 'Fasts'],
];

const prayerSummaryLabels: Array<[PrayerKey, string]> = [
  ['fajr', 'Fajr'],
  ['dhuhr', 'Dhuhr'],
  ['asr', 'Asr'],
  ['maghrib', 'Maghrib'],
  ['isha', 'Isha'],
  ['witr', 'Witr'],
];

const blankCounts = (): QazaCounts => ({
  fajr: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
  witr: 0,
  fasts: 0,
});

function displayDate(dateString: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(`${dateString}T12:00:00`),
  );
}

type StepperCardProps = {
  label: string;
  value: number;
  minimum?: number;
  maximum?: number;
  description?: string;
  onChange: (value: string) => void;
};

function StepperCard({
  label,
  value,
  minimum = 0,
  maximum = 999,
  description,
  onChange,
}: StepperCardProps) {
  function adjust(delta: number) {
    onChange(String(Math.min(maximum, Math.max(minimum, value + delta))));
  }

  return (
    <label className="block rounded-2xl border border-slate-900/[0.08] bg-white p-3 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-[#111827]">
      <span className="block px-2 text-base font-bold text-[var(--foreground)]">{label}</span>
      {description && <span className="mt-1 block px-2 text-sm text-slate-600 dark:text-slate-300">{description}</span>}
      <span className="mt-3 flex min-h-[58px] items-center gap-2">
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={value <= minimum}
          aria-label={`Decrease ${label}`}
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-slate-100 text-2xl font-medium text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-300"
        >
          −
        </button>
        <input
          type="number"
          min={minimum}
          max={maximum}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="min-w-0 flex-1 appearance-none bg-transparent text-center text-3xl font-bold tabular-nums text-[var(--foreground)] outline-none"
        />
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={value >= maximum}
          aria-label={`Increase ${label}`}
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl bg-emerald-700 text-2xl font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-35 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
        >
          +
        </button>
      </span>
    </label>
  );
}

export function OnboardingWizard() {
  const { completeOnboarding } = useQazaStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<EstimationMode>('duration');
  const [years, setYears] = useState(1);
  const [months, setMonths] = useState(0);
  const [includeExemption, setIncludeExemption] = useState(true);
  const [missedFasts, setMissedFasts] = useState(30);
  const [fastsManuallyEdited, setFastsManuallyEdited] = useState(false);
  const [exactCounts, setExactCounts] = useState<QazaCounts>(blankCounts);
  const [paceMode, setPaceMode] = useState<PaceMode>('gentle');
  const [customTarget, setCustomTarget] = useState(3);

  useEffect(() => {
    if (!fastsManuallyEdited) {
      setMissedFasts(years * 30);
    }
  }, [fastsManuallyEdited, years]);

  const counts = useMemo(
    () =>
      mode === 'duration'
        ? estimateFromDuration(years, months, includeExemption, missedFasts)
        : exactCounts,
    [exactCounts, includeExemption, missedFasts, mode, months, years],
  );
  const target = paceMode === 'gentle' ? 1 : paceMode === 'steady' ? 2 : customTarget;
  const projection = useMemo(() => calculatePayoffProjection(counts, target), [counts, target]);

  function updateDuration(
    setter: (value: number) => void,
    value: string,
    minimum = 0,
    maximum = 999,
  ) {
    const parsed = Number(value);
    setter(Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : minimum);
  }

  function updateExactCount(key: NumericKey, value: string) {
    const parsed = Number(value);
    setExactCounts((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  }

  function startPlan() {
    completeOnboarding(counts, paceMode, target);
  }

  return (
    <main className="mx-auto w-full max-w-3xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-xl">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">A gentle beginning</p>
            <h1 className="text-3xl font-bold tracking-[-0.045em] text-[var(--foreground)] sm:text-4xl">
              {step === 1 ? 'Let’s estimate your qaza' : 'Choose a pace that feels kind'}
            </h1>
          </div>
          <span className="shrink-0 text-sm font-bold tabular-nums text-slate-600 dark:text-slate-300">Step {step} of 2</span>
        </div>
        <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-label={`Step ${step} of 2`} role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step}>
          <div className="h-full rounded-full bg-emerald-700 transition-[width] duration-300 dark:bg-emerald-500" style={{ width: `${step * 50}%` }} />
        </div>

        <div className="rounded-3xl border border-slate-900/[0.08] bg-white p-5 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-[#111827] sm:p-8">
          {step === 1 ? (
            <section aria-labelledby="estimate-heading">
              <h2 id="estimate-heading" className="sr-only">Estimate missed prayers and fasts</h2>
              <div className="mb-8 grid grid-cols-2 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                {[
                  ['duration', 'By Years & Months'],
                  ['exact', 'Exact Counts'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value as EstimationMode)}
                    className={`min-h-[48px] rounded-full px-3 text-sm font-bold ${
                      mode === value
                        ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                    aria-pressed={mode === value}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'duration' ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <StepperCard label="Years" value={years} maximum={999} onChange={(value) => updateDuration(setYears, value)} />
                    <StepperCard label="Months" value={months} maximum={11} onChange={(value) => updateDuration(setMonths, value, 0, 11)} />
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={includeExemption}
                    onClick={() => setIncludeExemption((current) => !current)}
                    className="flex min-h-[72px] w-full items-center justify-between gap-4 rounded-2xl border border-slate-900/[0.08] bg-slate-50 px-4 text-left hover:border-emerald-300 dark:border-white/[0.08] dark:bg-slate-900/60"
                  >
                    <span>
                      <span className="block text-base font-bold text-[var(--foreground)]">Monthly exemption days</span>
                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">Approximately 7 days each month</span>
                    </span>
                    <span className={`relative h-7 w-12 shrink-0 rounded-full p-1 ${includeExemption ? 'bg-emerald-700 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${includeExemption ? 'translate-x-5' : 'translate-x-0'}`} />
                    </span>
                  </button>
                  <StepperCard
                    label="Missed Ramadan fasts"
                    description="Suggested from your years; adjust with care."
                    value={missedFasts}
                    onChange={(value) => {
                      setFastsManuallyEdited(true);
                      updateDuration(setMissedFasts, value);
                    }}
                  />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {prayerLabels.map(([key, label]) => (
                    <StepperCard key={key} label={label} value={exactCounts[key]} maximum={999999} onChange={(value) => updateExactCount(key, value)} />
                  ))}
                </div>
              )}

              <div className="mt-8 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
                <div className="flex items-end justify-between gap-4">
                  <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Your estimated starting point</h3>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold tabular-nums text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                    {totalRakatsRemaining(counts).toLocaleString()} rak&apos;ats
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {prayerSummaryLabels.map(([key, label]) => (
                    <div key={key} className="rounded-xl bg-white/70 px-3 py-3 dark:bg-slate-900/40">
                      <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">{label}</p>
                      <div className="mt-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                        <span className="text-sm font-semibold tabular-nums text-emerald-950 dark:text-white">
                          {counts[key].toLocaleString()} prayers
                        </span>
                        <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                          {(counts[key] * PRAYER_RAKATS[key]).toLocaleString()} rak&apos;ats
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-white/70 px-3 py-3 dark:bg-slate-900/40">
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Ramadan fasts</p>
                  <p className="mt-1 text-sm tabular-nums text-emerald-950 dark:text-white">{counts.fasts.toLocaleString()} fasts</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-8 min-h-[52px] w-full rounded-xl bg-emerald-700 px-5 text-base font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                Continue to choose my pace
              </button>
            </section>
          ) : (
            <section aria-labelledby="pace-heading">
              <h2 id="pace-heading" className="sr-only">Choose your payoff pace</h2>
              <div className="space-y-3">
                {[
                  ['gentle', 'Gentle 1x', '~3 extra minutes after each Farz'],
                  ['steady', 'Steady 2x', '~6 extra minutes after each Farz'],
                  ['custom', 'Custom target', 'Choose the number that fits your day'],
                ].map(([value, title, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaceMode(value as PaceMode)}
                    className={`flex min-h-[76px] w-full items-center justify-between rounded-2xl border px-5 py-4 text-left ${
                      paceMode === value
                        ? 'border-emerald-700 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40'
                        : 'border-slate-900/[0.08] bg-white hover:border-emerald-300 dark:border-white/[0.08] dark:bg-[#111827]'
                    }`}
                    aria-pressed={paceMode === value}
                  >
                    <span>
                      <span className="block text-base font-bold text-[var(--foreground)]">{title}</span>
                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">{description}</span>
                    </span>
                    <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${paceMode === value ? 'border-emerald-700 bg-emerald-700 ring-4 ring-emerald-100 dark:border-emerald-400 dark:bg-emerald-400 dark:ring-emerald-900' : 'border-slate-300 dark:border-slate-500'}`} />
                  </button>
                ))}
              </div>

              {paceMode === 'custom' && (
                <label className="mt-5 block rounded-2xl border border-slate-900/[0.08] bg-slate-50 p-5 dark:border-white/[0.08] dark:bg-slate-900/60">
                  <span className="flex items-center justify-between text-base font-bold text-[var(--foreground)]">
                    Daily qaza sets
                    <output className="text-xl tabular-nums text-emerald-700 dark:text-emerald-300">{customTarget}</output>
                  </span>
                  <input type="range" min="1" max="12" value={customTarget} onChange={(event) => setCustomTarget(Number(event.target.value))} className="mt-5 w-full accent-emerald-700" aria-label="Custom daily qaza sets" />
                </label>
              )}

              <div className="mt-7 rounded-2xl border-l-4 border-emerald-700 bg-emerald-50 p-5 dark:border-emerald-400 dark:bg-emerald-950/35">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Projected debt-free date</p>
                <p className="mt-2 text-3xl font-bold tracking-[-0.04em] tabular-nums text-emerald-950 dark:text-white">{displayDate(projection.estimatedCompletionDate)}</p>
                <p className="mt-2 text-base text-emerald-900 dark:text-emerald-100">{projection.dailyRecommendationText}</p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep(1)} className="min-h-[52px] rounded-xl px-5 font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Back</button>
                <button type="button" onClick={startPlan} className="min-h-[52px] flex-1 rounded-xl bg-emerald-700 px-5 text-base font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">Start My QazaTrack Plan</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
