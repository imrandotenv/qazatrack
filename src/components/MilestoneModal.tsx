'use client';

import { useEffect, useRef, useState } from 'react';
import { SITE_DISPLAY_DOMAIN, SITE_URL } from '../lib/constants';
import { useModalA11y } from '../hooks/useModalA11y';

type MilestoneModalProps = {
  open: boolean;
  onClose: () => void;
  clearedPrayers: number;
  completionPercentage: number;
  streak: number;
  referralCode?: string;
  onShareSuccess: () => void;
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export function MilestoneModal({
  open,
  onClose,
  clearedPrayers,
  completionPercentage,
  streak,
  referralCode,
  onShareSuccess,
}: MilestoneModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDark, setIsDark] = useState(false);

  useModalA11y(open, onClose);

  useEffect(() => {
    const updateTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const background = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    background.addColorStop(0, isDark ? '#111827' : '#f7fbf8');
    background.addColorStop(1, isDark ? '#090d16' : '#e8f4ec');
    context.fillStyle = background;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.fillStyle = '#047857';
    roundedRect(context, 70, 70, 940, 1210, 36);
    context.fill();

    context.fillStyle = isDark ? '#111827' : '#f7fbf8';
    roundedRect(context, 92, 92, 896, 1166, 24);
    context.fill();

    context.fillStyle = '#047857';
    context.font = '700 42px Arial, sans-serif';
    context.fillText('QazaTrack', 150, 178);
    context.beginPath();
    context.arc(132, 164, 13, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#b45309';
    context.font = '600 30px Arial, sans-serif';
    context.fillText('Alhamdulillah', 150, 300);

    context.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    context.font = '700 68px Arial, sans-serif';
    context.fillText('A milestone', 150, 450);
    context.fillText('worth celebrating.', 150, 530);

    context.fillStyle = '#047857';
    context.font = '700 104px Arial, sans-serif';
    context.fillText(clearedPrayers.toLocaleString(), 150, 710);
    context.fillStyle = isDark ? '#cbd5e1' : '#334155';
    context.font = '600 34px Arial, sans-serif';
    context.fillText('Prayers Cleared', 154, 766);

    context.fillStyle = isDark ? '#1e293b' : '#ecf7ef';
    roundedRect(context, 150, 850, 780, 170, 24);
    context.fill();
    context.fillStyle = isDark ? '#6ee7b7' : '#047857';
    context.font = '700 56px Arial, sans-serif';
    context.fillText(`${completionPercentage}%`, 190, 925);
    context.fillStyle = isDark ? '#e2e8f0' : '#334155';
    context.font = '600 30px Arial, sans-serif';
    context.fillText('of your prayer plan complete', 190, 975);

    context.fillStyle = isDark ? '#cbd5e1' : '#0f172a';
    context.font = '700 36px Arial, sans-serif';
    context.fillText(`✦  ${streak} day streak`, 150, 1020);
    context.fillStyle = isDark ? '#94a3b8' : '#475569';
    context.font = 'italic 28px Arial, sans-serif';
    context.fillText('Small, steady steps become a beautiful journey.', 150, 1080);

    context.strokeStyle = isDark ? '#334155' : '#d1e4d7';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(150, 1130);
    context.lineTo(930, 1130);
    context.stroke();
    context.fillStyle = isDark ? '#cbd5e1' : '#334155';
    context.font = '600 24px Arial, sans-serif';
    context.fillText('QazaTrack — Free & private Qaza Salah & Fast payoff planner', 150, 1170);
    context.fillStyle = '#047857';
    context.font = '700 24px Arial, sans-serif';
    context.fillText(`Start your Qaza journey → ${SITE_DISPLAY_DOMAIN}`, 150, 1210);
    context.font = '600 22px Arial, sans-serif';
    context.fillText(referralCode ? `/?ref=${referralCode}` : '', 150, 1245);
  }, [clearedPrayers, completionPercentage, isDark, open, referralCode, streak]);

  function downloadImage() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const link = document.createElement('a');
    link.download = 'qazatrack-milestone.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function shareOnWhatsApp() {
    const message = `Alhamdulillah, I've cleared ${clearedPrayers} Qaza prayers (${completionPercentage}%) on QazaTrack! 🌙✨

It's a free, 100% private & offline planner to calculate and track missed Salah and Ramadan fasts.

Aap bhi apna Qaza plan shuru karein: ${SITE_URL}${referralCode ? `/?ref=${referralCode}` : ''}`;
    const canvas = canvasRef.current;
    const file = canvas
      ? await new Promise<File | null>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob ? new File([blob], 'qazatrack-milestone.png', { type: 'image/png' }) : null);
          }, 'image/png');
        })
      : null;

    if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({
          files: [file],
          text: message,
          title: 'QazaTrack milestone',
        });
        onShareSuccess();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    onShareSuccess();
  }

  if (!open) {
    return null;
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
        aria-labelledby="milestone-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-[var(--card-background)] p-5 shadow-2xl animate-in fade-in zoom-in-[0.98] duration-150 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="milestone-title" className="text-2xl font-bold tracking-[-0.03em] text-[var(--foreground)]">
              Share your milestone
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">A private, anonymous image for your own celebration.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close milestone modal"
            className="min-h-[44px] min-w-[44px] rounded-lg text-2xl text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="h-auto w-full"
            aria-label={`Milestone preview: ${clearedPrayers} prayers cleared, ${completionPercentage}% complete`}
          />
          <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700 sm:px-6">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              QazaTrack — Free &amp; private Qaza Salah &amp; Fast payoff planner
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Start your Qaza journey → {SITE_DISPLAY_DOMAIN}{referralCode ? `/?ref=${referralCode}` : ''}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={shareOnWhatsApp}
            className="min-h-[48px] flex-1 rounded-xl bg-[#25D366] px-5 text-base font-bold text-slate-950 transition-colors hover:bg-[#20bd5a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
          >
            Share on WhatsApp
          </button>
          <button
            type="button"
            onClick={downloadImage}
            className="min-h-[48px] flex-1 rounded-xl border border-emerald-700 px-5 text-base font-bold text-emerald-800 transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            Download PNG
          </button>
        </div>
      </section>
    </div>
  );
}
