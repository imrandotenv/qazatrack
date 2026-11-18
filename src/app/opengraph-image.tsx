import { ImageResponse } from 'next/og';
import { SITE_DISPLAY_DOMAIN } from '../lib/constants';

export const dynamic = 'force-static';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#047857',
          padding: '64px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '20px',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
                <path d="M23 5.7A11.5 11.5 0 1 0 25.8 22.4 10 10 0 1 1 23 5.7Z" fill="#047857" />
                <path d="m9.5 17 3.4 3.4 9.2-9.2" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '44px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.03em' }}>
                QazaTrack
              </span>
              <span style={{ fontSize: '18px', color: '#a7f3d0', fontWeight: '500' }}>
                Peaceful Spiritual Accounting
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              padding: '10px 24px',
              borderRadius: '9999px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: '600',
              gap: '8px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fde68a">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>100% Offline &amp; Private</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '980px' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: '800',
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: '-0.035em',
              margin: 0,
            }}
          >
            Missed Salah &amp; Ramadan Fast Debt Payoff Planner
          </h1>
          <p
            style={{
              fontSize: '24px',
              color: '#d1fae5',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Calculate missed prayers, build a calm daily payoff pace, and track your spiritual progress privately on your device.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            paddingTop: '28px',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: '18px', color: '#ecfdf5', fontWeight: '600' }}>Zero Data Tracked</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: '18px', color: '#ecfdf5', fontWeight: '600' }}>Instant Payoff Estimates</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: '18px', color: '#ecfdf5', fontWeight: '600' }}>Sadaqah Jariyah</span>
            </div>
          </div>
          <span style={{ fontSize: '20px', color: '#fef3c7', fontWeight: '700' }}>
            {SITE_DISPLAY_DOMAIN}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
