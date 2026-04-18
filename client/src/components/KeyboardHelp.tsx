'use client';

import { X } from 'lucide-react';

const MOD = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl';

const groups: { title: string; shortcuts: [string, string][] }[] = [
    {
        title: 'General',
        shortcuts: [
            [`${MOD} K`, 'Open command palette'],
            [`${MOD} N`, 'New note'],
            [`${MOD} S`, 'Save now'],
            [`${MOD} .`, 'Toggle focus mode'],
            [`${MOD} /`, 'This help'],
        ],
    },
    {
        title: 'Editor',
        shortcuts: [
            [`${MOD} B`, 'Bold'],
            [`${MOD} I`, 'Italic'],
            [`${MOD} U`, 'Underline'],
            [`${MOD} Shift 7`, 'Numbered list'],
            [`${MOD} Shift 8`, 'Bullet list'],
            ['/', 'Slash commands'],
        ],
    },
    {
        title: 'Dashboard',
        shortcuts: [
            ['Esc', 'Close palette / dialog'],
            ['↑ / ↓', 'Navigate palette'],
            ['Enter', 'Select'],
        ],
    },
];

export default function KeyboardHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-md surface p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Keyboard shortcuts</h2>
                    <button onClick={onClose} className="btn btn-ghost p-1">
                        <X size={14} />
                    </button>
                </div>
                <div className="space-y-4">
                    {groups.map((g) => (
                        <div key={g.title}>
                            <h3 className="text-[10px] uppercase tracking-wide font-medium mb-2" style={{ color: 'var(--fg-dim)' }}>{g.title}</h3>
                            <div className="space-y-1">
                                {g.shortcuts.map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between text-xs">
                                        <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
                                        <div className="flex items-center gap-1">
                                            {key.split(' ').map((k, i) => (
                                                <span key={i} className="kbd">{k}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
