import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import type { Instance as TippyInstance } from 'tippy.js';
import tippy from 'tippy.js';
import SlashMenu, { type SlashItem } from '@/components/SlashMenu';

const makeItems = (): SlashItem[] => [
    {
        title: 'Heading 1',
        hint: '# title',
        keywords: ['h1', 'heading', 'title'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
    },
    {
        title: 'Heading 2',
        hint: '## section',
        keywords: ['h2', 'heading'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
    },
    {
        title: 'Heading 3',
        hint: '### small',
        keywords: ['h3', 'heading'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
    },
    {
        title: 'Bullet list',
        keywords: ['list', 'bullet', 'ul'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
        title: 'Numbered list',
        keywords: ['list', 'ordered', 'ol', 'number'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
        title: 'Quote',
        keywords: ['blockquote', 'citation'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
        title: 'Code block',
        hint: '```',
        keywords: ['code', 'pre', 'snippet'],
        run: ({ editor, range }) => (editor.chain() as any).focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
        title: 'Mermaid diagram',
        keywords: ['mermaid', 'diagram', 'chart'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'mermaid' }).run(),
    },
    {
        title: 'Divider',
        keywords: ['hr', 'rule', 'separator', 'divider'],
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
        title: 'Image',
        keywords: ['image', 'picture', 'photo', 'upload'],
        run: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
            document.dispatchEvent(new CustomEvent('editor:open-image-picker'));
        },
    },
    {
        title: 'Gallery (horizontal)',
        hint: 'side-by-side images',
        keywords: ['gallery', 'images', 'row', 'horizontal', 'grid'],
        run: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
            document.dispatchEvent(new CustomEvent('editor:open-gallery-picker'));
        },
    },
];

export const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                pluginKey: new PluginKey('slashSuggestion'),
                char: '/',
                startOfLine: false,
                items: ({ query }: { query: string }) => {
                    const q = query.toLowerCase().trim();
                    if (!q) return makeItems().slice(0, 10);
                    return makeItems()
                        .filter(it =>
                            it.title.toLowerCase().includes(q) ||
                            it.keywords?.some(k => k.includes(q))
                        )
                        .slice(0, 10);
                },
                command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
                    props.run({ editor, range });
                },
                render: () => {
                    let component: ReactRenderer | null = null;
                    let popup: TippyInstance | null = null;

                    return {
                        onStart: (props: any) => {
                            component = new ReactRenderer(SlashMenu, {
                                props,
                                editor: props.editor,
                            });

                            const rect = props.clientRect?.();
                            if (!rect) return;

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
                            return (component?.ref as any)?.onKeyDown?.(props);
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
