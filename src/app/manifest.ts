import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QazaTrack',
    short_name: 'QazaTrack',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF9F6',
    theme_color: '#047857',
  };
}
