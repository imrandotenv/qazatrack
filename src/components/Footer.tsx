'use client';

import { useState } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';

type FooterProps = {
  onInviteFriend: () => void;
  onSettings: () => void;
};

type LegalTab = 'privacy' | 'terms' | 'fiqh';

function LogoMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white dark:bg-emerald-500 dark:text-slate-950">
      <svg width="23" height="23" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M23 5.7A11.5 11.5 0 1 0 25.8 22.4 10 10 0 1 1 23 5.7Z" fill="currentColor" />
        <path d="m9.5 17 3.4 3.4 9.2-9.2" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Footer({ onInviteFriend, onSettings }: FooterProps) {
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);

  useModalA11y(Boolean(legalTab), () => setLegalTab(null));

  function openGuidelines() {
    document.getElementById('qaza-guidelines')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <>
      <footer className="border-t border-slate-900/[0.08] bg-[#FAF9F6] px-4 py-10 [overflow-anchor:none] dark:border-white/[0.08] dark:bg-[#090D16] sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <LogoMark />
                <span className="text-lg font-bold tracking-[-0.03em] text-[var(--foreground)]">QazaTrack</span>
              </div>
              <p className="mt-4 max-w-md text-base leading-7 text-slate-600 dark:text-slate-300">
                A calm, private companion to help Muslims fulfill missed prayers and fasts with consistency.
              </p>
            </div>
            <nav aria-label="Footer links">
              <h2 className="text-sm font-bold text-[var(--foreground)]">Quick Links</h2>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                <button type="button" onClick={onInviteFriend} className="w-fit min-h-[40px] text-left hover:underline">Invite a Friend</button>
                <button type="button" onClick={onSettings} className="w-fit min-h-[40px] text-left hover:underline">Backup &amp; Settings</button>
                <button type="button" onClick={openGuidelines} className="w-fit min-h-[40px] text-left hover:underline">Qaza Guidelines</button>
                <button type="button" onClick={() => setLegalTab('privacy')} className="w-fit min-h-[40px] text-left hover:underline">Privacy &amp; Cookies</button>
                <button type="button" onClick={() => setLegalTab('terms')} className="w-fit min-h-[40px] text-left hover:underline">Terms of Use</button>
                <button type="button" onClick={() => setLegalTab('fiqh')} className="w-fit min-h-[40px] text-left hover:underline">Fiqh Note</button>
              </div>
            </nav>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-slate-900/[0.08] pt-5 text-sm text-slate-600 dark:border-white/[0.08] dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 QazaTrack. All rights reserved.</span>
            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 font-bold text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200">100% Offline &amp; Private · Zero Data Tracked</span>
          </div>
        </div>
      </footer>

      {legalTab && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setLegalTab(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-title"
            className="w-full max-w-2xl rounded-3xl bg-[var(--card-background)] p-6 shadow-2xl animate-in fade-in zoom-in-[0.98] duration-150 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="legal-title" className="text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)]">Legal, Privacy &amp; Fiqh Information</h2>
              <button type="button" onClick={() => setLegalTab(null)} aria-label="Close information dialog" autoFocus className="min-h-[44px] min-w-[44px] rounded-xl text-2xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">×</button>
            </div>
            <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none dark:border-slate-700" role="tablist" aria-label="Information sections">
              {([
                ['privacy', 'Privacy', 'Privacy & Cookies'],
                ['terms', 'Terms', 'Terms of Use'],
                ['fiqh', 'Fiqh', 'Fiqh Note'],
              ] as const).map(([tab, shortLabel, fullLabel]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={legalTab === tab}
                  onClick={() => setLegalTab(tab)}
                  className={`min-h-[48px] shrink-0 border-b-2 px-3 text-sm font-bold transition-colors ${
                    legalTab === tab
                      ? 'border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{fullLabel}</span>
                </button>
              ))}
            </div>
            <div role="tabpanel" className="mt-6 space-y-4 text-[15px] leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              {legalTab === 'privacy' && (
                <>
                  <p className="font-bold text-[var(--foreground)]">We use zero tracking cookies; all data stays locally on your device.</p>
                  <p>QazaTrack stores your prayer counts, daily check-ins, and theme preferences strictly in your browser&apos;s <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">localStorage</code>. There are zero server uploads and zero analytics trackers.</p>
                  <p>You stay in control with the JSON Backup and Reset tools in Settings. Export a copy whenever you want, or reset your local data at any time.</p>
                </>
              )}
              {legalTab === 'terms' && (
                <>
                  <p><strong className="text-[var(--foreground)]">Personal &amp; Spiritual Utility:</strong> QazaTrack is provided free of charge as a personal self-tracking tool.</p>
                  <p><strong className="text-[var(--foreground)]">User Responsibility for Backups:</strong> Because data is stored locally for privacy, download periodic JSON backups before clearing browser data or switching phones.</p>
                  <p><strong className="text-[var(--foreground)]">As-Is Service &amp; Intellectual Property:</strong> QazaTrack is provided as-is without guarantees or liability for lost data or outcomes. Use the interface and shareable milestone graphics respectfully for personal, non-commercial purposes.</p>
                </>
              )}
              {legalTab === 'fiqh' && (
                <>
                  <p>QazaTrack uses standard baseline calculations, such as approximately seven monthly exemption days, as a helpful starting estimate.</p>
                  <p>This is a planning aid, not a religious ruling. Please consult qualified local scholars (<em>Ulama</em>) for specific personal Fiqh rulings and questions about your obligations.</p>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
