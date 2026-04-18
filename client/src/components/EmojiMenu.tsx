'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import type { EmojiEntry } from '@/lib/emoji-data';

type Props = {
    items: EmojiEntry[];
    command: (item: EmojiEntry) => void;
};

const EmojiMenu = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>((props, ref) => {
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

    if (props.items.length === 0) return null;

    return (
        <div className="surface w-[220px] py-0.5 shadow-lg max-h-[220px] overflow-y-auto">
            {props.items.map((item, idx) => {
                const active = idx === cursor;
                return (
                    <button
                        key={item.name}
                        type="button"
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => props.command(item)}
                        className="w-full flex items-center gap-2 px-2.5 py-1 text-left"
                        style={{
                            background: active ? 'var(--bg-hover)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg-muted)',
                        }}
                    >
                        <span className="text-base leading-none">{item.char}</span>
                        <span className="text-xs font-mono">:{item.name}:</span>
                    </button>
                );
            })}
        </div>
    );
});

EmojiMenu.displayName = 'EmojiMenu';
export default EmojiMenu;
