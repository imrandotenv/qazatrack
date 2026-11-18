'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useQazaStore } from '../hooks/useQazaStore';
import {
  calculateAttendedJumuah,
  calculatePayoffProjection,
  estimateFromDuration,
  JUMUAH_PRESETS,
} from '../lib/calculator';
import { useModalA11y } from '../hooks/useModalA11y';
import type { CalculationProfile, PaceMode, QazaCounts } from '../types/qaza';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  onRecalculate?: () => void;
  onOpenFeatureGuide?: () => void;
};

const debtFields: Array<[keyof QazaCounts, string]> = [
  ['fajr', 'Fajr'],
  ['dhuhr', 'Dhuhr'],
  ['asr', 'Asr'],
  ['maghrib', 'Maghrib'],
  ['isha', 'Isha'],
  ['witr', 'Witr'],
  ['fasts', 'Ramadan fasts'],
];

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(`${dateString}T12:00:00`),
  );
}

export function SettingsModal({ open, onClose, onRecalculate, onOpenFeatureGuide }: SettingsModalProps) {
  const {
    state,
    updatePace,
    updatePreferences,
    exportBackupJson,
    importBackupJson,
    resetAllData,
  } = useQazaStore();
  const [paceMode, setPaceMode] = useState<PaceMode>(state.paceMode);
  const [customTarget, setCustomTarget] = useState(
    state.paceMode === 'custom' ? state.dailyPrayersTarget : 3,
  );
  const [profile, setProfile] = useState<CalculationProfile>(
    state.settings.calculationProfile ?? 'brother',
  );
  const [editingDebt, setEditingDebt] = useState(false);
  const [debt, setDebt] = useState<QazaCounts>(state.initialDebt);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');

  // Duration recalculation state inside settings
  const [recalcMode, setRecalcMode] = useState<'duration' | 'exact'>('exact');
  const [recalcYears, setRecalcYears] = useState(1);
  const [recalcMonths, setRecalcMonths] = useState(0);
  const [recalcHaydEnabled, setRecalcHaydEnabled] = useState(
    (state.settings.calculationProfile ?? 'brother') === 'sister',
  );
  const [recalcHaydDays, setRecalcHaydDays] = useState(7);
  const [recalcJumuahAttendance, setRecalcJumuahAttendance] = useState(0);
  const [recalcCustomExemptionDays, setRecalcCustomExemptionDays] = useState(0);

  const target = paceMode === 'gentle' ? 1 : paceMode === 'steady' ? 2 : customTarget;

  useModalA11y(open, onClose);
  useEffect(() => {
    if (open && !editingDebt) {
      setPaceMode(state.paceMode);
      setCustomTarget(state.paceMode === 'custom' ? state.dailyPrayersTarget : 3);
      setDebt(state.initialDebt);
      const activeProfile = state.settings.calculationProfile ?? 'brother';
      setProfile(activeProfile);
      if (activeProfile === 'brother') {
        setRecalcHaydEnabled(false);
        setRecalcHaydDays(7);
      } else {
        setRecalcJumuahAttendance(0);
        setRecalcCustomExemptionDays(0);
        setRecalcHaydEnabled(true);
        setRecalcHaydDays(7);
      }
    }
  }, [editingDebt, open, state.initialDebt, state.dailyPrayersTarget, state.paceMode, state.settings.calculationProfile]);

  function handleProfileChange(newProfile: CalculationProfile) {
    setProfile(newProfile);
    updatePreferences({ calculationProfile: newProfile });
    if (newProfile === 'brother') {
      setRecalcHaydEnabled(false);
      setRecalcHaydDays(7);
    } else {
      setRecalcJumuahAttendance(0);
      setRecalcCustomExemptionDays(0);
      setRecalcHaydEnabled(true);
      setRecalcHaydDays(7);
    }
  }

  const durationCalculatedDebt = useMemo(() => {
    return estimateFromDuration({
      years: recalcYears,
      months: recalcMonths,
      profile,
      includeExemption: recalcHaydEnabled,
      monthlyExemptionDays: recalcHaydEnabled ? recalcHaydDays : 0,
      jumuahAttendance: recalcJumuahAttendance,
      customExemptionDays: recalcCustomExemptionDays,
      missedFasts: recalcYears * 30,
    });
  }, [
    profile,
    recalcCustomExemptionDays,
    recalcHaydDays,
    recalcHaydEnabled,
    recalcJumuahAttendance,
    recalcMonths,
    recalcYears,
  ]);

  const projection = useMemo(
    () =>
      calculatePayoffProjection(
        {
          fajr: Math.max(0, state.initialDebt.fajr - state.cleared.fajr),
          dhuhr: Math.max(0, state.initialDebt.dhuhr - state.cleared.dhuhr),
          asr: Math.max(0, state.initialDebt.asr - state.cleared.asr),
          maghrib: Math.max(0, state.initialDebt.maghrib - state.cleared.maghrib),
          isha: Math.max(0, state.initialDebt.isha - state.cleared.isha),
          witr: Math.max(0, state.initialDebt.witr - state.cleared.witr),
          fasts: Math.max(0, state.initialDebt.fasts - state.cleared.fasts),
        },
        target,
        paceMode,
      ),
    [state.cleared, state.initialDebt, target, paceMode],
  );

  if (!open) {
    return null;
  }

  function downloadBackup() {
    const blob = new Blob([exportBackupJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qazatrack-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('This file could not be read. Please choose a JSON backup file.');
        return;
      }
      try {
        importBackupJson(reader.result);
        setError('');
      } catch (restoreError) {
        setError(restoreError instanceof Error ? restoreError.message : 'Backup restore failed.');
      }
    };
    reader.onerror = () => setError('This file could not be read. Please try again.');
    reader.readAsText(file);
    event.target.value = '';
  }

  function savePace() {
    updatePace(paceMode, target);
  }

  function selectPace(nextPace: PaceMode) {
    setPaceMode(nextPace);
    if (nextPace === 'gentle') {
      setCustomTarget(1);
    } else if (nextPace === 'steady') {
      setCustomTarget(2);
    }
  }

  function saveDebt() {
    const adjustedCleared: QazaCounts = {
      fajr: Math.min(state.cleared.fajr, debt.fajr),
      dhuhr: Math.min(state.cleared.dhuhr, debt.dhuhr),
      asr: Math.min(state.cleared.asr, debt.asr),
      maghrib: Math.min(state.cleared.maghrib, debt.maghrib),
      isha: Math.min(state.cleared.isha, debt.isha),
      witr: Math.min(state.cleared.witr, debt.witr),
      fasts: Math.min(state.cleared.fasts, debt.fasts),
    };
    importBackupJson(JSON.stringify({ ...state, initialDebt: debt, cleared: adjustedCleared }));
    setEditingDebt(false);
  }

  function updateDebt(key: keyof QazaCounts, value: string) {
    const parsed = Number(value);
    setDebt((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  }

  function resetProgress() {
    resetAllData();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('qazatrack_feature_guide_seen');
    }
    setConfirmReset(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl bg-[var(--card-background)] p-5 shadow-2xl animate-in fade-in zoom-in-[0.98] duration-150 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="settings-title" className="text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)]">
              Settings &amp; backup
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-2">
              <span>Everything stays on this device unless you export it.</span>
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-h-[44px] min-w-[44px] rounded-lg text-2xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        {/* Calculation Profile */}
        <section className="mt-7" aria-labelledby="profile-title">
          <div className="space-y-1">
            <h3 id="profile-title" className="font-bold text-[var(--foreground)]">
              Calculation Profile
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-2">
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

          <div role="radiogroup" aria-label="Calculation Profile" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              role="radio"
              aria-checked={profile === 'brother'}
              onClick={() => handleProfileChange('brother')}
              className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                profile === 'brother'
                  ? 'border-emerald-700 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/20 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-400/20'
                  : 'border-slate-200 bg-[var(--card-background)] hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <div>
                <span className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">🧔</span>
                  <span className="font-bold text-[var(--foreground)]">Brother</span>
                </span>
                <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                  Includes Friday Jumu&apos;ah adjustment
                </span>
              </div>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  profile === 'brother'
                    ? 'border-emerald-700 bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {profile === 'brother' && (
                  <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-950" />
                )}
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={profile === 'sister'}
              onClick={() => handleProfileChange('sister')}
              className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                profile === 'sister'
                  ? 'border-emerald-700 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-600/20 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-400/20'
                  : 'border-slate-200 bg-[var(--card-background)] hover:border-slate-300 dark:border-slate-700'
              }`}
            >
              <div>
                <span className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">🧕</span>
                  <span className="font-bold text-[var(--foreground)]">Sister</span>
                </span>
                <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">
                  Includes monthly Hayd Salah exemption
                </span>
              </div>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  profile === 'sister'
                    ? 'border-emerald-700 bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {profile === 'sister' && (
                  <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-950" />
                )}
              </span>
            </button>
          </div>
        </section>

        <section className="mt-7" aria-labelledby="pace-title">
          <h3 id="pace-title" className="font-bold text-[var(--foreground)]">Daily payoff pace</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              ['gentle', 'Gentle 1x'],
              ['steady', 'Steady 2x'],
              ['custom', 'Custom'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectPace(value as PaceMode)}
                aria-pressed={paceMode === value}
                className={`min-h-[64px] rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${
                  paceMode === value
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-slate-200 text-[var(--foreground)] hover:border-emerald-300 dark:border-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {paceMode === 'custom' && (
            <label className="mt-4 block text-sm font-semibold text-[var(--foreground)]">
              Daily qaza sets: {customTarget}
              <input
                type="range"
                min="1"
                max="12"
                value={customTarget}
                onChange={(event) => {
                  setCustomTarget(Number(event.target.value));
                  setPaceMode('custom');
                }}
                className="mt-3 w-full accent-emerald-700"
              />
            </label>
          )}
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            Projected debt-free date: <strong>{formatDate(projection.estimatedCompletionDate)}</strong>
          </div>
          <button
            type="button"
            onClick={savePace}
            className="mt-4 min-h-[44px] rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            Save pace
          </button>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="preferences-title">
          <h3 id="preferences-title" className="font-bold text-[var(--foreground)]">Display preferences</h3>
          <div className="mt-3 space-y-3">
            <button
              type="button"
              role="switch"
              aria-checked={state.settings.showRakats}
              onClick={() => updatePreferences({ showRakats: !state.settings.showRakats })}
              className="flex min-h-[60px] w-full items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 text-left hover:border-emerald-300 dark:border-slate-700"
            >
              <span className="font-semibold text-[var(--foreground)]">Show Rak&apos;at Counts</span>
              <span className={`relative h-7 w-12 shrink-0 rounded-full p-1 ${state.settings.showRakats ? 'bg-emerald-700 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${state.settings.showRakats ? 'translate-x-5' : 'translate-x-0'}`} />
              </span>
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={state.settings.includeWitr}
              onClick={() => updatePreferences({ includeWitr: !state.settings.includeWitr })}
              className="flex min-h-[60px] w-full items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 text-left hover:border-emerald-300 dark:border-slate-700"
            >
              <span className="font-semibold text-[var(--foreground)]">Include Witr Prayer</span>
              <span className={`relative h-7 w-12 shrink-0 rounded-full p-1 ${state.settings.includeWitr ? 'bg-emerald-700 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${state.settings.includeWitr ? 'translate-x-5' : 'translate-x-0'}`} />
              </span>
            </button>
          </div>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="backup-title">
          <h3 id="backup-title" className="font-bold text-[var(--foreground)]">Private local backup</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-2">
            <span>Export a copy before switching phones or clearing browser data.</span>
            <a
              href="https://github.com/imrandotenv/qazatrack"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:underline dark:text-emerald-300"
            >
              100% Open-Source — Verify on GitHub ↗
            </a>
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={downloadBackup}
              className="min-h-[48px] flex-1 rounded-xl border border-emerald-700 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              Download JSON Backup
            </button>
            <label className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-bold text-[var(--foreground)] hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800">
              Restore from JSON File
              <input type="file" accept="application/json,.json" onChange={restoreBackup} className="sr-only" />
            </label>
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300" role="alert">{error}</p>}
        </section>

        <section className="mt-8 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="debt-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="debt-title" className="font-bold text-[var(--foreground)]">Initial debt</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Recalculate if your original estimate needs correcting.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDebt(state.initialDebt);
                setEditingDebt((current) => !current);
                onRecalculate?.();
              }}
              className="min-h-[44px] whitespace-nowrap rounded-lg px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              {editingDebt ? 'Cancel' : 'Recalculate / Edit'}
            </button>
          </div>
          {editingDebt && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setRecalcMode('exact')}
                  className={`min-h-[40px] rounded-lg px-3 text-xs font-bold ${
                    recalcMode === 'exact'
                      ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Exact Counts
                </button>
                <button
                  type="button"
                  onClick={() => setRecalcMode('duration')}
                  className={`min-h-[40px] rounded-lg px-3 text-xs font-bold ${
                    recalcMode === 'duration'
                      ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  By Years &amp; Profile
                </button>
              </div>

              {recalcMode === 'duration' ? (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-[var(--foreground)]">
                      Years
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={recalcYears}
                        onChange={(e) => setRecalcYears(Math.max(0, Number(e.target.value) || 0))}
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-[var(--card-background)] px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700 dark:border-slate-700"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[var(--foreground)]">
                      Months
                      <input
                        type="number"
                        min="0"
                        max="11"
                        value={recalcMonths}
                        onChange={(e) => setRecalcMonths(Math.min(11, Math.max(0, Number(e.target.value) || 0)))}
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-[var(--card-background)] px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700 dark:border-slate-700"
                      />
                    </label>
                  </div>

                  {profile === 'brother' ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="block text-xs sm:text-sm font-semibold text-[var(--foreground)]">
                              Friday Jumu&apos;ah Prayers Attended
                            </span>
                            <span className="mt-0.5 block text-[11px] text-slate-600 dark:text-slate-300">
                              Replaces Dhuhr for attended Fridays, deducting from debt.
                            </span>
                          </div>
                          {recalcYears * 12 + recalcMonths > 0 && recalcJumuahAttendance > 0 && (
                            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 shadow-xs dark:border-emerald-800/60 dark:bg-emerald-950/80 dark:text-emerald-300">
                              −{calculateAttendedJumuah(recalcYears * 12 + recalcMonths, recalcJumuahAttendance)} Dhuhr
                            </span>
                          )}
                        </div>

                        {/* Mobile view: 2-row tactile pill grid (Row 1: grid-cols-3, Row 2: grid-cols-2) */}
                        <div className="mt-2.5 space-y-2 sm:hidden">
                          <div className="grid grid-cols-3 gap-2">
                            {JUMUAH_PRESETS.slice(0, 3).map((preset) => {
                              const isSelected = recalcJumuahAttendance === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  aria-pressed={isSelected}
                                  aria-label={`${preset.label} attended — ${preset.sub} (${preset.description})`}
                                  title={`${preset.label} — ${preset.sub}: ${preset.description}`}
                                  onClick={() => setRecalcJumuahAttendance(preset.value)}
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
                              const isSelected = recalcJumuahAttendance === preset.value;
                              return (
                                <button
                                  key={preset.value}
                                  type="button"
                                  aria-pressed={isSelected}
                                  aria-label={`${preset.label} attended — ${preset.sub} (${preset.description})`}
                                  title={`${preset.label} — ${preset.sub}: ${preset.description}`}
                                  onClick={() => setRecalcJumuahAttendance(preset.value)}
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
                        <div className="mt-2.5 hidden sm:grid sm:grid-cols-5 sm:gap-2">
                          {JUMUAH_PRESETS.map((preset) => {
                            const isSelected = recalcJumuahAttendance === preset.value;
                            return (
                              <button
                                key={preset.value}
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`${preset.label} attended — ${preset.sub} (${preset.description})`}
                                title={`${preset.label} — ${preset.sub}: ${preset.description}`}
                                onClick={() => setRecalcJumuahAttendance(preset.value)}
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

                      <label className="block text-xs font-semibold text-[var(--foreground)]">
                        Custom Exemptions (Days)
                        <input
                          type="number"
                          min="0"
                          value={recalcCustomExemptionDays}
                          onChange={(e) => setRecalcCustomExemptionDays(Math.max(0, Number(e.target.value) || 0))}
                          className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-[var(--card-background)] px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-700 dark:border-slate-700"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={recalcHaydEnabled}
                        onClick={() => setRecalcHaydEnabled((c) => !c)}
                        className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[var(--card-background)] px-3 text-left dark:border-slate-700"
                      >
                        <span className="text-xs font-semibold text-[var(--foreground)]">
                          Sisters&apos; Monthly Exemption (Menstruation / Hayd)
                        </span>
                        <span
                          className={`relative h-6 w-10 shrink-0 rounded-full p-0.5 ${
                            recalcHaydEnabled ? 'bg-emerald-700 dark:bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                              recalcHaydEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>

                      {recalcHaydEnabled && (
                        <div className="space-y-1">
                          <label htmlFor="recalc-hayd-days" className="block text-xs font-semibold text-[var(--foreground)]">
                            Exemption days per month (5–10, default 7)
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={recalcHaydDays <= 5}
                              onClick={() => setRecalcHaydDays((d) => Math.max(5, d - 1))}
                              aria-label="Decrease exemption days per month"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-[var(--card-background)] text-lg font-bold text-[var(--foreground)] hover:bg-slate-100 disabled:opacity-35 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              −
                            </button>
                            <input
                              id="recalc-hayd-days"
                              type="number"
                              min="5"
                              max="10"
                              value={recalcHaydDays}
                              onChange={(e) =>
                                setRecalcHaydDays(Math.min(10, Math.max(5, Number(e.target.value) || 7)))
                              }
                              className="min-h-[36px] w-16 rounded-lg border border-slate-200 bg-[var(--card-background)] px-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-700 dark:border-slate-700"
                            />
                            <button
                              type="button"
                              disabled={recalcHaydDays >= 10}
                              onClick={() => setRecalcHaydDays((d) => Math.min(10, d + 1))}
                              aria-label="Increase exemption days per month"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-[var(--card-background)] text-lg font-bold text-[var(--foreground)] hover:bg-slate-100 disabled:opacity-35 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              +
                            </button>
                            <span className="text-xs text-slate-500 dark:text-slate-400">days/month</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setDebt(durationCalculatedDebt)}
                    className="w-full rounded-lg bg-emerald-100 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-200"
                  >
                    Apply Duration Calculation to Debt Fields ↓
                  </button>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {debtFields.map(([key, label]) => (
                  <label key={key} className="text-sm font-semibold text-[var(--foreground)]">
                    {label}
                    <input
                      type="number"
                      min="0"
                      value={debt[key]}
                      onChange={(event) => updateDebt(key, event.target.value)}
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-200 bg-[var(--card-background)] px-3 text-base outline-none focus:ring-2 focus:ring-emerald-700 dark:border-slate-700"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={saveDebt}
                className="mt-4 min-h-[44px] rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
              >
                Save initial debt
              </button>
            </div>
          )}
        </section>

        <section className="mt-8 border-t border-slate-200 pt-7 dark:border-slate-700" aria-labelledby="guide-title">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 id="guide-title" className="font-bold text-[var(--foreground)]">Feature guide</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Review how one-tap logging, daily pace, milestones, and offline backups work.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFeatureGuide?.();
              }}
              className="min-h-[44px] shrink-0 rounded-xl border border-slate-300 px-4 text-sm font-bold text-[var(--foreground)] hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-600 dark:hover:border-emerald-400 dark:hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            >
              Open Feature Guide
            </button>
          </div>
        </section>

        <section className="mt-8 border-t border-red-100 pt-7 dark:border-red-900/50" aria-labelledby="reset-title">
          <h3 id="reset-title" className="font-bold text-red-800 dark:text-red-300">Reset all progress</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">This removes your plan and local backup from this device.</p>
          <label className="mt-3 flex items-start gap-3 text-sm text-[var(--foreground)]">
            <input type="checkbox" checked={confirmReset} onChange={(event) => setConfirmReset(event.target.checked)} className="mt-1 h-4 w-4 accent-red-700" />
            <span>I understand that this cannot be undone without a backup.</span>
          </label>
          <button
            type="button"
            disabled={!confirmReset}
            onClick={resetProgress}
            className="mt-4 min-h-[44px] rounded-lg border border-red-300 px-4 text-sm font-bold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            Reset All Progress
          </button>
        </section>
      </section>
    </div>
  );
}
