'use client';

import { useMemo } from 'react';
import { Flame } from 'lucide-react';

type Note = { updated_at?: string; created_at?: string };

const DAY_MS = 86_400_000;
const WEEKS = 12;
const TOTAL_DAYS = WEEKS * 7;

const dayKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

export default function StreakHeatmap({ notes }: { notes: Note[] }) {
    const { streak, counts, gridDays } = useMemo(() => {
        const activity = new Map<string, number>();
        for (const n of notes) {
            const iso = n.updated_at || n.created_at;
            if (!iso) continue;
            const d = new Date(iso);
            if (isNaN(d.getTime())) continue;
            const k = dayKey(d);
            activity.set(k, (activity.get(k) || 0) + 1);
        }

        const today = startOfDay(new Date());
        let streakCount = 0;
        for (let i = 0; i < 365; i++) {
            const day = new Date(today.getTime() - i * DAY_MS);
            const k = dayKey(day);
            if (activity.has(k)) streakCount += 1;
            else if (i === 0) continue; // Don't break streak on today if no entry yet
            else break;
        }

        const days: { date: Date; count: number }[] = [];
        for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
            const day = new Date(today.getTime() - i * DAY_MS);
            days.push({ date: day, count: activity.get(dayKey(day)) || 0 });
        }

        return { streak: streakCount, counts: activity, gridDays: days };
    }, [notes]);

    // Build a 7-row × 12-col matrix aligned to day-of-week
    const columns: { date: Date; count: number }[][] = [];
    {
        let col: { date: Date; count: number }[] = [];
        // Pad first column so today lands at its correct weekday on the right
        const firstDate = gridDays[0]?.date;
        const firstDow = firstDate ? firstDate.getDay() : 0;
        for (let i = 0; i < firstDow; i++) col.push(null as any);
        for (const cell of gridDays) {
            col.push(cell);
            if (col.length === 7) {
                columns.push(col);
                col = [];
            }
        }
        if (col.length > 0) {
            while (col.length < 7) col.push(null as any);
            columns.push(col);
        }
    }

    const intensity = (count: number): string => {
        if (!count) return 'var(--border)';
        if (count === 1) return 'color-mix(in oklab, var(--accent) 30%, var(--border))';
        if (count === 2) return 'color-mix(in oklab, var(--accent) 55%, var(--border))';
        if (count < 5) return 'color-mix(in oklab, var(--accent) 75%, transparent)';
        return 'var(--accent)';
    };

    return (
        <div className="px-3 py-2.5" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Flame size={12} style={{ color: streak > 0 ? 'var(--accent-strong)' : 'var(--fg-dim)' }} />
                    <span className="text-[12px] font-medium" style={{ color: 'var(--fg)' }}>
                        {streak} {streak === 1 ? 'day' : 'days'}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--fg-dim)' }}>
                        streak
                    </span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>
                    {counts.size} active
                </span>
            </div>
            <div className="flex gap-[2px]" aria-label={`Writing activity over the last ${WEEKS} weeks`}>
                {columns.map((col, ci) => (
                    <div key={ci} className="flex flex-col gap-[2px]">
                        {col.map((cell, ri) => (
                            <div
                                key={ri}
                                className="w-[10px] h-[10px] rounded-xs"
                                style={{
                                    background: cell ? intensity(cell.count) : 'transparent',
                                }}
                                title={cell ? `${dayKey(cell.date)} — ${cell.count} note${cell.count === 1 ? '' : 's'}` : ''}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
