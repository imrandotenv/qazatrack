export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'witr';

export type QazaCounts = Record<PrayerKey, number> & {
  fasts: number;
};

export type TodayPrayerStatus = 'pending' | 'prayed' | 'missed';

export type DailyLogEntry = {
  date: string;
  presentStatus: Record<PrayerKey, TodayPrayerStatus>;
  clearedBacklog: QazaCounts;
  /** @deprecated Kept only so older local backups can be migrated. */
  cleared?: QazaCounts;
  /** @deprecated Kept only so older local backups can be migrated. */
  missedToday?: QazaCounts;
};

export type PaceMode = 'gentle' | 'steady' | 'custom';

export type CalculationProfile = 'brother' | 'sister';

export type QazaState = {
  initialDebt: QazaCounts;
  cleared: QazaCounts;
  paceMode: PaceMode;
  dailyPrayersTarget: number;
  streak: number;
  lastLoggedDate: string | null;
  isOnboarded: boolean;
  dailyLogs: Record<string, DailyLogEntry>;
  settings: {
    showRakats: boolean;
    includeWitr: boolean;
    calculationProfile?: CalculationProfile;
  };
  referralCode: string;
  invitesSharedCount: number;
};
