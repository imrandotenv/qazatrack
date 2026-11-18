'use client';

import { useState } from 'react';
import { SITE_URL } from '../lib/constants';
import { useModalA11y } from '../hooks/useModalA11y';

type ReferralModalProps = {
  open: boolean;
  referralCode: string;
  invitesSharedCount: number;
  onClose: () => void;
  onInviteShared: () => void;
};

export function ReferralModal({
  open,
  referralCode,
  invitesSharedCount,
  onClose,
  onInviteShared,
}: ReferralModalProps) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${SITE_URL}/?ref=${encodeURIComponent(referralCode)}`;
  const inviteMessage = `Assalamu alaikum! I found QazaTrack, a calm and private way to begin your Qaza journey. Join me and take one steady step at a time: ${inviteLink}`;

  useModalA11y(open, onClose);

  if (!open) {
    return null;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  function shareOnWhatsApp() {
    onInviteShared();
    window.open(`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`, '_blank', 'noopener,noreferrer');
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
        aria-labelledby="referral-title"
        className="w-full max-w-lg rounded-3xl bg-[var(--card-background)] p-6 shadow-2xl animate-in fade-in zoom-in-[0.98] duration-150 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="referral-title" className="text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)]">
              Share as Sadaqah Jariyah
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-300">
              Invite a friend or family member to start their Qaza journey — earn ongoing reward for every prayer they make up.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close invite modal" className="min-h-[44px] min-w-[44px] rounded-xl text-2xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            ×
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/35">
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Your personal invite link</p>
          <p className="mt-2 break-all rounded-xl bg-white px-3 py-3 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">{inviteLink}</p>
          <button type="button" onClick={copyLink} className="mt-3 min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400">
            {copied ? 'Copied ✓' : '1-Click Copy Link'}
          </button>
        </div>

        <button type="button" onClick={shareOnWhatsApp} className="mt-4 min-h-[52px] w-full rounded-xl bg-[#25D366] px-4 text-base font-semibold text-slate-950 hover:bg-[#1fb957]">
          Share directly on WhatsApp
        </button>
        <div className="mt-5 text-center text-sm font-semibold text-amber-800 dark:text-amber-200">
          ✦ {invitesSharedCount} Invites Shared
        </div>
      </section>
    </div>
  );
}
