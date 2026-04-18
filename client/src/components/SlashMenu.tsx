'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Editor, Range } from '@tiptap/core';
import { cn } from '@/lib/utils';

export type SlashItem = {
    title: string;
    hint?: string;
    keywords?: string[];
    run: (ctx: { editor: Editor; range: Range }) => void;
};

type Props = {
    items: SlashItem[];
    command: (item: SlashItem) => void;
};

const SlashMenu = forwardRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean }, Props>((props, ref) => {
    const [cursor, setCursor] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => setCursor(0), [props.items]);

    useEffect(() => {
        const selected = listRef.current?.querySelector('[data-selected="true"]');
        selected?.scrollIntoView({ block: 'nearest' });
    }, [cursor]);

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
            if (event.key === 'Enter') {
                const item = props.items[cursor];
                if (item) props.command(item);
                return true;
            }
            return false;
        },
    }));

    if (props.items.length === 0) {
        return (
            <div className="surface w-[240px] py-1 shadow-lg">
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--fg-dim)' }}>No matches</div>
            </div>
        );
    }

    return (
        <div ref={listRef} className="surface w-[280px] py-1 shadow-lg max-h-[320px] overflow-y-auto">
            {props.items.map((item, idx) => {
                const active = idx === cursor;
                return (
                    <button
                        key={item.title}
                        type="button"
                        data-selected={active}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => props.command(item)}
                        className={cn('w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left')}
                        style={{
                            background: active ? 'var(--bg-hover)' : 'transparent',
                            color: active ? 'var(--fg)' : 'var(--fg-muted)',
                        }}
                    >
                        <span className="text-sm">{item.title}</span>
                        {item.hint && (
                            <span className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>{item.hint}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
});

SlashMenu.displayName = 'SlashMenu';
export default SlashMenu;
