'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const TEXT_COLORS: { label: string; value: string | null }[] = [
    { label: 'Default', value: null },
    { label: 'Red', value: '#f87171' },
    { label: 'Amber', value: '#fbbf24' },
    { label: 'Green', value: '#34d399' },
    { label: 'Blue', value: '#60a5fa' },
    { label: 'Violet', value: '#a78bfa' },
    { label: 'Pink', value: '#f472b6' },
    { label: 'Slate', value: '#94a3b8' },
];

const HIGHLIGHT_COLORS: { label: string; value: string | null }[] = [
    { label: 'None', value: null },
    { label: 'Yellow', value: '#facc15' },
    { label: 'Green', value: '#10b981' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Rose', value: '#f43f5e' },
    { label: 'Purple', value: '#8b5cf6' },
];

export default function ColorPicker({
    currentColor,
    onTextColor,
    onHighlight,
}: {
    currentColor?: string | null;
    onTextColor: (color: string | null) => void;
    onHighlight: (color: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen((v) => !v)}
                className="p-1.5 rounded-xs transition-colors flex items-center"
                style={{
                    color: currentColor ? currentColor : 'var(--fg-muted)',
                    background: open ? 'var(--bg-hover)' : 'transparent',
                }}
                title="Text color & highlight"
            >
                <Palette size={13} />
                <span
                    className="ml-0.5 w-2.5 h-0.5 rounded-xs"
                    style={{ background: currentColor || 'var(--fg-dim)' }}
                />
            </button>

            {open && (
                <div
                    className="absolute top-full left-0 mt-1 z-50 surface p-2 shadow-lg"
                    style={{ width: 180 }}
                >
                    <div className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--fg-dim)' }}>
                        Text
                    </div>
                    <div className="grid grid-cols-8 gap-1 mb-3">
                        {TEXT_COLORS.map((c) => (
                            <button
                                key={c.label}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { onTextColor(c.value); setOpen(false); }}
                                className={cn(
                                    'w-5 h-5 rounded-xs flex items-center justify-center font-mono text-[10px]',
                                )}
                                style={{
                                    background: c.value || 'transparent',
                                    border: `1px solid ${c.value ? c.value : 'var(--border)'}`,
                                    color: c.value ? '#00120a' : 'var(--fg-muted)',
                                }}
                                title={c.label}
                            >
                                {!c.value && 'A'}
                            </button>
                        ))}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide font-medium mb-1" style={{ color: 'var(--fg-dim)' }}>
                        Highlight
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                        {HIGHLIGHT_COLORS.map((c) => (
                            <button
                                key={c.label}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { onHighlight(c.value); setOpen(false); }}
                                className="w-5 h-5 rounded-xs"
                                style={{
                                    background: c.value || 'transparent',
                                    border: `1px solid ${c.value || 'var(--border)'}`,
                                }}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
