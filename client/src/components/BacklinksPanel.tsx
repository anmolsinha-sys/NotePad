'use client';

import { useMemo } from 'react';
import { Link2 } from 'lucide-react';

type Note = { id: string; title: string; content?: string };

export default function BacklinksPanel({
    notes,
    currentNoteId,
    onOpen,
}: {
    notes: Note[];
    currentNoteId: string;
    onOpen: (id: string) => void;
}) {
    const incoming = useMemo(() => {
        const needle = `data-target="${currentNoteId}"`;
        return notes.filter((n) => n.id !== currentNoteId && (n.content || '').includes(needle));
    }, [notes, currentNoteId]);

    if (incoming.length === 0) return null;

    return (
        <div
            className="mt-8 pt-4"
            style={{ borderTop: '1px solid var(--border)' }}
        >
            <div className="flex items-center gap-1.5 mb-2">
                <Link2 size={12} style={{ color: 'var(--fg-dim)' }} />
                <span className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--fg-dim)' }}>
                    Referenced in
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>
                    {incoming.length}
                </span>
            </div>
            <div className="space-y-1">
                {incoming.map((n) => (
                    <button
                        key={n.id}
                        type="button"
                        onClick={() => onOpen(n.id)}
                        className="w-full text-left text-sm px-2 py-1 rounded-sm transition-colors"
                        style={{
                            color: 'var(--fg-muted)',
                            background: 'transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        → {n.title || 'Untitled'}
                    </button>
                ))}
            </div>
        </div>
    );
}
