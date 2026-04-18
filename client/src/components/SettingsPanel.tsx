'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { ACCENTS, type AccentName, type ThemeMode, getStoredAccent, getStoredMode, setAccent, setMode } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function SettingsPanel({
    typewriter,
    onTypewriterChange,
}: {
    typewriter: boolean;
    onTypewriterChange: (v: boolean) => void;
}) {
    const [mode, setModeState] = useState<ThemeMode>('dark');
    const [accent, setAccentState] = useState<AccentName>('emerald');

    useEffect(() => {
        setModeState(getStoredMode());
        setAccentState(getStoredAccent());
    }, []);

    const handleMode = (m: ThemeMode) => {
        setModeState(m);
        setMode(m);
    };

    const handleAccent = (a: AccentName) => {
        setAccentState(a);
        setAccent(a);
    };

    return (
        <div className="w-[240px] p-3 space-y-3">
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
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xs border text-[11px] transition-colors',
                            )}
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
        </div>
    );
}
