'use client';

import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Monitor, Check, Bookmark, AlertTriangle, X as XIcon } from 'lucide-react';
import { ACCENTS, type AccentName, type ThemeMode, getStoredAccent, getStoredMode, setAccent, setMode } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { authApi, notesApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export default function SettingsPanel({
    typewriter,
    onTypewriterChange,
}: {
    typewriter: boolean;
    onTypewriterChange: (v: boolean) => void;
}) {
    const router = useRouter();
    const [mode, setModeState] = useState<ThemeMode>('dark');
    const [accent, setAccentState] = useState<AccentName>('emerald');
    const [danger, setDanger] = useState(false);
    const [origin, setOrigin] = useState<string>('');
    const bookmarkletRef = useRef<HTMLAnchorElement>(null);
    const [copied, setCopied] = useState(false);
    const [showInstall, setShowInstall] = useState(false);
    const [testing, setTesting] = useState(false);

    const bookmarkletUrl = origin
        ? `javascript:(function(){var s=getSelection().toString();var u=location.href;var t=document.title;window.open('${origin}/clip?t='+encodeURIComponent(t)+'&u='+encodeURIComponent(u)+'&s='+encodeURIComponent(s),'_blank');})();`
        : '';

    useEffect(() => {
        setModeState(getStoredMode());
        setAccentState(getStoredAccent());
        if (typeof window !== 'undefined') setOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        if (!bookmarkletUrl || !bookmarkletRef.current) return;
        // React blocks javascript: URLs via the href prop — set via DOM instead.
        bookmarkletRef.current.setAttribute('href', bookmarkletUrl);
    }, [bookmarkletUrl]);

    const copyBookmarklet = async () => {
        if (!bookmarkletUrl) return;
        try {
            await navigator.clipboard.writeText(bookmarkletUrl);
            setCopied(true);
            setShowInstall(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback: still show the install dialog so user can copy manually.
            setShowInstall(true);
        }
    };

    const testClipper = async () => {
        if (testing) return;
        setTesting(true);
        try {
            const title = `Test clip — ${new Date().toLocaleTimeString()}`;
            const url = typeof window !== 'undefined' ? window.location.href : '';
            const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
            }[c]!));
            const content = `<p>This is a test clip created from your Notepad settings to confirm the web clipper works.</p>${
                url ? `<p><em>Source: <a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(url)}</a></em></p>` : ''
            }`;
            await notesApi.createNote({ title, content, tags: ['clip', 'test'] });
            toast.success('Test clip saved. Look for it in your notes list.');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Test clip failed — check your connection');
        } finally {
            setTesting(false);
        }
    };

    const handleMode = (m: ThemeMode) => {
        setModeState(m);
        setMode(m);
    };

    const handleAccent = (a: AccentName) => {
        setAccentState(a);
        setAccent(a);
    };

    const deleteAccount = async () => {
        if (!confirm('This deletes your account and ALL your notes permanently. Type yes to confirm.')) return;
        try {
            await authApi.deleteAccount();
            Cookies.remove('token');
            try { localStorage.removeItem('user'); } catch {}
            toast.success('Account deleted');
            router.replace('/auth');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not delete account');
        }
    };

    return (
        <div className="w-full p-3 space-y-3">
            <div>
                <div className="text-[10px] uppercase tracking-wide font-medium mb-1.5" style={{ color: 'var(--fg-dim)' }}>Theme</div>
                <div className="flex gap-1">
                    {([
                        { value: 'light', icon: Sun, label: 'Light' },
                        { value: 'dark', icon: Moon, label: 'Dark' },
                        { value: 'system', icon: Monitor, label: 'System' },
                    ] as const).map(({ value, icon: Icon, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => handleMode(value)}
                            className={cn('flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xs border text-[11px] transition-colors')}
                            style={{
                                borderColor: mode === value ? 'var(--accent)' : 'var(--border)',
                                background: mode === value ? 'var(--accent-weak)' : 'transparent',
                                color: mode === value ? 'var(--accent-strong)' : 'var(--fg-muted)',
                            }}
                            title={label}
                        >
                            <Icon size={11} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <div className="text-[10px] uppercase tracking-wide font-medium mb-1.5" style={{ color: 'var(--fg-dim)' }}>Accent</div>
                <div className="flex gap-1.5">
                    {(Object.keys(ACCENTS) as AccentName[]).map((a) => (
                        <button
                            key={a}
                            type="button"
                            onClick={() => handleAccent(a)}
                            className="w-7 h-7 rounded-sm flex items-center justify-center relative"
                            style={{
                                background: ACCENTS[a].swatch,
                                boxShadow: accent === a ? '0 0 0 2px var(--bg), 0 0 0 4px currentColor' : 'none',
                                color: ACCENTS[a].swatch,
                            }}
                            title={ACCENTS[a].label}
                        >
                            {accent === a && <Check size={12} color="#00120a" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px" style={{ background: 'var(--border)' }} />

            <div>
                <div className="text-[10px] uppercase tracking-wide font-medium mb-1.5" style={{ color: 'var(--fg-dim)' }}>Writing</div>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span style={{ color: 'var(--fg-muted)' }}>Typewriter mode</span>
                    <span className="relative inline-block w-7 h-4">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={typewriter}
                            onChange={(e) => onTypewriterChange(e.target.checked)}
                        />
                        <span
                            className="absolute inset-0 rounded-full transition-colors"
                            style={{ background: typewriter ? 'var(--accent)' : 'var(--border)' }}
                        />
                        <span
                            className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform"
                            style={{ transform: typewriter ? 'translateX(14px)' : 'translateX(2px)' }}
                        />
                    </span>
                </label>
            </div>

            <div className="h-px" style={{ background: 'var(--border)' }} />

            <div>
                <div className="text-[10px] uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--fg-dim)' }}>
                    <Bookmark size={10} /> Web clipper
                </div>
                <p className="text-[11px] mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                    Drag this to your bookmarks bar. Click it on any page to save the selection as a note.
                </p>
                {origin && (
                    <>
                        <a
                            ref={bookmarkletRef}
                            onClick={(e) => e.preventDefault()}
                            className="block px-2 py-1 rounded-xs text-[11px] font-mono text-center"
                            style={{
                                background: 'var(--accent-weak)',
                                color: 'var(--accent-strong)',
                                border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
                                cursor: 'grab',
                            }}
                            draggable
                            title="Drag this to your bookmarks bar"
                        >
                            + Clip to Notepad
                        </a>
                        <div className="flex gap-1.5 mt-1.5">
                            <button
                                type="button"
                                onClick={copyBookmarklet}
                                className="btn btn-ghost text-[11px] flex-1 py-1"
                                title="Copy the bookmarklet URL and show install instructions"
                            >
                                {copied ? 'Copied ✓' : 'Install…'}
                            </button>
                            <button
                                type="button"
                                onClick={testClipper}
                                disabled={testing}
                                className="btn btn-ghost text-[11px] flex-1 py-1"
                                title="Create a test clip to verify the clipper works"
                            >
                                {testing ? 'Testing…' : 'Test'}
                            </button>
                        </div>
                        <p className="text-[10px] mt-1.5" style={{ color: 'var(--fg-dim)' }}>
                            <strong>How:</strong> drag the link above to your bookmarks bar, or click
                            <em> Install…</em> for step-by-step paste instructions.
                        </p>
                    </>
                )}
            </div>

            <div className="h-px" style={{ background: 'var(--border)' }} />

            <div>
                <button
                    type="button"
                    onClick={() => setDanger((v) => !v)}
                    className="text-[11px] flex items-center gap-1"
                    style={{ color: 'var(--fg-dim)' }}
                >
                    <AlertTriangle size={11} />
                    {danger ? 'Hide danger zone' : 'Danger zone'}
                </button>
                {danger && (
                    <button
                        type="button"
                        onClick={deleteAccount}
                        className="mt-2 w-full text-xs px-2 py-1.5 rounded-xs"
                        style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }}
                    >
                        Delete my account permanently
                    </button>
                )}
            </div>

            {showInstall && bookmarkletUrl && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    onClick={() => setShowInstall(false)}
                >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div
                        className="relative w-full max-w-md p-5 rounded surface"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setShowInstall(false)}
                            className="absolute top-2 right-2 btn btn-ghost p-1"
                            aria-label="Close"
                        >
                            <XIcon size={12} />
                        </button>
                        <h3 className="text-sm font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--fg)' }}>
                            <Bookmark size={12} /> Install the web clipper
                        </h3>
                        <p className="text-[11px] mb-3" style={{ color: 'var(--fg-muted)' }}>
                            {copied
                                ? 'Bookmarklet URL is in your clipboard.'
                                : 'Copy the URL below — clipboard access was blocked.'}
                            {' '}Add it as a new bookmark in your browser:
                        </p>
                        <ol className="text-[11px] list-decimal pl-4 space-y-1 mb-3" style={{ color: 'var(--fg-muted)' }}>
                            <li>Show the bookmarks bar (Chrome/Edge: <span className="kbd">⌘⇧B</span>, Firefox: <span className="kbd">⌘⇧B</span>).</li>
                            <li>Right-click the bookmarks bar → <em>Add page…</em> / <em>Add bookmark…</em>.</li>
                            <li>Set Name: <strong>Clip to Notepad</strong>.</li>
                            <li>Paste the URL below into the URL/location field.</li>
                            <li>Save. Open any page, select text, click the bookmark.</li>
                        </ol>
                        <div className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--fg-dim)' }}>
                            Bookmarklet URL
                        </div>
                        <textarea
                            readOnly
                            value={bookmarkletUrl}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-full text-[10px] font-mono p-2 rounded-xs"
                            style={{
                                background: 'var(--bg)',
                                border: '1px solid var(--border)',
                                color: 'var(--fg)',
                                minHeight: 70,
                                resize: 'vertical',
                                wordBreak: 'break-all',
                            }}
                        />
                        <div className="flex gap-1.5 mt-3 justify-end">
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(bookmarkletUrl);
                                        toast.success('Copied');
                                    } catch {
                                        toast.error('Copy blocked — select the text manually');
                                    }
                                }}
                                className="btn btn-primary text-[11px] py-1"
                            >
                                Copy again
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowInstall(false)}
                                className="btn btn-ghost text-[11px] py-1"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
