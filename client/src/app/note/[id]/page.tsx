'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { notesApi } from '@/lib/api';
import { subscribeToTitleUpdate, subscribeToConnectionState } from '@/lib/socket';
import TiptapEditor from '@/components/Editor';
import { FileText, ArrowLeft, Eye, Lock } from 'lucide-react';
import { isEncryptedPayload } from '@/lib/crypto';

export default function SharedNotePage() {
    const { id } = useParams();
    const router = useRouter();

    const [note, setNote] = useState<any>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const [connectionState, setConnectionState] = useState<string>('disconnected');
    const [collabCount, setCollabCount] = useState(0);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        setIsAuthed(Boolean(Cookies.get('token')));

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

    const encrypted = note.is_encrypted || isEncryptedPayload(note.content);
    if (encrypted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
                <Lock size={22} style={{ color: 'var(--accent-strong)' }} />
                <h2 className="text-base font-medium">This note is encrypted</h2>
                <p className="text-xs max-w-sm" style={{ color: 'var(--fg-muted)' }}>
                    The owner protected this note with a passphrase. Contents are encrypted client-side — no one can read them without the passphrase, not even the server.
                </p>
                <p className="text-[11px]" style={{ color: 'var(--fg-dim)' }}>
                    Ask the owner to remove the password before sharing, or sign in and open it from your own dashboard if you have the passphrase.
                </p>
                <button onClick={() => router.push('/dashboard')} className="btn btn-ghost text-xs mt-2">Back to dashboard</button>
            </div>
        );
    }

    // Magazine-style reader view for unauthenticated viewers
    if (!isAuthed) {
        return (
            <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
                <header
                    className="h-11 px-4 flex items-center justify-between shrink-0 sticky top-0 z-10"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                            <span className="font-mono text-[10px] font-bold" style={{ color: '#00120a' }}>N</span>
                        </div>
                        <span className="text-sm font-medium">Notepad</span>
                    </div>
                    <button
                        onClick={() => router.push('/auth')}
                        className="btn btn-primary text-xs"
                    >
                        Sign up free
                    </button>
                </header>

                <article className="flex-1 max-w-[68ch] w-full mx-auto px-6 py-16">
                    <div className="text-[11px] font-mono uppercase tracking-wide mb-4" style={{ color: 'var(--fg-dim)' }}>
                        Public note
                    </div>
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-6">
                        {note.title || 'Untitled'}
                    </h1>
                    <div className="h-px mb-8" style={{ background: 'var(--border)' }} />
                    <div className="reader-content">
                        <TiptapEditor
                            key={note.id}
                            noteId={note.id}
                            initialContent={note.content}
                            initialTags={note.tags || []}
                            isShared={true}
                            editable={false}
                        />
                    </div>
                    <footer className="mt-16 pt-6 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                        <a
                            href="/auth"
                            className="inline-flex items-center gap-2 text-xs"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            <span className="w-4 h-4 rounded-sm flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                                <span className="font-mono text-[9px] font-bold" style={{ color: '#00120a' }}>N</span>
                            </span>
                            Built with <span style={{ color: 'var(--accent-strong)' }}>Notepad</span>
                        </a>
                    </footer>
                </article>

                <style jsx global>{`
                    .reader-content .ProseMirror {
                        font-size: 1.0625rem;
                        line-height: 1.8;
                    }
                    .reader-content [data-html2canvas-ignore] { display: none !important; }
                `}</style>
            </div>
        );
    }

    // Authenticated viewer (collaborator / editor / owner via direct link)
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
