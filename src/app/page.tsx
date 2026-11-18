'use client';

import { useState } from 'react';
import { Dashboard } from '../components/Dashboard';
import { Header } from '../components/Header';
import { MilestoneModal } from '../components/MilestoneModal';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { SettingsModal } from '../components/SettingsModal';
import { Footer } from '../components/Footer';
import { ReferralModal } from '../components/ReferralModal';
import { useQazaStore } from '../hooks/useQazaStore';
import { completionPercentage, totalClearedPrayers } from '../lib/calculator';

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'QazaTrack',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'All',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Qaza calculator for missed Salah and Ramadan fasts',
    'Daily prayer check-in',
    'Offline tracking with 100% privacy',
  ],
};

const faqStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I calculate years of missed Qaza prayers?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Estimate the years and months of missed prayers, account for monthly exemption days when relevant, and QazaTrack will calculate an initial prayer backlog for you.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which prayers are included in Qaza (Farz, Sunnat, Witr)?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'QazaTrack helps you plan missed Farz prayers and Witr. Sunnat prayers are not included in the Qaza backlog.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my Qaza prayer data stored privately?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. QazaTrack stores your progress locally on your device. Your data stays private unless you choose to export a backup.',
      },
    },
  ],
};

export default function HomePage() {
  const {
    state,
    hasCompletedOnboarding,
    hydrated,
    batchUndoState,
    logSingleItem,
    logFullDaySet,
    undoLastAction,
    dismissUndoToast,
    todaySummary,
    setTodayPrayerStatus,
    incrementInviteCount,
  } = useQazaStore();
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[var(--page-background)] px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-10 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mt-10 h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </main>
    );
  }

  const isOnboarded = hasCompletedOnboarding;

  return (
    <div className="min-h-screen bg-[var(--page-background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      {isOnboarded && (
        <Header
          streak={state.streak}
          onShareMilestone={() => setMilestoneOpen(true)}
          onSettingsBackup={() => setSettingsOpen(true)}
        />
      )}
      {!isOnboarded ? (
        <>
          <OnboardingWizard />
          <section
            className="mx-auto mb-12 mt-2 w-full max-w-3xl px-4 sm:px-8"
            aria-labelledby="faq-heading"
          >
            <details className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[#111827]">
              <summary
                id="faq-heading"
                className="cursor-pointer list-none px-5 py-4 text-base font-bold text-[var(--foreground)]"
              >
                <span className="flex items-center justify-between gap-4">
                  Frequently Asked Questions
                  <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">⌄</span>
                </span>
              </summary>
              <div className="space-y-5 border-t border-slate-100 px-5 pb-5 pt-4 dark:border-slate-800">
                <div>
                  <h2 className="font-bold text-[var(--foreground)]">How do I calculate years of missed Qaza prayers?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Estimate your missed years and months, then account for monthly exemption days when relevant. QazaTrack calculates your starting backlog.
                  </p>
                </div>
                <div>
                  <h2 className="font-bold text-[var(--foreground)]">Which prayers are included in Qaza (Farz, Sunnat, Witr)?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    QazaTrack includes missed Farz prayers and Witr. Sunnat prayers are not included in the Qaza backlog.
                  </p>
                </div>
                <div>
                  <h2 className="font-bold text-[var(--foreground)]">Is my Qaza prayer data stored privately?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Yes. Your progress is stored locally on your device and stays private unless you choose to export a backup.
                  </p>
                </div>
              </div>
            </details>
          </section>
        </>
      ) : (
        <Dashboard
          state={state}
          hydrated={hydrated}
          batchUndoState={batchUndoState}
          logSingleItem={logSingleItem}
          logFullDaySet={logFullDaySet}
          undoLastAction={undoLastAction}
          dismissUndoToast={dismissUndoToast}
          todaySummary={todaySummary}
          setTodayPrayerStatus={setTodayPrayerStatus}
          incrementInviteCount={incrementInviteCount}
          settings={state.settings}
          onOpenMilestone={() => setMilestoneOpen(true)}
        />
      )}
      <MilestoneModal
        open={milestoneOpen}
        onClose={() => setMilestoneOpen(false)}
        clearedPrayers={totalClearedPrayers(state.cleared)}
        completionPercentage={Math.round(completionPercentage(state.initialDebt, state.cleared))}
        streak={state.streak}
        referralCode={state.referralCode}
        onShareSuccess={incrementInviteCount}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ReferralModal
        open={referralOpen}
        referralCode={state.referralCode}
        invitesSharedCount={state.invitesSharedCount}
        onClose={() => setReferralOpen(false)}
        onInviteShared={incrementInviteCount}
      />
      <Footer
        onInviteFriend={() => setReferralOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />
    </div>
  );
}
