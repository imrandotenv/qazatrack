'use client';

import { useMemo, useState } from 'react';
import {
  calculatePayoffProjection,
  totalClearedPrayers,
  totalRakatsRemaining,
  totalRemainingPrayers,
} from '../lib/calculator';
import type { QazaStore } from '../hooks/useQazaStore';
import type { PrayerKey, QazaCounts, TodayPrayerStatus } from '../types/qaza';
import { PrayerCard } from './PrayerCard';
import { ReferralModal } from './ReferralModal';
import { MilestoneModal } from './MilestoneModal';

const prayerCards: ReadonlyArray<{
  key: PrayerKey;
  label: string;
  subtitle: string;
  rakats: number;
  tag: string;
}> = [
  { key: 'fajr', label: 'Fajr', subtitle: "2 Rak'at Farz", rakats: 2, tag: "2 Rak'at" },
  { key: 'dhuhr', label: 'Dhuhr', subtitle: "4 Rak'at Farz", rakats: 4, tag: "4 Rak'at" },
  { key: 'asr', label: 'Asr', subtitle: "4 Rak'at Farz", rakats: 4, tag: "4 Rak'at" },
  { key: 'maghrib', label: 'Maghrib', subtitle: "3 Rak'at Farz", rakats: 3, tag: "3 Rak'at" },
  { key: 'isha', label: 'Isha', subtitle: "4 Rak'at Farz", rakats: 4, tag: "4 Rak'at" },
  { key: 'witr', label: 'Witr', subtitle: '3 Rak’at Wajib', rakats: 3, tag: "3 Rak'at Wajib" },
];

type DashboardProps = Pick<
  QazaStore,
  | 'state'
  | 'hydrated'
  | 'batchUndoState'
  | 'logSingleItem'
  | 'logFullDaySet'
  | 'undoLastAction'
  | 'dismissUndoToast'
  | 'todaySummary'
  | 'setTodayPrayerStatus'
  | 'incrementInviteCount'
> & {
  settings: QazaStore['state']['settings'];
  onOpenMilestone?: () => void;
};

function totalTrackedItems(counts: QazaCounts): number {
  return totalRemainingPrayers(counts) + Math.max(0, counts.fasts);
}

function formatCompletionDate(dateString: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateString}T12:00:00`));
}

const statusLabel: Record<TodayPrayerStatus, string> = {
  pending: 'Pending',
  prayed: 'Prayed ✓',
  missed: 'Missed !',
};

export function Dashboard({
  state,
  hydrated,
  batchUndoState,
  logSingleItem,
  logFullDaySet,
  undoLastAction,
  dismissUndoToast,
  todaySummary,
  setTodayPrayerStatus,
  incrementInviteCount,
  settings,
  onOpenMilestone,
}: DashboardProps) {
  const [referralOpen, setReferralOpen] = useState(false);
  const [localMilestoneOpen, setLocalMilestoneOpen] = useState(false);

  const visiblePrayerCards = settings.includeWitr ? prayerCards : prayerCards.slice(0, 5);
  const activeMissed = useMemo<QazaCounts>(() => {
    const counts = {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
      witr: 0,
      fasts: 0,
    };
    for (const entry of Object.values(state.dailyLogs)) {
      for (const { key } of prayerCards) {
        if (entry.presentStatus[key] === 'missed') {
          counts[key] += 1;
        }
      }
    }
    return counts;
  }, [state.dailyLogs]);

  const remaining = useMemo<QazaCounts>(
    () => ({
      fajr: Math.max(0, state.initialDebt.fajr + activeMissed.fajr - state.cleared.fajr),
      dhuhr: Math.max(0, state.initialDebt.dhuhr + activeMissed.dhuhr - state.cleared.dhuhr),
      asr: Math.max(0, state.initialDebt.asr + activeMissed.asr - state.cleared.asr),
      maghrib: Math.max(0, state.initialDebt.maghrib + activeMissed.maghrib - state.cleared.maghrib),
      isha: Math.max(0, state.initialDebt.isha + activeMissed.isha - state.cleared.isha),
      witr: Math.max(0, state.initialDebt.witr + activeMissed.witr - state.cleared.witr),
      fasts: Math.max(0, state.initialDebt.fasts - state.cleared.fasts),
    }),
    [activeMissed, state.cleared, state.initialDebt],
  );

  const debtWithMissed = useMemo<QazaCounts>(
    () => ({
      fajr: state.initialDebt.fajr + activeMissed.fajr,
      dhuhr: state.initialDebt.dhuhr + activeMissed.dhuhr,
      asr: state.initialDebt.asr + activeMissed.asr,
      maghrib: state.initialDebt.maghrib + activeMissed.maghrib,
      isha: state.initialDebt.isha + activeMissed.isha,
      witr: state.initialDebt.witr + activeMissed.witr,
      fasts: state.initialDebt.fasts,
    }),
    [activeMissed, state.initialDebt],
  );

  const completed = useMemo(() => totalTrackedItems(state.cleared), [state.cleared]);
  const total = useMemo(() => totalTrackedItems(debtWithMissed), [debtWithMissed]);
  const percentage = total === 0 ? 100 : Math.min(100, Math.max(0, (completed / total) * 100));
  const remainingTotal = useMemo(() => totalTrackedItems(remaining), [remaining]);
  const isAllCompleted = total > 0 && remainingTotal === 0;

  const projection = calculatePayoffProjection(remaining, state.dailyPrayersTarget);
  const ringRadius = 47;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const fullSetsClearedToday = Math.min(
    ...visiblePrayerCards.map(({ key }) => todaySummary.breakdown[key].cleared),
  );

  function clearDailySet() {
    if (settings.includeWitr) {
      logFullDaySet();
      return;
    }
    for (const { key } of visiblePrayerCards) {
      logSingleItem(key, 1);
    }
  }

  function markAllRemainingPrayed() {
    for (const { key } of visiblePrayerCards) {
      if (todaySummary.presentStatus[key] !== 'prayed') {
        setTodayPrayerStatus(key, 'prayed');
      }
    }
  }

  function handleOpenMilestone() {
    if (onOpenMilestone) {
      onOpenMilestone();
    } else {
      setLocalMilestoneOpen(true);
    }
  }

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
        <div className="rounded-2xl border border-slate-200 bg-[var(--card-background)] p-6 text-slate-600 dark:border-slate-700 dark:text-slate-300 sm:p-8">
          Loading your QazaTrack plan…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-8 pb-36 sm:px-6 sm:py-12">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[#111827] sm:p-8" aria-labelledby="overview-heading">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(220px,0.8fr)_1.2fr]">
          <div className="flex items-center gap-6">
            <div className="relative h-36 w-36 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                <circle cx="56" cy="56" r={ringRadius} fill="none" stroke="currentColor" strokeWidth="9" className="text-slate-100 dark:text-slate-800" />
                <circle cx="56" cy="56" r={ringRadius} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeDasharray={ringCircumference} strokeDashoffset={ringCircumference * (1 - percentage / 100)} className="text-emerald-600 transition-[stroke-dashoffset] duration-500 ease-out dark:text-emerald-400" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tracking-[-0.04em] tabular-nums text-[var(--foreground)]">{Math.round(percentage)}%</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">complete</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Your QazaTrack progress</p>
              <h1 id="overview-heading" className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl">One steady day at a time.</h1>
              <span className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-sm font-bold tabular-nums text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
                {isAllCompleted
                  ? 'All Qaza prayers fulfilled! Alhamdulillah'
                  : `Debt-free by ${formatCompletionDate(projection.estimatedCompletionDate)}`}
              </span>
            </div>
          </div>
          <div className={`grid gap-3 ${settings.showRakats ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-sm text-slate-600 dark:text-slate-300">Prayers cleared</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{totalClearedPrayers(state.cleared).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-sm text-slate-600 dark:text-slate-300">Prayers remaining</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{totalRemainingPrayers(remaining).toLocaleString()}</p>
            </div>
            {settings.showRakats && (
              <div className="col-span-2 sm:col-span-1 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                <p className="text-sm text-slate-600 dark:text-slate-300">Rak&apos;ats remaining</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">{totalRakatsRemaining(remaining).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[#111827]" aria-labelledby="check-in-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="check-in-heading" className="text-lg font-bold text-[var(--foreground)]">Today&apos;s Salah Check-in</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose Prayed or Missed for each prayer.</p>
          </div>
          <button type="button" onClick={markAllRemainingPrayed} className="min-h-[44px] rounded-xl border border-emerald-700 px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
            Mark All Remaining Prayed
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {visiblePrayerCards.map(({ key, label }) => {
            const status = todaySummary.presentStatus[key];
            return (
              <div
                key={key}
                className="flex min-h-[148px] flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--foreground)]">{label}</span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {statusLabel[status]}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTodayPrayerStatus(key, status === 'prayed' ? 'pending' : 'prayed')}
                      aria-pressed={status === 'prayed'}
                      className={`min-h-[48px] rounded-xl border px-2 text-xs font-bold active:scale-95 transition-all ${
                        status === 'prayed'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                          : 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      Prayed ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setTodayPrayerStatus(key, status === 'missed' ? 'pending' : 'missed')}
                      aria-pressed={status === 'missed'}
                      className={`min-h-[48px] rounded-xl border px-2 text-xs font-bold active:scale-95 transition-all ${
                        status === 'missed'
                          ? 'border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'
                          : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-800/60 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/40'
                      }`}
                    >
                      Missed !
                    </button>
                  </div>
                </div>
                <div className="flex min-h-[24px] items-center justify-center pt-2">
                  {status !== 'pending' ? (
                    <button
                      type="button"
                      onClick={() => setTodayPrayerStatus(key, 'pending')}
                      className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Reset
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400/60 dark:text-slate-600">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
          <span className="font-semibold text-emerald-700 dark:text-emerald-300">{todaySummary.prayedTodayCount} Prayed</span>
          <span className="font-semibold text-amber-700 dark:text-amber-300">{todaySummary.missedTodayCount} Missed Today</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{todaySummary.clearedTodayPrayers} Old Qaza Cleared</span>
        </div>
      </section>

      <section className="mt-6">
        {isAllCompleted ? (
          <div className="rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-50/90 via-emerald-50/80 to-emerald-100/70 p-6 text-center shadow-[0_4px_20px_-4px_rgba(4,120,87,0.15)] dark:border-amber-400/50 dark:from-amber-950/30 dark:via-emerald-950/40 dark:to-slate-900 sm:p-8">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-3xl text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
              ✦
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950 dark:text-emerald-100 sm:text-3xl">
              Alhamdulillah! All Qaza Fulfilled
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-base leading-7 text-emerald-900/90 dark:text-emerald-200">
              May Allah accept every prayer and fast you made up with patience and consistency.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleOpenMilestone}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 text-base font-bold text-white shadow-md hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
              >
                <span>Generate Completion Milestone Card</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={clearDailySet}
            className="min-h-[54px] w-full rounded-2xl bg-emerald-700 px-5 py-3 text-base font-bold text-white shadow-[0_8px_20px_rgba(4,120,87,0.18)] hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
          >
            <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span>
                Clear 1 Full Day Set (+1 All {visiblePrayerCards.length} Prayers
                {settings.showRakats ? ` · ${settings.includeWitr ? 20 : 17} Rak'ats` : ''})
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-sm tabular-nums">
                Today: {fullSetsClearedToday} / {state.dailyPrayersTarget} sets
              </span>
            </span>
          </button>
        )}
      </section>

      <section className="mt-10" aria-labelledby="prayers-heading">
        <div className="mb-4">
          <h2 id="prayers-heading" className="text-xl font-bold tracking-[-0.025em] text-[var(--foreground)]">Prayers</h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">Mark old qaza cleared from your backlog.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visiblePrayerCards.map(({ key, label, subtitle, rakats, tag }) => (
            <PrayerCard
              key={key}
              label={label}
              subtitle={subtitle}
              rakats={rakats}
              tag={tag}
              showRakats={settings.showRakats}
              cleared={state.cleared[key]}
              total={state.initialDebt[key] + activeMissed[key]}
              onIncrement={() => logSingleItem(key, 1)}
              onDecrement={() => logSingleItem(key, -1)}
            />
          ))}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="fasts-heading">
        <h2 id="fasts-heading" className="mb-4 text-xl font-bold tracking-[-0.025em] text-[var(--foreground)]">Ramadan Fasts</h2>
        <PrayerCard
          label="Ramadan Fasts"
          subtitle="A full day fast"
          rakats={0}
          tag="Full Day"
          showRakats={settings.showRakats}
          isFast
          cleared={state.cleared.fasts}
          total={state.initialDebt.fasts}
          onIncrement={() => logSingleItem('fasts', 1)}
          onDecrement={() => logSingleItem('fasts', -1)}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50 p-5 dark:border-emerald-800/60 dark:bg-emerald-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Share as Sadaqah Jariyah</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900 dark:text-emerald-200">
              Invite a friend or family member to start their Qaza journey — earn ongoing reward for every prayer they make up.
            </p>
          </div>
          <button type="button" onClick={() => setReferralOpen(true)} className="min-h-[48px] shrink-0 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
            Invite Friends
          </button>
        </div>
      </section>

      <details id="qaza-guidelines" className="mt-10 rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[#111827]">
        <summary className="cursor-pointer list-none px-5 py-5 text-base font-bold text-[var(--foreground)]">
          <span className="flex items-center justify-between gap-4">Quick Qaza Guidelines <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">⌄</span></span>
        </summary>
        <ul className="space-y-2 border-t border-slate-100 px-5 pb-5 pt-4 text-base leading-7 text-slate-700 dark:border-slate-800 dark:text-slate-200">
          <li>Only Farz prayers and Witr are made up.</li>
          <li>Avoid praying qaza during Makruh times.</li>
          <li>Safar prayers remain 2 rak&apos;ats.</li>
        </ul>
      </details>

      {batchUndoState && (
        <div
          className="fixed bottom-5 inset-x-3 z-50 mx-auto flex max-w-md items-center justify-between gap-2.5 rounded-2xl bg-slate-900/95 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 dark:bg-slate-100/95 dark:text-slate-900 sm:bottom-6 sm:inset-x-4 sm:max-w-lg sm:px-4 sm:py-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
          role="status"
        >
          <span className="min-w-0 truncate text-xs sm:text-sm font-medium">Logged {batchUndoState.label}</span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={undoLastAction}
              className="min-h-[38px] rounded-lg px-2.5 text-xs sm:text-sm font-bold text-emerald-300 underline underline-offset-4 hover:text-emerald-200 active:scale-95 dark:text-emerald-700 dark:hover:text-emerald-800"
            >
              {batchUndoState.actionCount === 1 ? 'Undo' : `Undo All (${batchUndoState.actionCount})`}
            </button>
            <button
              type="button"
              onClick={dismissUndoToast}
              aria-label="Dismiss undo notification"
              className="min-h-[38px] min-w-[38px] rounded-lg text-lg text-slate-300 hover:bg-white/10 active:scale-95 dark:text-slate-600 dark:hover:bg-slate-900/10"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <ReferralModal
        open={referralOpen}
        referralCode={state.referralCode}
        invitesSharedCount={state.invitesSharedCount}
        onClose={() => setReferralOpen(false)}
        onInviteShared={incrementInviteCount}
      />
      <MilestoneModal
        open={localMilestoneOpen}
        onClose={() => setLocalMilestoneOpen(false)}
        clearedPrayers={totalClearedPrayers(state.cleared)}
        completionPercentage={Math.round(percentage)}
        streak={state.streak}
        referralCode={state.referralCode}
        onShareSuccess={incrementInviteCount}
      />
    </main>
  );
}
