'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { useQazaStore } from '../hooks/useQazaStore';
import { calculatePayoffProjection } from '../lib/calculator';
import { useModalA11y } from '../hooks/useModalA11y';
import type { PaceMode, QazaCounts } from '../types/qaza';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  onRecalculate?: () => void;
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

export function SettingsModal({ open, onClose, onRecalculate }: SettingsModalProps) {
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
  const [editingDebt, setEditingDebt] = useState(false);
  const [debt, setDebt] = useState<QazaCounts>(state.initialDebt);
  const [confirmReset, setConfirmReset] = useState(false);
  const [error, setError] = useState('');
  const target = paceMode === 'gentle' ? 1 : paceMode === 'steady' ? 2 : customTarget;

  useModalA11y(open, onClose);
  useEffect(() => {
    if (open && !editingDebt) {
      setPaceMode(state.paceMode);
      setCustomTarget(state.paceMode === 'custom' ? state.dailyPrayersTarget : 3);
      setDebt(state.initialDebt);
    }
  }, [editingDebt, open, state.initialDebt, state.dailyPrayersTarget, state.paceMode]);

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
      ),
    [state.cleared, state.initialDebt, target],
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
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Everything stays on this device unless you export it.</p>
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
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Export a copy before switching phones or clearing browser data.</p>
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
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            </>
          )}
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
