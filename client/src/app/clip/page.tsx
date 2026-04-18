'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { notesApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

function ClipFlow() {
    const router = useRouter();
    const params = useSearchParams();
    const [status, setStatus] = useState('Saving clip…');

    useEffect(() => {
        const token = Cookies.get('token');
        if (!token) {
            const here = typeof window !== 'undefined' ? window.location.href : '/clip';
            try { sessionStorage.setItem('postAuthRedirect', here); } catch {}
            router.replace('/auth');
            return;
        }

        const title = params.get('t') || 'Clipped note';
        const url = params.get('u') || '';
        const selection = (params.get('s') || '').trim();

        const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        }[c]!));

        const paragraphs = selection
            ? selection.split(/\n\s*\n+/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
            : '';
        const source = url ? `<p><em>Source: <a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(url)}</a></em></p>` : '';
        const content = `${paragraphs}${source}`;

        (async () => {
            try {
                await notesApi.createNote({ title: title.slice(0, 120), content, tags: ['clip'] });
                setStatus('Saved. Redirecting…');
                toast.success('Clip saved');
                router.replace('/dashboard');
            } catch (err: any) {
                setStatus(err?.response?.data?.message || 'Could not save clip');
                toast.error(err?.response?.data?.message || 'Could not save clip');
            }
        })();
    }, [params, router]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
            <div className="text-sm font-mono" style={{ color: 'var(--fg-muted)' }}>{status}</div>
        </div>
    );
}

export default function ClipPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
        }>
            <ClipFlow />
        </Suspense>
    );
}
