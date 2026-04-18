'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';

export default function DueDatePicker({
    initial,
    onSave,
    onClear,
    onClose,
}: {
    initial: string | null;
    onSave: (iso: string) => void;
    onClear: () => void;
    onClose: () => void;
}) {
    const [value, setValue] = useState<string>(initial || todayStr());

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-xs surface p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} style={{ color: 'var(--accent-strong)' }} />
                        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Due date</span>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost p-1"><X size={14} /></button>
                </div>

                <input
                    type="date"
                    className="input mb-3"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />

                <div className="flex gap-2">
                    <button type="button" className="btn btn-primary text-xs flex-1" onClick={() => { onSave(value); onClose(); }}>
                        Save
                    </button>
                    {initial && (
                        <button type="button" className="btn btn-ghost text-xs" onClick={() => { onClear(); onClose(); }}>
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
