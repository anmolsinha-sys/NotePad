'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Send, MessageSquare, Trash2 } from 'lucide-react';
import { notesApi } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { initiateSocketConnection } from '@/lib/socket';

type Comment = { id: string; body: string; author: string; author_id?: string; created_at: string };

export default function CommentsPanel({
    open,
    noteId,
    currentUserId,
    onClose,
    onCountChange,
}: {
    open: boolean;
    noteId: string | null;
    currentUserId: string | null;
    onClose: () => void;
    onCountChange?: (n: number) => void;
}) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!noteId) return;
        setLoading(true);
        notesApi.listComments(noteId)
            .then((res) => {
                const list = res.data.data.comments || [];
                setComments(list);
                onCountChange?.(list.length);
            })
            .catch((err) => toast.error(err?.response?.data?.message || 'Could not load comments'))
            .finally(() => setLoading(false));
    }, [noteId]);

    useEffect(() => {
        const s = initiateSocketConnection();
        const handler = (c: Comment) => {
            setComments((prev) => {
                if (prev.some((p) => p.id === c.id)) return prev;
                const next = [...prev, c];
                onCountChange?.(next.length);
                return next;
            });
        };
        s.on('comment-added', handler);
        return () => { s.off('comment-added', handler); };
    }, []);

    useEffect(() => {
        if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments.length, open]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = body.trim();
        if (!text || !noteId) return;
        setSending(true);
        try {
            const res = await notesApi.createComment(noteId, text);
            const c: Comment = res.data.data.comment;
            setComments((prev) => {
                const next = [...prev, c];
                onCountChange?.(next.length);
                return next;
            });
            setBody('');
            const s = initiateSocketConnection();
            if (s.connected) s.emit('new-comment', { noteId, comment: c });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not post comment');
        } finally {
            setSending(false);
        }
    };

    const remove = async (id: string) => {
        if (!noteId) return;
        try {
            await notesApi.deleteComment(noteId, id);
            setComments((prev) => {
                const next = prev.filter((c) => c.id !== id);
                onCountChange?.(next.length);
                return next;
            });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not delete');
        }
    };

    if (!open || !noteId) return null;

    return (
        <div className="fixed inset-0 z-[90] flex justify-end">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative h-full w-full max-w-sm flex flex-col" style={{ background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}>
                <div className="h-11 px-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <MessageSquare size={14} style={{ color: 'var(--fg-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Comments</span>
                        {comments.length > 0 && (
                            <span className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>{comments.length}</span>
                        )}
                    </div>
                    <button onClick={onClose} className="btn btn-ghost p-1"><X size={14} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                    {loading ? (
                        <div className="text-xs text-center py-6" style={{ color: 'var(--fg-dim)' }}>Loading…</div>
                    ) : comments.length === 0 ? (
                        <div className="text-xs text-center py-6" style={{ color: 'var(--fg-dim)' }}>
                            No comments yet. Start the thread.
                        </div>
                    ) : (
                        comments.map((c) => {
                            const mine = currentUserId && c.author_id === currentUserId;
                            return (
                                <div key={c.id} className="group">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className="text-[11px] font-semibold" style={{ color: 'var(--fg)' }}>{c.author}</span>
                                        <span className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>
                                            {relTime(c.created_at)}
                                        </span>
                                        {mine && (
                                            <button
                                                type="button"
                                                onClick={() => remove(c.id)}
                                                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete"
                                            >
                                                <Trash2 size={10} style={{ color: 'var(--fg-dim)' }} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg-muted)' }}>{c.body}</div>
                                </div>
                            );
                        })
                    )}
                    <div ref={endRef} />
                </div>

                <form onSubmit={send} className="p-2 flex gap-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                    <input
                        type="text"
                        placeholder="Write a comment…"
                        className="input text-sm"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={sending || !body.trim()}>
                        <Send size={13} />
                    </button>
                </form>
            </div>
        </div>
    );
}

function relTime(iso: string) {
    try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); }
    catch { return ''; }
}
