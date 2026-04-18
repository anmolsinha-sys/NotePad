'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { WikilinkNote } from '@/lib/wikilink-state';

type Props = {
    items: WikilinkNote[];
    command: (item: WikilinkNote) => void;
    query?: string;
};

const WikilinkMenu = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>((props, ref) => {
    const [cursor, setCursor] = useState(0);
    useEffect(() => setCursor(0), [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === 'ArrowDown') {
                setCursor((c) => (c + 1) % Math.max(props.items.length, 1));
                return true;
            }
            if (event.key === 'ArrowUp') {
                setCursor((c) => (c - 1 + props.items.length) % Math.max(props.items.length, 1));
                return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
                const item = props.items[cursor];
                if (item) props.command(item);
                return true;
            }
            return false;
        },
    }));

    return (
        <div className="surface w-[260px] py-1 shadow-lg max-h-[280px] overflow-y-auto">
            <div className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--fg-dim)' }}>
                Link to note
            </div>
            {props.items.length === 0 ? (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--fg-dim)' }}>
                    No matching notes{props.query ? ` for “${props.query}”` : ''}
                </div>
            ) : (
                props.items.map((item, idx) => {
                    const active = idx === cursor;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setCursor(idx)}
                            onClick={() => props.command(item)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm"
                            style={{
                                background: active ? 'var(--bg-hover)' : 'transparent',
                                color: active ? 'var(--fg)' : 'var(--fg-muted)',
                            }}
                        >
                            <span className="font-mono text-[11px]" style={{ color: 'var(--fg-dim)' }}>[[</span>
                            <span className="flex-1 truncate">{item.title || 'Untitled'}</span>
                        </button>
                    );
                })
            )}
        </div>
    );
});

WikilinkMenu.displayName = 'WikilinkMenu';
export default WikilinkMenu;
