'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notesApi } from '@/lib/api';
import { subscribeToTitleUpdate, subscribeToConnectionState } from '@/lib/socket';
import TiptapEditor from '@/components/Editor';
import { FileText, ArrowLeft, Eye } from 'lucide-react';

export default function SharedNotePage() {
    const { id } = useParams();
    const router = useRouter();

    const [note, setNote] = useState<any>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [connectionState, setConnectionState] = useState<string>('disconnected');
    const [collabCount, setCollabCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const fetchNote = async () => {
            try {
                const res = await notesApi.getNote(id as string);
                if (cancelled) return;
                setNote(res.data.data.note);
                setCanEdit(res.data.data.canEdit);
            } catch {
                if (!cancelled) setNote(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (id) fetchNote();

        const unsubTitle = subscribeToTitleUpdate((newTitle) => {
            setNote((prev: any) => prev ? { ...prev, title: newTitle } : prev);
        });

        const unsubConn = subscribeToConnectionState(setConnectionState);

        return () => {
            cancelled = true;
            unsubTitle();
            unsubConn();
        };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
        );
    }

    if (!note) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
                <FileText size={22} style={{ color: 'var(--fg-dim)' }} />
                <h2 className="text-base font-medium">Note not found</h2>
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>This note may have been deleted or is private.</p>
                <button onClick={() => router.push('/')} className="btn btn-primary text-xs mt-1">Go home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
            <header
                className="h-11 px-4 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-20"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => router.push('/dashboard')} className="btn btn-ghost p-1" title="Back">
                        <ArrowLeft size={14} />
                    </button>
                    <span className="text-sm font-medium truncate">{note.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>
                    {!canEdit && (
                        <span className="inline-flex items-center gap-1">
                            <Eye size={11} /> read-only
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                                background:
                                    connectionState === 'connected' ? 'var(--accent)' :
                                    connectionState === 'reconnecting' || connectionState === 'connecting' ? 'var(--warning)' :
                                    'var(--fg-dim)',
                            }}
                        />
                        {connectionState}
                    </span>
                    {collabCount > 0 && <span>{collabCount} online</span>}
                </div>
            </header>

            <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-8">
                <TiptapEditor
                    key={note.id}
                    noteId={note.id}
                    initialContent={note.content}
                    initialTags={note.tags || []}
                    isShared={true}
                    editable={canEdit}
                    onCollaboratorsChange={setCollabCount}
                    onSave={(content, tags) => {
                        if (!canEdit) return;
                        notesApi.updateNote(note.id, { content, tags }).catch(() => {});
                    }}
                />
            </main>
        </div>
    );
}
