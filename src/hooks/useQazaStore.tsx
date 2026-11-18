'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PRAYER_RAKATS,
  totalRakatsCleared,
  totalRakatsRemaining,
} from '../lib/calculator';
import type {
  DailyLogEntry,
  PaceMode,
  PrayerKey,
  QazaCounts,
  QazaState,
  TodayPrayerStatus,
} from '../types/qaza';

const STORAGE_KEY = 'qazatrack-state-v1';
const UNDO_DURATION_MS = 6000;
const PRAYER_KEYS: readonly PrayerKey[] = [
  'fajr',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
  'witr',
];
const COUNT_KEYS: readonly (PrayerKey | 'fasts')[] = [...PRAYER_KEYS, 'fasts'];

const emptyCounts = (): QazaCounts => ({
  fajr: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
  witr: 0,
  fasts: 0,
});

const emptyPresentStatus = (): Record<PrayerKey, TodayPrayerStatus> => ({
  fajr: 'pending',
  dhuhr: 'pending',
  asr: 'pending',
  maghrib: 'pending',
  isha: 'pending',
  witr: 'pending',
});

const defaultSettings = (): QazaState['settings'] => ({
  showRakats: true,
  includeWitr: true,
  calculationProfile: 'brother',
});

function generateReferralCode(): string {
  return `QT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

const emptyDailyLogs = (): Record<string, DailyLogEntry> => ({});

const emptyState = (): QazaState => ({
  initialDebt: emptyCounts(),
  cleared: emptyCounts(),
  paceMode: 'gentle',
  dailyPrayersTarget: 1,
  streak: 0,
  lastLoggedDate: null,
  isOnboarded: false,
  dailyLogs: emptyDailyLogs(),
  settings: defaultSettings(),
  referralCode: generateReferralCode(),
  invitesSharedCount: 0,
});

const cloneCounts = (counts: QazaCounts): QazaCounts => ({ ...counts });
const clonePresentStatus = (
  presentStatus: Record<PrayerKey, TodayPrayerStatus>,
): Record<PrayerKey, TodayPrayerStatus> => ({ ...presentStatus });

const normalizeDailyLog = (entry: DailyLogEntry): DailyLogEntry => {
  const legacyMissed = entry.missedToday ?? emptyCounts();
  const presentStatus = clonePresentStatus(entry.presentStatus ?? emptyPresentStatus());
  for (const key of PRAYER_KEYS) {
    if (legacyMissed[key] > 0 && presentStatus[key] === 'pending') {
      presentStatus[key] = 'missed';
    }
  }
  return {
    date: entry.date,
    presentStatus,
    clearedBacklog: cloneCounts(entry.clearedBacklog ?? entry.cleared ?? emptyCounts()),
  };
};

const cloneDailyLogs = (dailyLogs: Record<string, DailyLogEntry>): Record<string, DailyLogEntry> =>
  Object.fromEntries(
    Object.entries(dailyLogs).map(([date, entry]) => [
      date,
      normalizeDailyLog(entry),
    ]),
  );

const cloneState = (state: QazaState): QazaState => ({
  ...state,
  initialDebt: cloneCounts(state.initialDebt),
  cleared: cloneCounts(state.cleared),
  dailyLogs: cloneDailyLogs(state.dailyLogs),
  settings: { ...defaultSettings(), ...state.settings },
  referralCode: state.referralCode,
  invitesSharedCount: state.invitesSharedCount,
});

function todayString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterdayString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDailyLog(state: QazaState, date: string): DailyLogEntry {
  return (
    state.dailyLogs[date] ?? {
      date,
      presentStatus: emptyPresentStatus(),
      clearedBacklog: emptyCounts(),
    }
  );
}

function activeMissedCounts(dailyLogs: Record<string, DailyLogEntry>): QazaCounts {
  const counts = emptyCounts();
  for (const entry of Object.values(dailyLogs)) {
    const normalized = normalizeDailyLog(entry);
    for (const key of PRAYER_KEYS) {
      if (normalized.presentStatus[key] === 'missed') {
        counts[key] += 1;
      }
    }
  }
  return counts;
}

function sumPrayerCounts(counts: QazaCounts): number {
  return PRAYER_KEYS.reduce((total, key) => total + Math.max(0, counts[key]), 0);
}

function withLogMetadata(state: QazaState): Pick<QazaState, 'streak' | 'lastLoggedDate'> {
  const today = todayString();
  if (state.lastLoggedDate === today) {
    return { streak: state.streak, lastLoggedDate: today };
  }

  return {
    streak: state.lastLoggedDate === yesterdayString() ? state.streak + 1 : 1,
    lastLoggedDate: today,
  };
}

function normalizeCounts(raw: unknown): QazaCounts {
  const base = emptyCounts();
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const key of COUNT_KEYS) {
      if (typeof record[key] === 'number' && Number.isFinite(record[key]) && (record[key] as number) >= 0) {
        base[key] = record[key] as number;
      }
    }
  }
  return base;
}

function isProbableQazaState(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && ('initialDebt' in value || 'isOnboarded' in value || 'cleared' in value);
}

function normalizeState(raw: unknown): QazaState {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const record = raw as Record<string, unknown>;

  const initialDebt = normalizeCounts(record.initialDebt);
  const cleared = normalizeCounts(record.cleared);

  const paceMode: PaceMode =
    record.paceMode === 'steady' || record.paceMode === 'custom'
      ? record.paceMode
      : 'gentle';

  const dailyPrayersTarget =
    typeof record.dailyPrayersTarget === 'number' &&
    Number.isFinite(record.dailyPrayersTarget) &&
    record.dailyPrayersTarget > 0
      ? record.dailyPrayersTarget
      : 1;

  const streak =
    typeof record.streak === 'number' && Number.isInteger(record.streak) && record.streak >= 0
      ? record.streak
      : 0;

  const lastLoggedDate =
    typeof record.lastLoggedDate === 'string' ? record.lastLoggedDate : null;

  const isOnboarded =
    typeof record.isOnboarded === 'boolean'
      ? record.isOnboarded
      : typeof record.hasCompletedOnboarding === 'boolean'
      ? (record.hasCompletedOnboarding as boolean)
      : false;

  const dailyLogs =
    record.dailyLogs && typeof record.dailyLogs === 'object'
      ? cloneDailyLogs(record.dailyLogs as Record<string, DailyLogEntry>)
      : emptyDailyLogs();

  const settingsRecord = (record.settings && typeof record.settings === 'object'
    ? record.settings
    : {}) as Record<string, unknown>;

  const settings = {
    showRakats: typeof settingsRecord.showRakats === 'boolean' ? settingsRecord.showRakats : true,
    includeWitr: typeof settingsRecord.includeWitr === 'boolean' ? settingsRecord.includeWitr : true,
    calculationProfile:
      settingsRecord.calculationProfile === 'sister' ? ('sister' as const) : ('brother' as const),
  };

  const referralCode =
    typeof record.referralCode === 'string' && record.referralCode.trim() !== ''
      ? record.referralCode
      : generateReferralCode();

  const invitesSharedCount =
    typeof record.invitesSharedCount === 'number' &&
    Number.isInteger(record.invitesSharedCount) &&
    record.invitesSharedCount >= 0
      ? record.invitesSharedCount
      : 0;

  return {
    initialDebt,
    cleared,
    paceMode,
    dailyPrayersTarget,
    streak,
    lastLoggedDate,
    isOnboarded,
    dailyLogs,
    settings,
    referralCode,
    invitesSharedCount,
  };
}

export type TodayBreakdown = Record<
  PrayerKey | 'fasts',
  {
    cleared: number;
    missedToday: number;
    clearedRakats: number;
    missedRakats: number;
  }
>;

export type TodaySummary = {
  presentStatus: Record<PrayerKey, TodayPrayerStatus>;
  prayedTodayCount: number;
  missedTodayCount: number;
  missedTodayRakats: number;
  clearedTodayPrayers: number;
  clearedTodayRakats: number;
  fullSetsClearedToday: number;
  clearedPrayersCount: number;
  clearedRakatsCount: number;
  missedPrayersCount: number;
  missedRakatsCount: number;
  breakdown: TodayBreakdown;
};

export type BatchUndoState = {
  snapshot: QazaState;
  actionCount: number;
  label: string;
};

export type QazaStore = {
  state: QazaState;
  hasCompletedOnboarding: boolean;
  hydrated: boolean;
  undoAvailable: boolean;
  batchUndoState: BatchUndoState | null;
  completeOnboarding: (
    initialDebt: QazaCounts,
    paceMode: PaceMode,
    dailyPrayersTarget: number,
  ) => void;
  logSingleItem: (key: PrayerKey | 'fasts', delta: 1 | -1) => void;
  logFullDaySet: () => void;
  logMissedToday: (key: PrayerKey, delta: 1 | -1) => void;
  setTodayPrayerStatus: (key: PrayerKey, status: TodayPrayerStatus) => void;
  undoLastAction: () => void;
  dismissUndoToast: () => void;
  updatePace: (paceMode: PaceMode, dailyPrayersTarget: number) => void;
  updatePreferences: (preferences: Partial<QazaState['settings']>) => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonString: string) => void;
  resetAllData: () => void;
  incrementInviteCount: () => void;
  todaySummary: TodaySummary;
};

function useCreateQazaStore(): QazaStore {
  const [state, setState] = useState<QazaState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>(todayString);
  const [batchUndoState, setBatchUndoState] = useState<BatchUndoState | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage with resilient migration
  useEffect(() => {
    const storedState = window.localStorage.getItem(STORAGE_KEY);
    if (storedState) {
      try {
        const parsedState: unknown = JSON.parse(storedState);
        if (isProbableQazaState(parsedState)) {
          setState(normalizeState(parsedState));
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  // Save to localStorage whenever state changes after hydration
  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [hydrated, state]);

  // Keep currentDate in sync across midnight and on window focus
  useEffect(() => {
    const syncDate = () => {
      const now = todayString();
      setCurrentDate((prev) => (prev !== now ? now : prev));
    };

    window.addEventListener('focus', syncDate);
    const intervalId = window.setInterval(syncDate, 60000);

    return () => {
      window.removeEventListener('focus', syncDate);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(
    () => () => {
      if (undoTimer.current) {
        clearTimeout(undoTimer.current);
      }
    },
    [],
  );

  const recordUndo = useCallback((snapshot: QazaState, actionLabel: string) => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
    }
    setBatchUndoState((current) => {
      if (!current) {
        return {
          snapshot: cloneState(snapshot),
          actionCount: 1,
          label: actionLabel,
        };
      }

      const isSameSingleItem =
        (current.label.startsWith('+') || current.label.startsWith('-')) &&
        (actionLabel.startsWith('+1 ') || actionLabel.startsWith('-1 '));
      const actionCount = current.actionCount + 1;
      return {
        snapshot: current.snapshot,
        actionCount,
        label:
          isSameSingleItem &&
          current.label.endsWith(actionLabel.slice(3)) &&
          current.label.charAt(0) === actionLabel.charAt(0)
            ? `${actionLabel.charAt(0)}${actionCount} ${actionLabel.slice(3)}`
            : `${actionCount} changes`,
      };
    });
    undoTimer.current = setTimeout(() => {
      setBatchUndoState(null);
      undoTimer.current = null;
    }, UNDO_DURATION_MS);
  }, []);

  const completeOnboarding = useCallback(
    (initialDebt: QazaCounts, paceMode: PaceMode, dailyPrayersTarget: number) => {
      if (!Number.isFinite(dailyPrayersTarget) || dailyPrayersTarget <= 0) {
        throw new RangeError('dailyPrayersTarget must be greater than zero.');
      }
      setState((current) => ({
        ...current,
        initialDebt: cloneCounts(initialDebt),
        cleared: emptyCounts(),
        paceMode,
        dailyPrayersTarget,
        isOnboarded: true,
        dailyLogs: emptyDailyLogs(),
      }));
    },
    [],
  );

  const logSingleItem = useCallback(
    (key: PrayerKey | 'fasts', delta: 1 | -1) => {
      setState((current) => {
        const nextState = cloneState(current);
        const previousValue = nextState.cleared[key];
        const missedDebt = activeMissedCounts(nextState.dailyLogs);
        const availableDebt = nextState.initialDebt[key] + missedDebt[key];
        const nextValue = Math.min(
          availableDebt,
          Math.max(0, previousValue + delta),
        );
        const change = nextValue - previousValue;
        if (change !== 0) {
          nextState.cleared[key] = nextValue;
          const today = todayString();
          const dailyLog = getDailyLog(nextState, today);

          if (change > 0) {
            dailyLog.clearedBacklog[key] = dailyLog.clearedBacklog[key] + change;
            nextState.dailyLogs[today] = dailyLog;
          } else {
            // Decrement: Deduct from today's log if possible, otherwise from most recent log
            if (dailyLog.clearedBacklog[key] > 0) {
              dailyLog.clearedBacklog[key] -= 1;
              nextState.dailyLogs[today] = dailyLog;
            } else {
              const sortedDates = Object.keys(nextState.dailyLogs).sort().reverse();
              for (const d of sortedDates) {
                if (nextState.dailyLogs[d].clearedBacklog[key] > 0) {
                  nextState.dailyLogs[d].clearedBacklog[key] -= 1;
                  break;
                }
              }
            }
          }

          recordUndo(current, `${delta > 0 ? '+' : '-'}1 ${key}`);
          Object.assign(nextState, withLogMetadata(current));
        }
        return nextState;
      });
    },
    [recordUndo],
  );

  const logFullDaySet = useCallback(() => {
    setState((current) => {
      const nextState = cloneState(current);
      const missedDebt = activeMissedCounts(nextState.dailyLogs);
      const activeKeys: PrayerKey[] = nextState.settings.includeWitr
        ? ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr']
        : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

      let changed = false;
      for (const key of activeKeys) {
        if (nextState.cleared[key] < nextState.initialDebt[key] + missedDebt[key]) {
          nextState.cleared[key] += 1;
          changed = true;
        }
      }
      if (changed) {
        const today = todayString();
        const dailyLog = getDailyLog(nextState, today);
        for (const key of activeKeys) {
          const change = nextState.cleared[key] - current.cleared[key];
          if (change !== 0) {
            dailyLog.clearedBacklog[key] = Math.max(0, dailyLog.clearedBacklog[key] + change);
          }
        }
        nextState.dailyLogs[today] = dailyLog;
        recordUndo(current, 'Full Day Set');
        Object.assign(nextState, withLogMetadata(current));
      }
      return nextState;
    });
  }, [recordUndo]);

  const setTodayPrayerStatus = useCallback(
    (key: PrayerKey, status: TodayPrayerStatus) => {
      setState((current) => {
        const nextState = cloneState(current);
        const today = todayString();
        const dailyLog = getDailyLog(nextState, today);
        if (dailyLog.presentStatus[key] === status) {
          return nextState;
        }

        dailyLog.presentStatus[key] = status;
        nextState.dailyLogs[today] = dailyLog;
        recordUndo(
          current,
          `${status === 'prayed' ? 'Prayed' : status === 'missed' ? 'Missed' : 'Reset'} ${key}`,
        );
        Object.assign(nextState, withLogMetadata(current));
        return nextState;
      });
    },
    [recordUndo],
  );

  const logMissedToday = useCallback(
    (key: PrayerKey, delta: 1 | -1) => {
      setTodayPrayerStatus(key, delta === 1 ? 'missed' : 'pending');
    },
    [setTodayPrayerStatus],
  );

  const updatePreferences = useCallback(
    (preferences: Partial<QazaState['settings']>) => {
      setState((current) => ({
        ...current,
        settings: { ...current.settings, ...preferences },
      }));
    },
    [],
  );

  const dismissUndoToast = useCallback(() => {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setBatchUndoState(null);
  }, []);

  const undoLastAction = useCallback(() => {
    if (!batchUndoState) {
      return;
    }
    setState(cloneState(batchUndoState.snapshot));
    dismissUndoToast();
  }, [batchUndoState, dismissUndoToast]);

  const updatePace = useCallback((paceMode: PaceMode, dailyPrayersTarget: number) => {
    if (!Number.isFinite(dailyPrayersTarget) || dailyPrayersTarget <= 0) {
      throw new RangeError('dailyPrayersTarget must be greater than zero.');
    }
    setState((current) => ({ ...current, paceMode, dailyPrayersTarget }));
  }, []);

  const exportBackupJson = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importBackupJson = useCallback(
    (jsonString: string) => {
      let parsedState: unknown;
      try {
        parsedState = JSON.parse(jsonString);
      } catch {
        throw new Error('Backup could not be read because it is not valid JSON.');
      }
      if (!isProbableQazaState(parsedState)) {
        throw new Error('Backup could not be imported because its QazaTrack data is invalid.');
      }
      setState(normalizeState(parsedState));
      dismissUndoToast();
    },
    [dismissUndoToast],
  );

  const resetAllData = useCallback(() => {
    setState(emptyState());
    dismissUndoToast();
    window.localStorage.removeItem(STORAGE_KEY);
  }, [dismissUndoToast]);

  const incrementInviteCount = useCallback(() => {
    setState((current) => ({
      ...current,
      invitesSharedCount: current.invitesSharedCount + 1,
    }));
  }, []);

  const todaySummary = useMemo<TodaySummary>(() => {
    const todayEntry = getDailyLog(state, currentDate);
    const todayMissed = emptyCounts();
    for (const key of PRAYER_KEYS) {
      if (todayEntry.presentStatus[key] === 'missed') {
        todayMissed[key] = 1;
      }
    }
    const presentStatus = clonePresentStatus(todayEntry.presentStatus);
    const prayedTodayCount = PRAYER_KEYS.filter((key) => presentStatus[key] === 'prayed').length;
    const missedTodayCount = PRAYER_KEYS.filter((key) => presentStatus[key] === 'missed').length;
    const clearedTodayPrayers = sumPrayerCounts(todayEntry.clearedBacklog);
    const clearedTodayRakats = totalRakatsCleared(todayEntry.clearedBacklog);
    const missedTodayRakats = totalRakatsRemaining(todayMissed);

    const activeKeys: PrayerKey[] = state.settings.includeWitr
      ? ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr']
      : ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

    const fullSetsClearedToday = Math.min(
      ...activeKeys.map((key) => todayEntry.clearedBacklog[key]),
    );

    return {
      presentStatus,
      prayedTodayCount,
      missedTodayCount,
      missedTodayRakats,
      clearedTodayPrayers,
      clearedTodayRakats,
      fullSetsClearedToday,
      clearedPrayersCount: clearedTodayPrayers,
      clearedRakatsCount: clearedTodayRakats,
      missedPrayersCount: missedTodayCount,
      missedRakatsCount: missedTodayRakats,
      breakdown: Object.fromEntries(
        COUNT_KEYS.map((key) => [
          key,
          {
            cleared: todayEntry.clearedBacklog[key],
            missedToday: todayMissed[key],
            clearedRakats:
              todayEntry.clearedBacklog[key] * (key === 'fasts' ? 0 : PRAYER_RAKATS[key]),
            missedRakats:
              todayMissed[key] * (key === 'fasts' ? 0 : PRAYER_RAKATS[key]),
          },
        ]),
      ) as TodayBreakdown,
    };
  }, [currentDate, state.dailyLogs, state.settings.includeWitr]);

  return {
    state,
    hasCompletedOnboarding: state.isOnboarded,
    hydrated,
    undoAvailable: batchUndoState !== null,
    batchUndoState,
    completeOnboarding,
    logSingleItem,
    logFullDaySet,
    logMissedToday,
    setTodayPrayerStatus,
    undoLastAction,
    dismissUndoToast,
    updatePace,
    updatePreferences,
    exportBackupJson,
    importBackupJson,
    resetAllData,
    incrementInviteCount,
    todaySummary,
  };
}

const QazaContext = createContext<QazaStore | null>(null);

export function QazaProvider({ children }: { children: React.ReactNode }) {
  const store = useCreateQazaStore();
  return <QazaContext.Provider value={store}>{children}</QazaContext.Provider>;
}

export function useQazaStore(): QazaStore {
  const context = useContext(QazaContext);
  if (!context) {
    throw new Error('useQazaStore must be used within a QazaProvider');
  }
  return context;
}
