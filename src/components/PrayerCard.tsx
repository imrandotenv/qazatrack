'use client';

type PrayerCardProps = {
  label: string;
  subtitle?: string;
  rakats: number;
  tag: string;
  cleared: number;
  total: number;
  showRakats: boolean;
  isFast?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

export function PrayerCard({
  label,
  subtitle,
  rakats,
  tag,
  cleared,
  total,
  showRakats,
  isFast = false,
  onIncrement,
  onDecrement,
}: PrayerCardProps) {
  const safeTotal = Math.max(0, total);
  const safeCleared = Math.min(safeTotal, Math.max(0, cleared));
  const remaining = safeTotal - safeCleared;
  const progress = safeTotal === 0 ? 100 : (safeCleared / safeTotal) * 100;

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--foreground)]">{label}</h3>
            {showRakats && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {tag}
              </span>
            )}
          </div>
          {showRakats && subtitle && (
            <p className="mt-1 text-base text-slate-600 dark:text-slate-300">{subtitle}</p>
          )}
        </div>
        {showRakats && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold tabular-nums text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200">
            {isFast
              ? `${remaining.toLocaleString()} fast${remaining === 1 ? '' : 's'} left`
              : `${(remaining * rakats).toLocaleString()} rak'ats left`}
          </span>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tracking-[-0.04em] tabular-nums text-[var(--foreground)]">
            {remaining.toLocaleString()} <span className="text-lg font-semibold tracking-normal">left</span>
          </p>
          <p className="mt-1 text-sm tabular-nums text-slate-600 dark:text-slate-300">
            {safeCleared.toLocaleString()} / {safeTotal.toLocaleString()} cleared
          </p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
          {Math.round(progress)}%
        </span>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCleared}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out dark:bg-emerald-400"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={onIncrement}
          disabled={remaining === 0}
          className="min-h-[48px] flex-1 rounded-xl bg-emerald-100 px-3 text-sm font-bold text-emerald-900 hover:bg-emerald-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 dark:bg-emerald-400/15 dark:text-emerald-200 dark:hover:bg-emerald-400/25"
        >
          +1 Cleared
        </button>
        <button
          type="button"
          onClick={onDecrement}
          disabled={safeCleared === 0}
          aria-label={`Correct ${label} by removing one completed item`}
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-slate-200 px-3 text-lg font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          −1
        </button>
      </div>
    </article>
  );
}
