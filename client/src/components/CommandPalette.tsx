'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, FileText, Plus, Hash, Share2, Download, LogOut, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaletteItem = {
    id: string;
    label: string;
    hint?: string;
    section: 'Notes' | 'Actions' | 'Tags';
    icon?: 'note' | 'plus' | 'tag' | 'share' | 'export' | 'logout' | 'keyboard';
    run: () => void;
};

const iconFor = (name?: PaletteItem['icon']) => {
    switch (name) {
        case 'note': return <FileText size={12} />;
        case 'plus': return <Plus size={12} />;
        case 'tag': return <Hash size={12} />;
        case 'share': return <Share2 size={12} />;
        case 'export': return <Download size={12} />;
        case 'logout': return <LogOut size={12} />;
        case 'keyboard': return <Keyboard size={12} />;
        default: return null;
    }
};

export default function CommandPalette({
    open,
    onClose,
    items,
}: {
    open: boolean;
    onClose: () => void;
    items: PaletteItem[];
}) {
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            setQuery('');
            setCursor(0);
        }
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(it =>
            it.label.toLowerCase().includes(q) ||
            it.hint?.toLowerCase().includes(q) ||
            it.section.toLowerCase().includes(q)
        );
    }, [items, query]);

    // group by section, preserve order
    const grouped = useMemo(() => {
        const sections: Record<string, PaletteItem[]> = {};
        for (const it of filtered) {
            (sections[it.section] ||= []).push(it);
        }
        return sections;
    }, [filtered]);

    // flat index for cursor navigation
    const flat = useMemo(() => {
        const out: PaletteItem[] = [];
        for (const section of Object.values(grouped)) out.push(...section);
        return out;
    }, [grouped]);

    useEffect(() => {
        if (cursor >= flat.length) setCursor(Math.max(0, flat.length - 1));
    }, [flat.length, cursor]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor(c => Math.min(flat.length - 1, c + 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor(c => Math.max(0, c - 1));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const item = flat[cursor];
                if (item) {
                    item.run();
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, flat, cursor, onClose]);

    useEffect(() => {
        const selected = listRef.current?.querySelector('[data-selected="true"]');
        selected?.scrollIntoView({ block: 'nearest' });
    }, [cursor]);

    if (!open) return null;

    let globalIndex = 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-xl surface overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <Search size={14} style={{ color: 'var(--fg-dim)' }} />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Type a command or search notes…"
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: 'var(--fg)' }}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <span className="kbd">Esc</span>
                </div>
                <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-1">
                    {flat.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--fg-dim)' }}>
                            No results for “{query}”
                        </div>
                    ) : (
                        Object.entries(grouped).map(([section, list]) => (
                            <div key={section}>
                                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--fg-dim)' }}>
                                    {section}
                                </div>
                                {list.map((item) => {
                                    const idx = globalIndex++;
                                    const active = idx === cursor;
                                    return (
                                        <button
                                            key={item.id}
                                            data-selected={active}
                                            onMouseEnter={() => setCursor(idx)}
                                            onClick={() => { item.run(); onClose(); }}
                                            className={cn(
                                                'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors',
                                            )}
                                            style={{
                                                background: active ? 'var(--bg-hover)' : 'transparent',
                                                color: active ? 'var(--fg)' : 'var(--fg-muted)',
                                            }}
                                        >
                                            <span className="shrink-0" style={{ color: 'var(--fg-dim)' }}>
                                                {iconFor(item.icon)}
                                            </span>
                                            <span className="flex-1 truncate">{item.label}</span>
                                            {item.hint && (
                                                <span className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>
                                                    {item.hint}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-mono border-t" style={{ borderColor: 'var(--border)', color: 'var(--fg-dim)' }}>
                    <span><span className="kbd">↑↓</span> navigate <span className="kbd ml-2">↵</span> select</span>
                    <span><span className="kbd">Esc</span> close</span>
                </div>
            </div>
        </div>
    );
}
