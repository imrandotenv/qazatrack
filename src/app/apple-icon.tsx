import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width="180" height="180" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <rect width="128" height="128" rx="28" fill="#047857" />
        <path d="M88.7 22.8a42.8 42.8 0 1 0 10.1 61.8A37.2 37.2 0 1 1 88.7 22.8Z" fill="#fff" />
        <path d="m38 67 13.2 13.2L91 40.5" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    {
      ...size,
    },
  );
}
