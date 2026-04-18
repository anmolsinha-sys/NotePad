'use client';

import { useEffect, useMemo, useState } from 'react';
import { notesApi } from '@/lib/api';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { X, RotateCcw, History } from 'lucide-react';
import { toast } from 'sonner';
import { diff_match_patch } from 'diff-match-patch';
import DOMPurify from 'dompurify';

const dmp = new diff_match_patch();

const htmlToText = (html: string): string =>
    html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|h[1-6]|li|div|pre|blockquote)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const DiffView = ({ before, after }: { before: string; after: string }) => {
    const diffs = useMemo(() => {
        const d = dmp.diff_main(htmlToText(before), htmlToText(after));
        dmp.diff_cleanupSemantic(d);
        return d;
    }, [before, after]);

    return (
        <pre
            className="text-xs whitespace-pre-wrap font-mono"
            style={{ color: 'var(--fg-muted)', lineHeight: 1.55 }}
        >
            {diffs.map(([op, text], i) => {
                if (op === 0) return <span key={i}>{text}</span>;
                if (op === 1) return (
                    <span
                        key={i}
                        style={{
                            background: 'color-mix(in oklab, var(--accent) 20%, transparent)',
                            color: 'var(--accent-strong)',
                        }}
                    >
                        {text}
                    </span>
                );
                return (
                    <span
                        key={i}
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#fca5a5',
                            textDecoration: 'line-through',
                        }}
                    >
                        {text}
                    </span>
                );
            })}
        </pre>
    );
};

type Version = {
    id: string;
    content: string;
    title: string | null;
    created_at: string;
    created_by?: string | null;
};

export default function HistoryDrawer({
    open,
    noteId,
    currentContent,
    onClose,
    onRestored,
}: {
    open: boolean;
    noteId: string | null;
    currentContent?: string;
    onClose: () => void;
    onRestored?: (content: string, title: string | null) => void;
}) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [view, setView] = useState<'preview' | 'diff'>('preview');

    useEffect(() => {
        if (!open || !noteId) return;
        setLoading(true);
        setSelectedId(null);
        notesApi.listVersions(noteId)
            .then((res) => setVersions(res.data.data.versions))
            .catch((err) => toast.error(err?.response?.data?.message || 'Could not load history'))
            .finally(() => setLoading(false));
    }, [open, noteId]);

    if (!open || !noteId) return null;

    const selected = versions.find((v) => v.id === selectedId) || null;

    const restore = async () => {
        if (!selected) return;
        setRestoring(true);
        try {
            const res = await notesApi.restoreVersion(noteId, selected.id);
            toast.success('Version restored');
            onRestored?.(res.data.data.note.content, res.data.data.note.title);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not restore');
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex justify-end">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative h-full w-full max-w-md flex flex-col" style={{ background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}>
                <div className="h-11 px-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <History size={14} style={{ color: 'var(--fg-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Version history</span>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost p-1">
                        <X size={14} />
                    </button>
                </div>

                <div className="flex-1 flex min-h-0">
                    {/* Version list */}
                    <div className="w-48 shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--border)' }}>
                        {loading ? (
                            <div className="px-3 py-4 text-xs" style={{ color: 'var(--fg-dim)' }}>Loading…</div>
                        ) : versions.length === 0 ? (
                            <div className="px-3 py-4 text-xs" style={{ color: 'var(--fg-dim)' }}>No versions yet. Snapshots are taken every 5 minutes of active editing.</div>
                        ) : (
                            versions.map((v) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setSelectedId(v.id)}
                                    className="w-full text-left px-3 py-2 transition-colors"
                                    style={{
                                        background: selectedId === v.id ? 'var(--bg-hover)' : 'transparent',
                                        color: selectedId === v.id ? 'var(--fg)' : 'var(--fg-muted)',
                                    }}
                                >
                                    <div className="text-xs font-medium truncate">{v.title || 'Untitled'}</div>
                                    <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--fg-dim)' }}>
                                        {relTime(v.created_at)}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Preview */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {selected ? (
                            <>
                                <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <div className="text-xs font-mono" style={{ color: 'var(--fg-dim)' }}>
                                        {format(parseISO(selected.created_at), 'PPpp')}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <button
                                            type="button"
                                            onClick={restore}
                                            disabled={restoring}
                                            className="btn btn-primary text-xs"
                                        >
                                            <RotateCcw size={11} />
                                            {restoring ? 'Restoring…' : 'Restore'}
                                        </button>
                                        <div className="flex rounded-xs overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                                            <button
                                                type="button"
                                                onClick={() => setView('preview')}
                                                className="text-[11px] px-2 py-1"
                                                style={{
                                                    background: view === 'preview' ? 'var(--bg-hover)' : 'transparent',
                                                    color: view === 'preview' ? 'var(--fg)' : 'var(--fg-muted)',
                                                }}
                                            >
                                                Preview
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setView('diff')}
                                                className="text-[11px] px-2 py-1"
                                                style={{
                                                    background: view === 'diff' ? 'var(--bg-hover)' : 'transparent',
                                                    color: view === 'diff' ? 'var(--fg)' : 'var(--fg-muted)',
                                                }}
                                            >
                                                Diff
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] mt-1.5" style={{ color: 'var(--fg-dim)' }}>
                                        Your current content will be snapshotted before restore.
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto px-4 py-3 text-xs">
                                    {view === 'preview' ? (
                                        <div
                                            style={{ color: 'var(--fg-muted)' }}
                                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.content) }}
                                        />
                                    ) : (
                                        <DiffView before={selected.content} after={currentContent || ''} />
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--fg-dim)' }}>
                                Select a version
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function relTime(iso: string) {
    try {
        return formatDistanceToNow(parseISO(iso), { addSuffix: true });
    } catch {
        return '';
    }
}
