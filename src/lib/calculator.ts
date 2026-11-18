import type { PrayerKey, QazaCounts } from '../types/qaza';

export const PRAYER_RAKATS: Readonly<Record<PrayerKey | 'fasts', number>> = {
  fajr: 2,
  dhuhr: 4,
  asr: 4,
  maghrib: 3,
  isha: 4,
  witr: 3,
  fasts: 0,
};

const PRAYER_KEYS: readonly PrayerKey[] = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'witr',
];
const DAYS_PER_MONTH = 30;
const FASTS_PER_YEAR = 30;

export function estimateFromDuration(
  years: number,
  months: number,
  includeExemption: boolean,
  missedFasts: number,
): QazaCounts {
  const totalMonths = Math.max(0, years * 12 + months);
  const exemptionDays = includeExemption ? totalMonths * 7 : 0;
  const missedDays = Math.max(0, totalMonths * DAYS_PER_MONTH - exemptionDays);
  const estimatedFasts =
    Number.isFinite(missedFasts) && missedFasts >= 0
      ? missedFasts
      : Math.max(0, years) * FASTS_PER_YEAR;

  return {
    fajr: missedDays,
    dhuhr: missedDays,
    asr: missedDays,
    maghrib: missedDays,
    isha: missedDays,
    witr: missedDays,
    fasts: estimatedFasts,
  };
}

export function totalRemainingPrayers(counts: QazaCounts): number {
  return PRAYER_KEYS.reduce((total, prayer) => total + Math.max(0, counts[prayer]), 0);
}

export function totalClearedPrayers(counts: QazaCounts): number {
  return totalRemainingPrayers(counts);
}

export function totalRakatsRemaining(counts: QazaCounts): number {
  return (Object.keys(PRAYER_RAKATS) as Array<keyof typeof PRAYER_RAKATS>).reduce(
    (total, key) => total + Math.max(0, counts[key]) * PRAYER_RAKATS[key],
    0,
  );
}

export function totalRakatsCleared(counts: QazaCounts): number {
  return totalRakatsRemaining(counts);
}

export function todayNetRakatBalance(cleared: QazaCounts, missedToday: QazaCounts): number {
  return totalRakatsCleared(cleared) - totalRakatsRemaining(missedToday);
}

export function completionPercentage(initialDebt: QazaCounts, cleared: QazaCounts): number {
  const totalDebt = totalRemainingPrayers(initialDebt);
  if (totalDebt === 0) {
    return 100;
  }

  const percentage = (totalClearedPrayers(cleared) / totalDebt) * 100;
  return Math.min(100, Math.max(0, percentage));
}

export function calculatePayoffProjection(
  remaining: QazaCounts,
  dailySetsTarget: number,
): {
  daysRemaining: number;
  estimatedCompletionDate: string;
  dailyRecommendationText: string;
} {
  if (!Number.isFinite(dailySetsTarget) || dailySetsTarget <= 0) {
    throw new RangeError('dailySetsTarget must be greater than zero.');
  }

  const remainingPrayers = totalRemainingPrayers(remaining);
  const daysRemaining = Math.ceil(remainingPrayers / dailySetsTarget);
  const completionDate = new Date();
  completionDate.setDate(completionDate.getDate() + daysRemaining);

  return {
    daysRemaining,
    estimatedCompletionDate: completionDate.toISOString().slice(0, 10),
    dailyRecommendationText: `Complete ${dailySetsTarget} prayer ${
      dailySetsTarget === 1 ? 'set' : 'sets'
    } per day to clear your remaining prayers in approximately ${daysRemaining} ${
      daysRemaining === 1 ? 'day' : 'days'
    }.`,
  };
}
