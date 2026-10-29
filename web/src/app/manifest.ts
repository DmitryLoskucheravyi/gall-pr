import type { MetadataRoute } from 'next';

// What a phone uses when the site is added to its home screen (Android reads
// this; iOS takes apple-touch-icon from the layout's metadata instead).
// Served at /manifest.webmanifest, which the middleware lets through without
// a locale prefix.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Viktorumm art — галерея сучасного українського живопису',
    short_name: 'Viktorumm',
    start_url: '/ua',
    display: 'standalone',
    background_color: '#eee9e4',
    theme_color: '#551126',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
