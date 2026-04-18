'use client';

import { useEffect, useState } from 'react';
import { notesApi } from '@/lib/api';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { X, RotateCcw, History } from 'lucide-react';
import { toast } from 'sonner';

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
    onClose,
    onRestored,
}: {
    open: boolean;
    noteId: string | null;
    onClose: () => void;
    onRestored?: (content: string, title: string | null) => void;
}) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState(false);

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
                                    <button
                                        type="button"
                                        onClick={restore}
                                        disabled={restoring}
                                        className="btn btn-primary text-xs mt-2"
                                    >
                                        <RotateCcw size={11} />
                                        {restoring ? 'Restoring…' : 'Restore this version'}
                                    </button>
                                    <div className="text-[10px] mt-1" style={{ color: 'var(--fg-dim)' }}>
                                        Your current content will be snapshotted before restore.
                                    </div>
                                </div>
                                <div
                                    className="flex-1 overflow-y-auto px-4 py-3 text-xs"
                                    style={{ color: 'var(--fg-muted)' }}
                                    dangerouslySetInnerHTML={{ __html: selected.content }}
                                />
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
