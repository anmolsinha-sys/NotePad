import { Extension, InputRule } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import EmojiMenu from '@/components/EmojiMenu';
import { EMOJI, type EmojiEntry } from '@/lib/emoji-data';
import { format } from 'date-fns';

const formatDate = () => format(new Date(), 'PP');
const formatTime = () => format(new Date(), 'p');
const formatDateTime = () => format(new Date(), 'PP p');

const uuid = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const snippetRule = (token: string, replacement: () => string) =>
    new InputRule({
        find: new RegExp(`${token}\\s$`),
        handler: ({ state, range, match }) => {
            const text = replacement() + ' ';
            const start = range.from;
            const end = range.from + match[0].length;
            state.tr.replaceWith(start, end, state.schema.text(text));
        },
    });

export const SmartSnippets = Extension.create({
    name: 'smartSnippets',

    addInputRules() {
        return [
            snippetRule(':datetime', formatDateTime),
            snippetRule(':date', formatDate),
            snippetRule(':time', formatTime),
            snippetRule(':uuid', uuid),
        ];
    },

    addOptions() {
        return {
            suggestion: {
                pluginKey: new PluginKey('emojiSuggestion'),
                char: ':',
                startOfLine: false,
                allowSpaces: false,
                items: ({ query }: { query: string }): EmojiEntry[] => {
                    const q = query.toLowerCase();
                    if (!q) return [];
                    return EMOJI
                        .filter((e) =>
                            e.name.toLowerCase().includes(q) ||
                            e.keywords?.some((k) => k.toLowerCase().includes(q))
                        )
                        .slice(0, 8);
                },
                command: ({ editor, range, props }: any) => {
                    editor.chain().focus().deleteRange(range).insertContent((props as EmojiEntry).char).run();
                },
                render: () => {
                    let component: ReactRenderer | null = null;
                    let popup: TippyInstance | null = null;

                    return {
                        onStart: (props: any) => {
                            component = new ReactRenderer(EmojiMenu, { props, editor: props.editor });
                            if (!props.clientRect) return;

                            popup = tippy(document.body, {
                                getReferenceClientRect: props.clientRect,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                            });
                        },
                        onUpdate(props: any) {
                            // Only show popup if we have non-empty query with matching items
                            if (props.items && props.items.length > 0) {
                                component?.updateProps(props);
                                popup?.show();
                                popup?.setProps({ getReferenceClientRect: props.clientRect });
                            } else {
                                popup?.hide();
                            }
                        },
                        onKeyDown(props: any) {
                            if (props.event.key === 'Escape') {
                                popup?.hide();
                                return true;
                            }
                            return (component?.ref as any)?.onKeyDown?.(props) || false;
                        },
                        onExit() {
                            popup?.destroy();
                            component?.destroy();
                        },
                    };
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});
