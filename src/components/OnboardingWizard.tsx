'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQazaStore } from '../hooks/useQazaStore';
import {
  calculateAttendedJumuah,
  calculatePayoffProjection,
  calculateTotalFridays,
  estimateFromDuration,
  JUMUAH_PRESETS,
  PRAYER_RAKATS,
  totalRakatsRemaining,
} from '../lib/calculator';
import type { CalculationProfile, PaceMode, PrayerKey, QazaCounts } from '../types/qaza';

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

function scrollToTop() {
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function OnboardingWizard() {
  const { completeOnboarding, state, updatePreferences } = useQazaStore();
  const [step, setStep] = useState<1 | 2>(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scrollToTop();
  }, [step]);

  function handleGoToStep(targetStep: 1 | 2) {
    setStep(targetStep);
    scrollToTop();
  }
  const [mode, setMode] = useState<EstimationMode>('duration');
  const initialProfile = state.settings.calculationProfile ?? 'brother';
  const [profile, setProfile] = useState<CalculationProfile>(initialProfile);
  const [years, setYears] = useState(1);
  const [months, setMonths] = useState(0);
  // Sister Hayd exemption (defaults active strictly if Sister is initial profile)
  const [haydExemptionEnabled, setHaydExemptionEnabled] = useState(initialProfile === 'sister');
  const [haydExemptionDays, setHaydExemptionDays] = useState(7);
  // Brother Friday Jumu'ah preset & custom exemptions
  const [jumuahAttendance, setJumuahAttendance] = useState(0);
  const [customExemptionDays, setCustomExemptionDays] = useState(0);

  const [missedFasts, setMissedFasts] = useState(30);
  const [fastsManuallyEdited, setFastsManuallyEdited] = useState(false);
  const [exactCounts, setExactCounts] = useState<QazaCounts>(blankCounts);
  const [paceMode, setPaceMode] = useState<PaceMode>('gentle');
  const [customTarget, setCustomTarget] = useState(3);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (!fastsManuallyEdited) {
      setMissedFasts(years * 30);
    }
  }, [fastsManuallyEdited, years]);

  const totalMonths = Math.max(0, years * 12 + months);

  const hasActiveExemptions =
    mode === 'duration' &&
    (profile === 'brother'
      ? (totalMonths > 0 && jumuahAttendance > 0) || customExemptionDays > 0
      : totalMonths > 0 && haydExemptionEnabled && haydExemptionDays > 0);

  function handleProfileChange(newProfile: CalculationProfile) {
    setProfile(newProfile);
    updatePreferences({ calculationProfile: newProfile });
    if (newProfile === 'brother') {
      // Reset/zero out sister exemption so state is clean
      setHaydExemptionEnabled(false);
      setHaydExemptionDays(7);
    } else {
      // Reset/zero out brother exemption so state is clean
      setJumuahAttendance(0);
      setCustomExemptionDays(0);
      setHaydExemptionEnabled(true);
      setHaydExemptionDays(7);
    }
  }

  const counts = useMemo(
    () =>
      mode === 'duration'
        ? estimateFromDuration({
            years,
            months,
            profile,
            includeExemption: haydExemptionEnabled,
            monthlyExemptionDays: haydExemptionEnabled ? haydExemptionDays : 0,
            jumuahAttendance,
            customExemptionDays,
            missedFasts,
          })
        : exactCounts,
    [
      customExemptionDays,
      exactCounts,
      haydExemptionDays,
      haydExemptionEnabled,
      jumuahAttendance,
      missedFasts,
      mode,
      months,
      profile,
      years,
    ],
  );
  const target = paceMode === 'gentle' ? 1 : paceMode === 'steady' ? 2 : customTarget;
  const projection = useMemo(() => calculatePayoffProjection(counts, target, paceMode), [counts, target, paceMode]);

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
    scrollToTop();
    updatePreferences({ calculationProfile: profile });
    completeOnboarding(counts, paceMode, target);
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        scrollToTop();
      });
    }
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

              {/* Profile Selector at Top of Step 1 */}
              <div className="mb-7 space-y-3">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Calculation Profile
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-2">
                    <span>Saved locally on your device to tailor Fiqh exemptions.</span>
                    <a
                      href="https://github.com/imrandotenv/qazatrack"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
                    >
                      100% Open-Source — Verify on GitHub ↗
                    </a>
                  </p>
                </div>

                <div role="radiogroup" aria-label="Calculation Profile" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={profile === 'brother'}
                    onClick={() => handleProfileChange('brother')}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      profile === 'brother'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:ring-emerald-500/20'
                        : 'border-slate-900/[0.08] bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-white/[0.08] dark:bg-[#111827] dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">🧔</span>
                        <span className="text-base font-bold text-[var(--foreground)]">Brother</span>
                      </span>
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          profile === 'brother'
                            ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {profile === 'brother' && (
                          <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-950" />
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Includes Friday Jumu&apos;ah adjustment
                    </p>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={profile === 'sister'}
                    onClick={() => handleProfileChange('sister')}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                      profile === 'sister'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-950/40 dark:ring-emerald-500/20'
                        : 'border-slate-900/[0.08] bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-white/[0.08] dark:bg-[#111827] dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="text-xl" aria-hidden="true">🧕</span>
                        <span className="text-base font-bold text-[var(--foreground)]">Sister</span>
                      </span>
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          profile === 'sister'
                            ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {profile === 'sister' && (
                          <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-950" />
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Includes monthly Hayd Salah exemption
                    </p>
                  </button>
                </div>
              </div>

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

                  {profile === 'brother' ? (
                    <div className="space-y-4">
                      {/* Friday Jumu'ah Prayers Attended preset selector */}
                      <div className="rounded-2xl border border-slate-900/[0.08] bg-slate-50/60 p-4 dark:border-white/[0.08] dark:bg-slate-900/60">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="block text-base font-bold text-[var(--foreground)]">
                              Friday Jumu&apos;ah Prayers Attended
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">
                              Attending Friday Jumu&apos;ah replaces Dhuhr for that day, deducting it from your debt.
                            </span>
                          </div>
                          {totalMonths > 0 && jumuahAttendance > 0 && (
                            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-xs dark:border-emerald-800/60 dark:bg-emerald-950/80 dark:text-emerald-300">
                              −{calculateAttendedJumuah(totalMonths, jumuahAttendance)} Dhuhr
                            </span>
                          )}
                        </div>

                        {/* Mobile view: 2-row tactile pill grid (Row 1: grid-cols-3, Row 2: grid-cols-2) */}
                        <div className="mt-3 space-y-2 sm:hidden">
                          <div className="grid grid-cols-3 gap-2">
                            {JUMUAH_PRESETS.slice(0, 3).map((preset) => {
                              const isSelected = jumuahAttendance === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  aria-pressed={isSelected}
                                  aria-label={`${preset.label} attended — ${preset.sub} (${preset.description})`}
                                  title={`${preset.label} — ${preset.sub}: ${preset.description}`}
                                  onClick={() => setJumuahAttendance(preset.value)}
                                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all active:scale-[0.98] ${
                                    isSelected
                                      ? 'border border-emerald-700 bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-500 dark:text-slate-950 dark:ring-emerald-400/20'
                                      : 'border border-slate-900/[0.08] bg-white text-[var(--foreground)] hover:border-slate-300 hover:bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#111827] dark:hover:border-slate-700 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="text-sm font-semibold tracking-tight">{preset.label}</span>
                                  <span
                                    className={`mt-0.5 text-[11px] leading-tight whitespace-nowrap ${
                                      isSelected
                                        ? 'font-medium text-emerald-100 dark:text-slate-900'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {preset.sub}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {JUMUAH_PRESETS.slice(3, 5).map((preset) => {
                              const isSelected = jumuahAttendance === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  aria-pressed={isSelected}
                                  aria-label={`${preset.label} attended — ${preset.sub} (${preset.description})`}
                                  title={`${preset.label} — ${preset.sub}: ${preset.description}`}
                                  onClick={() => setJumuahAttendance(preset.value)}
                                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all active:scale-[0.98] ${
                                    isSelected
                                      ? 'border border-emerald-700 bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-500 dark:text-slate-950 dark:ring-emerald-400/20'
                                      : 'border border-slate-900/[0.08] bg-white text-[var(--foreground)] hover:border-slate-300 hover:bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#111827] dark:hover:border-slate-700 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="text-sm font-semibold tracking-tight">{preset.label}</span>
                                  <span
                                    className={`mt-0.5 text-[11px] leading-tight whitespace-nowrap ${
                                      isSelected
                                        ? 'font-medium text-emerald-100 dark:text-slate-900'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {preset.sub}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Desktop view (sm: and above): balanced, evenly spaced 5-column layout */}
                        <div className="mt-3 hidden sm:grid sm:grid-cols-5 sm:gap-2">
                          {JUMUAH_PRESETS.map((preset) => {
                            const isSelected = jumuahAttendance === preset.value;
                            return (
                              <button
                                key={preset.value}
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`${preset.label} attended — ${preset.sub} (${preset.description})`}
                                title={`${preset.label} — ${preset.sub}: ${preset.description}`}
                                onClick={() => setJumuahAttendance(preset.value)}
                                className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-3 text-center transition-all active:scale-[0.98] ${
                                  isSelected
                                    ? 'border border-emerald-700 bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/20 dark:border-emerald-500 dark:bg-emerald-500 dark:text-slate-950 dark:ring-emerald-400/20'
                                    : 'border border-slate-900/[0.08] bg-white text-[var(--foreground)] hover:border-slate-300 hover:bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#111827] dark:hover:border-slate-700 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="text-sm font-semibold tracking-tight">{preset.label}</span>
                                <span
                                  className={`mt-0.5 text-xs ${
                                    isSelected
                                      ? 'font-medium text-emerald-100 dark:text-slate-900'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {preset.sub}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Exemptions */}
                      <StepperCard
                        label="Custom Exemptions"
                        description="Days excused due to travel (Safar), severe illness, or other valid reasons."
                        value={customExemptionDays}
                        onChange={(value) => updateDuration(setCustomExemptionDays, value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Sisters' Monthly Exemption (Menstruation / Hayd) */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={haydExemptionEnabled}
                        onClick={() => setHaydExemptionEnabled((current) => !current)}
                        className="flex min-h-[72px] w-full items-center justify-between gap-4 rounded-2xl border border-slate-900/[0.08] bg-slate-50 px-4 text-left hover:border-emerald-300 dark:border-white/[0.08] dark:bg-slate-900/60"
                      >
                        <span>
                          <span className="block text-base font-bold text-[var(--foreground)]">
                            Sisters&apos; Monthly Exemption (Menstruation / Hayd)
                          </span>
                          <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                            Exempts Salah only. Missed Ramadan fasts must still be made up (Qaza).
                          </span>
                        </span>
                        <span
                          className={`relative h-7 w-12 shrink-0 rounded-full p-1 ${
                            haydExemptionEnabled
                              ? 'bg-emerald-700 dark:bg-emerald-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              haydExemptionEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>

                      {haydExemptionEnabled && (
                        <StepperCard
                          label="Exemption days per month"
                          description="Standard range is 5–10 days per monthly cycle (default 7 days)."
                          value={haydExemptionDays}
                          minimum={5}
                          maximum={10}
                          onChange={(value) => updateDuration(setHaydExemptionDays, value, 5, 10)}
                        />
                      )}
                    </div>
                  )}

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

              <div className="mt-8 rounded-2xl border border-emerald-900/[0.08] bg-emerald-50/70 p-5 dark:border-emerald-500/20 dark:bg-emerald-950/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white dark:bg-emerald-500 dark:text-slate-950"
                    >
                      ✓
                    </span>
                    <div>
                      <p className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                        Estimated peacefully
                      </p>
                      <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300/80">
                        We will focus on one manageable day at a time.
                      </p>
                    </div>
                  </div>
                  {hasActiveExemptions && (
                    <span className="inline-flex self-start sm:self-center items-center rounded-full bg-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                      Smart deductions applied
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-900/[0.08] dark:border-emerald-500/10 text-center">
                  <button
                    type="button"
                    onClick={() => setShowBreakdown((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
                    aria-expanded={showBreakdown}
                    aria-controls="exact-breakdown-panel"
                  >
                    <span>{showBreakdown ? 'Hide exact prayer breakdown' : 'Show exact prayer breakdown'}</span>
                    <span className="text-[10px]" aria-hidden="true">{showBreakdown ? '▲' : '▼'}</span>
                  </button>
                </div>

                {showBreakdown && (
                  <div id="exact-breakdown-panel" role="region" aria-label="Exact prayer breakdown" className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-white/80 px-3.5 py-2.5 dark:bg-slate-900/50">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total estimated backlog</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                        {totalRakatsRemaining(counts).toLocaleString()} rak&apos;ats
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {prayerSummaryLabels.map(([key, label]) => (
                        <div key={key} className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50">
                          <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{label}</p>
                          <div className="mt-1 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                            <span className="text-xs font-semibold tabular-nums text-emerald-950 dark:text-white">
                              {counts[key].toLocaleString()} prayers
                            </span>
                            <span className="text-[11px] tabular-nums text-slate-600 dark:text-slate-300">
                              {(counts[key] * PRAYER_RAKATS[key]).toLocaleString()} rak&apos;ats
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/50 flex items-center justify-between">
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Ramadan fasts</p>
                      <p className="text-xs font-semibold tabular-nums text-emerald-950 dark:text-white">{counts.fasts.toLocaleString()} fasts</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleGoToStep(2)}
                className="mt-8 min-h-[52px] w-full rounded-xl bg-emerald-700 px-5 text-base font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                Continue to choose my pace
              </button>
              <div className="mt-5 flex flex-col items-center justify-center gap-1 text-center text-xs text-slate-500 dark:text-slate-400">
                <span>100% Offline &amp; Private — Everything stays strictly inside your browser.</span>
                <a
                  href="https://github.com/imrandotenv/qazatrack"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-800 hover:underline dark:text-emerald-300"
                >
                  100% Open-Source — Verify on GitHub ↗
                </a>
              </div>
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
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">A Peaceful Daily Rhythm</p>
                <p className="mt-2 text-base font-medium leading-relaxed text-emerald-950 dark:text-emerald-100">{projection.dailyRecommendationText}</p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => handleGoToStep(1)} className="min-h-[52px] rounded-xl px-5 font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Back</button>
                <button type="button" onClick={startPlan} className="min-h-[52px] flex-1 rounded-xl bg-emerald-700 px-5 text-base font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">Start Day 1</button>
              </div>
              <div className="mt-5 flex flex-col items-center justify-center gap-1 text-center text-xs text-slate-500 dark:text-slate-400">
                <span>100% Offline &amp; Private — Everything stays strictly inside your browser.</span>
                <a
                  href="https://github.com/imrandotenv/qazatrack"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-800 hover:underline dark:text-emerald-300"
                >
                  100% Open-Source — Verify on GitHub ↗
                </a>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
