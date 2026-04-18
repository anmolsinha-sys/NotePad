import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Notepad',
        short_name: 'Notepad',
        description: 'Developer notes with real-time collaboration',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0a0a0a',
        theme_color: '#10b981',
        categories: ['productivity', 'utilities'],
        icons: [
            { src: '/icon', sizes: '192x192', type: 'image/png' },
            { src: '/icon', sizes: '512x512', type: 'image/png' },
            { src: '/icon', sizes: 'any', type: 'image/png', purpose: 'any' },
            { src: '/icon', sizes: 'any', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
