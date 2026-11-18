import type { CalculationProfile, PaceMode, PrayerKey, QazaCounts } from '../types/qaza';

export type { CalculationProfile };

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
export const DAYS_PER_MONTH = 30;
export const FASTS_PER_YEAR = 30;

export type DurationEstimateOptions = {
  years: number;
  months: number;
  profile?: CalculationProfile;
  includeExemption?: boolean;
  monthlyExemptionDays?: number;
  jumuahAttendance?: number;
  customExemptionDays?: number;
  missedFasts?: number;
};

export function calculateTotalFridays(totalMonths: number): number {
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) {
    return 0;
  }
  return Math.round((totalMonths * 52) / 12);
}

export function calculateAttendedJumuah(totalMonths: number, jumuahAttendance: number): number {
  const totalFridays = calculateTotalFridays(totalMonths);
  if (totalFridays <= 0 || !Number.isFinite(jumuahAttendance) || jumuahAttendance <= 0) {
    return 0;
  }
  const ratio = jumuahAttendance > 1 ? (jumuahAttendance <= 100 ? jumuahAttendance / 100 : 1) : jumuahAttendance;
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  return Math.min(totalFridays, Math.round(totalFridays * clampedRatio));
}

export function estimateFromDuration(options: DurationEstimateOptions): QazaCounts;
export function estimateFromDuration(
  years: number,
  months: number,
  includeExemption?: boolean,
  missedFasts?: number,
  profile?: CalculationProfile,
  jumuahAttendance?: number,
  monthlyExemptionDays?: number,
  customExemptionDays?: number,
): QazaCounts;
export function estimateFromDuration(
  yearsOrOptions: number | DurationEstimateOptions,
  maybeMonths?: number,
  maybeIncludeExemption?: boolean,
  maybeMissedFasts?: number,
  maybeProfile?: CalculationProfile,
  maybeJumuahAttendance?: number,
  maybeMonthlyExemptionDays?: number,
  maybeCustomExemptionDays?: number,
): QazaCounts {
  let years: number;
  let months: number;
  let profile: CalculationProfile;
  let includeExemption: boolean;
  let monthlyExemptionDays: number;
  let jumuahAttendance: number;
  let customExemptionDays: number;
  let missedFasts: number | undefined;

  if (typeof yearsOrOptions === 'object' && yearsOrOptions !== null) {
    years = Math.max(0, Math.floor(yearsOrOptions.years || 0));
    months = Math.max(0, Math.floor(yearsOrOptions.months || 0));
    includeExemption = yearsOrOptions.includeExemption ?? true;
    profile = yearsOrOptions.profile ?? (yearsOrOptions.includeExemption === true ? 'sister' : 'brother');
    monthlyExemptionDays = yearsOrOptions.monthlyExemptionDays ?? (includeExemption ? 7 : 0);
    jumuahAttendance = yearsOrOptions.jumuahAttendance ?? 0;
    customExemptionDays = Math.max(0, Math.floor(yearsOrOptions.customExemptionDays || 0));
    missedFasts = yearsOrOptions.missedFasts;
  } else {
    years = Math.max(0, Math.floor(yearsOrOptions || 0));
    months = Math.max(0, Math.floor(maybeMonths || 0));
    includeExemption = maybeIncludeExemption ?? true;
    profile = maybeProfile ?? (maybeIncludeExemption ? 'sister' : 'brother');
    monthlyExemptionDays = maybeMonthlyExemptionDays ?? (includeExemption ? 7 : 0);
    jumuahAttendance = maybeJumuahAttendance ?? 0;
    customExemptionDays = Math.max(0, Math.floor(maybeCustomExemptionDays || 0));
    missedFasts = maybeMissedFasts;
  }

  const totalMonths = Math.max(0, years * 12 + months);
  const baseSalahDays = totalMonths * DAYS_PER_MONTH;

  let effectiveMonthlyExemptionDays = 0;
  let effectiveJumuahAttendance = 0;
  let effectiveCustomExemptionDays = 0;

  if (profile === 'brother') {
    // Force monthlyExemptionDays = 0 so stale sister settings never affect brother's count
    effectiveMonthlyExemptionDays = 0;
    effectiveJumuahAttendance = Math.max(0, jumuahAttendance);
    effectiveCustomExemptionDays = Math.max(0, customExemptionDays);
  } else {
    // Profile is sister: Force jumuahAttendance = 0 and customExemptionDays = 0 so stale brother settings never deduct Dhuhr or Salah
    effectiveJumuahAttendance = 0;
    effectiveCustomExemptionDays = 0;
    if (includeExemption && monthlyExemptionDays > 0) {
      // Clamp between 5 and 10 days, default 7
      effectiveMonthlyExemptionDays = Math.min(10, Math.max(5, Math.round(monthlyExemptionDays)));
    } else {
      effectiveMonthlyExemptionDays = 0;
    }
  }

  const totalHaydExemptionDays = totalMonths * effectiveMonthlyExemptionDays;
  const commonMissedDays = Math.max(0, baseSalahDays - totalHaydExemptionDays - effectiveCustomExemptionDays);

  const attendedJumuah = calculateAttendedJumuah(totalMonths, effectiveJumuahAttendance);
  const dhuhrMissedDays = Math.max(0, commonMissedDays - attendedJumuah);

  const estimatedFasts =
    typeof missedFasts === 'number' && Number.isFinite(missedFasts) && missedFasts >= 0
      ? missedFasts
      : Math.max(0, years) * FASTS_PER_YEAR;

  return {
    fajr: commonMissedDays,
    dhuhr: dhuhrMissedDays,
    asr: commonMissedDays,
    maghrib: commonMissedDays,
    isha: commonMissedDays,
    witr: commonMissedDays,
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
  paceMode?: PaceMode,
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

  const dailyRecommendationText =
    paceMode === 'gentle' || (paceMode === undefined && dailySetsTarget === 1)
      ? "Insha'Allah, just ~3 extra minutes after each Farz will steadily clear your entire backlog."
      : paceMode === 'steady' || (paceMode === undefined && dailySetsTarget === 2)
      ? "Insha'Allah, just ~6 extra minutes after each Farz will steadily clear your entire backlog."
      : `Insha'Allah, completing ${dailySetsTarget} extra prayer sets daily will steadily clear your entire backlog.`;

  return {
    daysRemaining,
    estimatedCompletionDate: completionDate.toISOString().slice(0, 10),
    dailyRecommendationText,
  };
}
