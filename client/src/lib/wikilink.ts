import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import WikilinkMenu from '@/components/WikilinkMenu';
import { getWikilinkNotes, type WikilinkNote } from '@/lib/wikilink-state';

export const Wikilink = Node.create({
    name: 'wikilink',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
        return {
            target: {
                default: '',
                parseHTML: (el: HTMLElement) => el.getAttribute('data-target') || '',
                renderHTML: (attrs: any) => ({ 'data-target': attrs.target }),
            },
            label: {
                default: '',
                parseHTML: (el: HTMLElement) => el.textContent || el.getAttribute('data-label') || '',
                renderHTML: (attrs: any) => ({ 'data-label': attrs.label }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'a[data-type="wikilink"]' }];
    },

    renderHTML({ HTMLAttributes, node }) {
        return [
            'a',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'wikilink',
                class: 'wikilink',
                href: '#',
            }),
            `[[${node.attrs.label || 'note'}]]`,
        ];
    },

    addOptions() {
        return {
            suggestion: {
                char: '[[',
                startOfLine: false,
                allowSpaces: true,
                items: ({ query }: { query: string }): WikilinkNote[] => {
                    const q = query.toLowerCase().trim();
                    const all = getWikilinkNotes();
                    if (!q) return all.slice(0, 8);
                    return all
                        .filter((n) => (n.title || '').toLowerCase().includes(q))
                        .slice(0, 8);
                },
                command: ({ editor, range, props }: any) => {
                    const note = props as WikilinkNote;
                    editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .insertContent([
                            { type: 'wikilink', attrs: { target: note.id, label: note.title || 'Untitled' } },
                            { type: 'text', text: ' ' },
                        ])
                        .run();
                },
                render: () => {
                    let component: ReactRenderer | null = null;
                    let popup: TippyInstance | null = null;

                    return {
                        onStart(props: any) {
                            component = new ReactRenderer(WikilinkMenu, { props, editor: props.editor });
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
                            component?.updateProps(props);
                            popup?.setProps({ getReferenceClientRect: props.clientRect });
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
