'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { EnhancedCodeBlock } from '@/lib/code-block';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import { common, createLowlight } from 'lowlight';
import '@tiptap/extension-image';
import { FlexImage } from '@/lib/flex-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Mermaid } from '@/lib/mermaid-extension';
import { SlashCommands } from '@/lib/slash-commands';
import { SmartSnippets } from '@/lib/smart-snippets';
import { Wikilink } from '@/lib/wikilink';
import { ImageGallery } from '@/lib/image-gallery';
import { navigateToNote } from '@/lib/wikilink-state';
import { useState, useEffect, useRef } from 'react';
import {
    Bold, Italic, List, ListOrdered,
    Code, Quote, Undo, Redo,
    Highlighter, Underline as UnderlineIcon, Image as ImageIcon,
    Save, Download, Tag as TagIcon, X, Terminal, Sparkles, Type,
    Heading1, Heading2, Heading3, Images,
    AlignLeft, AlignCenter, AlignRight, Trash2, Move, Anchor,
} from 'lucide-react';
import { exportToPDF } from '@/lib/export';
import { notesApi } from '@/lib/api';
import socket, {
    joinNoteRoom, emitNoteUpdate, subscribeToNoteUpdate,
    emitCursorMove, subscribeToUsersUpdate, subscribeToCursorMove,
} from '@/lib/socket';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ColorPicker from '@/components/ColorPicker';

const lowlight = createLowlight(common);

interface EditorProps {
    initialContent?: string;
    initialTags?: string[];
    noteId?: string;
    onSave?: (content: string, tags: string[]) => void;
    isShared?: boolean;
    editable?: boolean;
    typewriter?: boolean;
    onCollaboratorsChange?: (count: number) => void;
    wrapContent?: (plain: string) => Promise<string> | string;
}

const AUTOSAVE_DELAY = 800;

const TiptapEditor = ({
    initialContent = '',
    initialTags = [],
    noteId,
    onSave,
    isShared,
    editable = true,
    typewriter = false,
    onCollaboratorsChange,
    wrapContent,
}: EditorProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [tags, setTags] = useState<string[]>(initialTags);
    const [tagInput, setTagInput] = useState('');
    const lastEmittedContent = useRef<string>(initialContent);
    const isApplyingRemoteUpdate = useRef<boolean>(false);
    const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const activeUsersRef = useRef<any[]>([]);
    useEffect(() => { activeUsersRef.current = activeUsers; }, [activeUsers]);

    const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});

    const [currentUser, setCurrentUser] = useState<any>(null);
    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) setCurrentUser(JSON.parse(stored));
        } catch {}
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const editorRef = useRef<any>(null);

    const uploadOneRef = useRef<(file: File) => Promise<string | null>>(async () => null);
    const handleDroppedImagesRef = useRef<(files: File[]) => Promise<void>>(async () => {});
    const smartPasteUrlRef = useRef<(url: string) => void>(() => {});
    const smartPasteCodeRef = useRef<(code: string, language: string) => void>(() => {});
    const typewriterScrollRaf = useRef<number | null>(null);

    const isTempId = noteId?.startsWith('temp-') ?? false;

    const saveNow = async (content: string, nextTags: string[]) => {
        if (!noteId || !editable || isTempId) return;
        setIsSaving(true);
        try {
            const payload = wrapContent ? await wrapContent(content) : content;
            await notesApi.updateNote(noteId, { content: payload, tags: nextTags });
            onSave?.(content, nextTags);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Autosave failed');
        } finally {
            setIsSaving(false);
        }
    };

    const scheduleAutosave = (content: string, nextTags: string[]) => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => saveNow(content, nextTags), AUTOSAVE_DELAY);
    };

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ codeBlock: false }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            EnhancedCodeBlock.configure({ lowlight }),
            Mermaid,
            Placeholder.configure({ placeholder: "Start typing. '/' for commands." }),
            FlexImage.configure({ inline: true }),
            ImageGallery,
            Table.configure({ resizable: true, HTMLAttributes: { class: 'np-table' } }),
            TableRow,
            TableHeader,
            TableCell,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: false,
                protocols: ['http', 'https', 'mailto'],
                HTMLAttributes: { target: '_blank', rel: 'noreferrer noopener nofollow' },
            }),
            SlashCommands,
            SmartSnippets,
            Wikilink,
        ],
        content: initialContent,
        editable,
        immediatelyRender: false,
        editorProps: {
            attributes: { class: 'focus:outline-none' },
            handleClick(_view, _pos, event) {
                const target = event.target as HTMLElement;
                const wl = target.closest('a[data-type="wikilink"]') as HTMLAnchorElement | null;
                if (wl) {
                    event.preventDefault();
                    const id = wl.getAttribute('data-target');
                    if (id) navigateToNote(id);
                    return true;
                }
                return false;
            },
            handleDrop(_view, event) {
                if (!editorRef.current?.isEditable) return true;
                const dt = (event as DragEvent).dataTransfer;
                if (!dt || dt.files.length === 0) return false;
                const images = Array.from(dt.files).filter((f) => f.type.startsWith('image/'));
                if (images.length === 0) return false;
                event.preventDefault();
                handleDroppedImagesRef.current(images);
                return true;
            },
            handlePaste(_view, event) {
                if (!editorRef.current?.isEditable) return true;
                const dt = (event as ClipboardEvent).clipboardData;
                if (!dt) return false;

                // Image files first
                if (dt.files.length > 0) {
                    const images = Array.from(dt.files).filter((f) => f.type.startsWith('image/'));
                    if (images.length > 0) {
                        event.preventDefault();
                        handleDroppedImagesRef.current(images);
                        return true;
                    }
                }

                const text = dt.getData('text/plain');
                if (!text) return false;

                const trimmedAll = text.trim();

                // Block bookmarklet source — user is trying to install, not paste.
                if (/^javascript:/i.test(trimmedAll)) {
                    event.preventDefault();
                    toast.info('That looks like a bookmarklet. Add it as a new browser bookmark instead of pasting it here.');
                    return true;
                }

                // Lone URL -> link (and async-fetch title)
                if (/^https?:\/\/\S+$/i.test(trimmedAll) && !/\s/.test(trimmedAll)) {
                    event.preventDefault();
                    smartPasteUrlRef.current(trimmedAll);
                    return true;
                }

                // JSON -> code block
                const trimmed = trimmedAll;
                if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        const pretty = JSON.stringify(parsed, null, 2);
                        event.preventDefault();
                        smartPasteCodeRef.current(pretty, 'json');
                        return true;
                    } catch { /* fall through */ }
                }

                // YAML-ish heuristic — multi-line with key: value, no HTML
                if (/\n/.test(text) && /^[\w-]+:\s/.test(trimmed) && !/<[a-z][\s\S]*>/i.test(trimmed)) {
                    event.preventDefault();
                    smartPasteCodeRef.current(text, 'yaml');
                    return true;
                }

                return false;
            },
        },
        onUpdate: ({ editor }) => {
            if (isApplyingRemoteUpdate.current) return;
            const content = editor.getHTML();
            if (noteId && isShared && !isTempId && content !== lastEmittedContent.current) {
                lastEmittedContent.current = content;
                emitNoteUpdate(noteId, content);
            }
            scheduleAutosave(content, tags);
        },
        onSelectionUpdate: ({ editor }) => {
            if (noteId && isShared && editable) {
                const { from } = editor.state.selection;
                emitCursorMove(noteId, from, {
                    name: currentUser?.username || currentUser?.name || 'Guest',
                });
            }

            // Typewriter mode: re-center the caret. Skip while a range is being selected,
            // because firing scrollBy on every selection update during a drag-select stacks
            // smooth-scroll animations and makes the page feel jumpy / hyper-sensitive.
            if (typewriterRef.current && editor.state.selection.empty) {
                if (typewriterScrollRaf.current) cancelAnimationFrame(typewriterScrollRaf.current);
                typewriterScrollRaf.current = requestAnimationFrame(() => {
                    typewriterScrollRaf.current = null;
                    if (editor.isDestroyed) return;
                    try {
                        const { from } = editor.state.selection;
                        const coords = editor.view.coordsAtPos(from);
                        const scroller = editor.view.dom.closest('[data-scroll-root]') as HTMLElement | null;
                        if (scroller) {
                            const rect = scroller.getBoundingClientRect();
                            const targetTop = rect.top + rect.height / 2;
                            const delta = coords.top - targetTop;
                            if (Math.abs(delta) > 8) scroller.scrollBy({ top: delta, behavior: 'auto' });
                        } else {
                            const delta = coords.top - window.innerHeight / 2;
                            if (Math.abs(delta) > 8) window.scrollBy({ top: delta, behavior: 'auto' });
                        }
                    } catch {}
                });
            }
        },
    });

    const typewriterRef = useRef(typewriter);
    useEffect(() => { typewriterRef.current = typewriter; }, [typewriter]);
    useEffect(() => () => {
        if (typewriterScrollRaf.current) cancelAnimationFrame(typewriterScrollRaf.current);
    }, []);

    useEffect(() => {
        editorRef.current = editor;
        if (editor && editor.isEditable !== editable) editor.setEditable(editable);
    }, [editable, editor]);

    useEffect(() => {
        smartPasteUrlRef.current = (url: string) => {
            const ed = editorRef.current;
            if (!ed) return;
            // Insert link via the Link mark so it renders as a clickable anchor, not raw HTML text.
            const insertLink = (text: string) => {
                ed.chain()
                    .focus()
                    .insertContent([
                        { type: 'text', text, marks: [{ type: 'link', attrs: { href: url } }] },
                        { type: 'text', text: ' ' },
                    ])
                    .run();
            };
            const startPos = ed.state.selection.from;
            insertLink(url);
            notesApi.urlMeta(url)
                .then((res) => {
                    const title = res.data?.data?.title;
                    if (!title || ed.isDestroyed) return;
                    // Replace the URL text we just inserted with the resolved title.
                    const endPos = startPos + url.length;
                    ed.chain()
                        .focus()
                        .insertContentAt(
                            { from: startPos, to: endPos },
                            { type: 'text', text: title, marks: [{ type: 'link', attrs: { href: url } }] }
                        )
                        .run();
                })
                .catch(() => {});
        };
        smartPasteCodeRef.current = (code: string, language: string) => {
            const ed = editorRef.current;
            if (!ed) return;
            (ed.chain() as any).focus().insertContent({
                type: 'codeBlock',
                attrs: { language },
                content: [{ type: 'text', text: code }],
            }).run();
        };
        uploadOneRef.current = async (file: File) => {
            const formData = new FormData();
            formData.append('image', file);
            try {
                const res = await notesApi.uploadImage(formData);
                return res.data?.data?.url || res.data?.url || null;
            } catch (err: any) {
                toast.error(err?.response?.data?.message || 'Image upload failed');
                return null;
            }
        };
        handleDroppedImagesRef.current = async (files: File[]) => {
            const ed = editorRef.current;
            if (!ed || files.length === 0) return;
            const capped = files.slice(0, 4);
            if (capped.length === 1) {
                const url = await uploadOneRef.current(capped[0]);
                if (url) ed.chain().focus().setImage({ src: url }).run();
                return;
            }
            const results = await Promise.all(capped.map((f) => uploadOneRef.current(f)));
            const items = results
                .map((src, i) => (src ? { src, alt: capped[i]?.name || '' } : null))
                .filter((x): x is { src: string; alt: string } => Boolean(x));
            if (items.length === 1) {
                ed.chain().focus().setImage({ src: items[0].src }).run();
            } else if (items.length > 1) {
                ed.chain().focus().insertGallery(items).run();
            }
        };
    });

    useEffect(() => {
        return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
    }, []);

    // Slash-menu -> open image / gallery picker
    useEffect(() => {
        const openImg = () => fileInputRef.current?.click();
        const openGallery = () => galleryInputRef.current?.click();
        document.addEventListener('editor:open-image-picker', openImg);
        document.addEventListener('editor:open-gallery-picker', openGallery);
        return () => {
            document.removeEventListener('editor:open-image-picker', openImg);
            document.removeEventListener('editor:open-gallery-picker', openGallery);
        };
    }, []);

    const uploadOne = async (file: File): Promise<string | null> => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await notesApi.uploadImage(formData);
            return res.data?.data?.url || res.data?.url || null;
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Image upload failed');
            return null;
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;
        const url = await uploadOne(file);
        if (url) editor.chain().focus().setImage({ src: url }).run();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDroppedImages = async (files: File[]) => {
        if (!editor || files.length === 0) return;
        const capped = files.slice(0, 4);
        if (capped.length === 1) {
            const url = await uploadOne(capped[0]);
            if (url) editor.chain().focus().setImage({ src: url }).run();
            return;
        }
        const results = await Promise.all(capped.map(uploadOne));
        const items = results
            .map((src, i) => (src ? { src, alt: capped[i]?.name || '' } : null))
            .filter((x): x is { src: string; alt: string } => Boolean(x));
        if (items.length === 1) {
            editor.chain().focus().setImage({ src: items[0].src }).run();
        } else if (items.length > 1) {
            editor.chain().focus().insertGallery(items).run();
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        await handleDroppedImages(files);
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    // Realtime presence
    useEffect(() => {
        if (!(noteId && isShared && editor) || isTempId) return;

        const userName = currentUser?.username || currentUser?.name || `Guest-${Math.floor(Math.random() * 1000)}`;
        const userEmail = currentUser?.email || 'guest@notepad.local';

        const unsubRoom = joinNoteRoom(noteId, { name: userName, email: userEmail });

        const unsubUpdates = subscribeToNoteUpdate((newContent: string) => {
            if (editor.isDestroyed) return;
            if (editor.getHTML() === newContent) return;
            isApplyingRemoteUpdate.current = true;
            lastEmittedContent.current = newContent;
            editor.commands.setContent(newContent, false);
            queueMicrotask(() => { isApplyingRemoteUpdate.current = false; });
        });

        const unsubUsers = subscribeToUsersUpdate((users: any[]) => {
            const others = users.filter((u) => u.socketId !== socket?.id);
            setActiveUsers(others);
            onCollaboratorsChange?.(others.length);
        });

        const unsubCursors = subscribeToCursorMove((data: any) => {
            if (editor.isDestroyed) return;
            const { socketId, pos, user } = data;
            try {
                const coords = editor.view.coordsAtPos(pos);
                const domRect = editor.view.dom.getBoundingClientRect();
                const userInfo = activeUsersRef.current.find((u) => u.socketId === socketId);

                setRemoteCursors((prev) => ({
                    ...prev,
                    [socketId]: {
                        x: coords.left - domRect.left,
                        y: coords.top - domRect.top,
                        name: user?.name || 'Guest',
                        color: userInfo?.color || '#10b981',
                    },
                }));
            } catch {}
        });

        return () => {
            unsubUpdates();
            unsubUsers();
            unsubCursors();
            unsubRoom();
            onCollaboratorsChange?.(0);
        };
    }, [noteId, isShared, editor, currentUser]);

    const handleSave = async () => {
        if (!editor) return;
        await saveNow(editor.getHTML(), tags);
        toast.success('Saved');
    };

    // Keyboard: ⌘/Ctrl+S => save
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [editor, tags]);

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            const trimmed = tagInput.trim();
            if (!tags.includes(trimmed)) {
                const next = [...tags, trimmed];
                setTags(next);
                if (editor) scheduleAutosave(editor.getHTML(), next);
            }
            setTagInput('');
        }
        if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            const next = tags.slice(0, -1);
            setTags(next);
            if (editor) scheduleAutosave(editor.getHTML(), next);
        }
    };

    const removeTag = (tag: string) => {
        const next = tags.filter(t => t !== tag);
        setTags(next);
        if (editor) scheduleAutosave(editor.getHTML(), next);
    };

    if (!editor) return null;

    return (
        <div className="relative">
            {/* Toolbar */}
            {editable && (
                <div
                    data-html2canvas-ignore="true"
                    className="sticky top-0 z-20 flex flex-wrap items-center gap-0.5 py-2 px-0.5 mb-3"
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
                >
                    <ToolButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (⌘B)">
                        <Bold size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (⌘I)">
                        <Italic size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('underline')} onClick={() => (editor.chain() as any).focus().toggleUnderline().run()} title="Underline (⌘U)">
                        <UnderlineIcon size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight (default)">
                        <Highlighter size={13} />
                    </ToolButton>
                    <ColorPicker
                        currentColor={editor.getAttributes('textStyle').color || null}
                        onTextColor={(color) => {
                            const chain = (editor.chain() as any).focus();
                            if (color) chain.setColor(color).run();
                            else chain.unsetColor().run();
                        }}
                        onHighlight={(color) => {
                            const chain = editor.chain().focus();
                            if (color) chain.setHighlight({ color }).run();
                            else chain.unsetHighlight().run();
                        }}
                    />
                    <ToolButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
                        <Code size={13} />
                    </ToolButton>

                    <Divider />

                    <ToolButton active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()} title="Paragraph">
                        <Type size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
                        <Heading1 size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                        <Heading2 size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
                        <Heading3 size={13} />
                    </ToolButton>

                    <Divider />

                    <ToolButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
                        <List size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
                        <ListOrdered size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
                        <Quote size={13} />
                    </ToolButton>
                    <ToolButton active={editor.isActive('codeBlock')} onClick={() => (editor.chain() as any).focus().toggleCodeBlock().run()} title="Code block">
                        <Terminal size={13} />
                    </ToolButton>
                    <ToolButton onClick={() => editor.chain().focus().insertContent({ type: 'mermaid' }).run()} title="Mermaid diagram">
                        <Sparkles size={13} />
                    </ToolButton>
                    <ToolButton onClick={() => fileInputRef.current?.click()} title="Insert image">
                        <ImageIcon size={13} />
                    </ToolButton>
                    <ToolButton onClick={() => galleryInputRef.current?.click()} title="Insert gallery (multiple images in a row)">
                        <Images size={13} />
                    </ToolButton>

                    <Divider />

                    <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
                        <Undo size={13} />
                    </ToolButton>
                    <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
                        <Redo size={13} />
                    </ToolButton>

                    <Divider />

                    <ToolButton onClick={() => exportToPDF('editor-content-target', `Note-${noteId}`)} title="Export PDF">
                        <Download size={13} />
                    </ToolButton>

                    <div className="flex-1" />

                    <button
                        onClick={handleSave}
                        className="btn btn-ghost text-xs"
                        title="Save (⌘S)"
                    >
                        <Save size={12} />
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            )}

            {editable && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100, placement: 'top' }}
                    shouldShow={({ editor, state }) => {
                        const { from, to } = state.selection;
                        return editor.isEditable && from !== to && !editor.isActive('image');
                    }}
                >
                    <div className="surface px-1 py-0.5 flex items-center gap-0.5 shadow-lg">
                        <ToolButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                            <Bold size={12} />
                        </ToolButton>
                        <ToolButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                            <Italic size={12} />
                        </ToolButton>
                        <ToolButton active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}>
                            <Highlighter size={12} />
                        </ToolButton>
                        <ToolButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
                            <Code size={12} />
                        </ToolButton>
                    </div>
                </BubbleMenu>
            )}

            {editable && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100, placement: 'top' }}
                    shouldShow={({ editor }) => editor.isActive('image')}
                >
                    <div className="surface px-1 py-0.5 flex items-center gap-0.5 shadow-lg">
                        <ToolButton
                            active={editor.isActive('image', { mode: 'free' })}
                            onClick={() => (editor.chain() as any).focus().setImageMode('free').run()}
                            title="Free position (drag anywhere)"
                        >
                            <Move size={12} />
                        </ToolButton>
                        <ToolButton
                            active={editor.isActive('image', { mode: 'flow' })}
                            onClick={() => (editor.chain() as any).focus().setImageMode('flow').run()}
                            title="Dock to text flow"
                        >
                            <Anchor size={12} />
                        </ToolButton>
                        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border)' }} />
                        <ToolButton
                            active={editor.isActive('image', { align: 'left' })}
                            onClick={() => (editor.chain() as any).focus().setImageAlign('left').run()}
                            title="Float left"
                        >
                            <AlignLeft size={12} />
                        </ToolButton>
                        <ToolButton
                            active={editor.isActive('image', { align: 'center' })}
                            onClick={() => (editor.chain() as any).focus().setImageAlign('center').run()}
                            title="Center"
                        >
                            <AlignCenter size={12} />
                        </ToolButton>
                        <ToolButton
                            active={editor.isActive('image', { align: 'right' })}
                            onClick={() => (editor.chain() as any).focus().setImageAlign('right').run()}
                            title="Float right"
                        >
                            <AlignRight size={12} />
                        </ToolButton>
                        <ToolButton
                            active={editor.isActive('image', { align: 'inline' })}
                            onClick={() => (editor.chain() as any).focus().setImageAlign('inline').run()}
                            title="Inline with text"
                        >
                            <ImageIcon size={12} />
                        </ToolButton>
                        <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border)' }} />
                        <ToolButton
                            onClick={() => editor.chain().focus().deleteSelection().run()}
                            title="Remove"
                        >
                            <Trash2 size={12} />
                        </ToolButton>
                    </div>
                </BubbleMenu>
            )}

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />
            <input
                type="file"
                ref={galleryInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleGalleryUpload}
            />

            <div className="relative" id="editor-content-target">
                <EditorContent editor={editor} />

                {isShared && Object.entries(remoteCursors).map(([id, cursor]: [string, any]) => (
                    <div key={id} className="absolute pointer-events-none z-10" style={{ left: cursor.x, top: cursor.y }}>
                        <div className="w-[2px] h-[1.3em] animate-cursor-blink" style={{ backgroundColor: cursor.color }}>
                            <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-xs text-[9px] font-mono font-medium text-white whitespace-nowrap" style={{ backgroundColor: cursor.color }}>
                                {cursor.name}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tag strip */}
            {editable && (
                <div
                    data-html2canvas-ignore="true"
                    className="mt-6 flex flex-wrap items-center gap-1.5 pt-3"
                    style={{ borderTop: '1px solid var(--border)' }}
                >
                    <TagIcon size={11} style={{ color: 'var(--fg-dim)' }} />
                    {tags.map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-[11px] font-mono"
                            style={{ background: 'var(--bg-hover)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                        >
                            #{tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-red-400" aria-label={`Remove ${tag}`}>
                                <X size={9} />
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        placeholder="Add tag…"
                        className="bg-transparent border-none focus:outline-none text-[12px] font-mono flex-1 min-w-[80px] py-0.5"
                        style={{ color: 'var(--fg-muted)' }}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={addTag}
                    />
                </div>
            )}
        </div>
    );
};

function ToolButton({
    active, onClick, title, children,
}: {
    active?: boolean; onClick: () => void; title?: string; children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            title={title}
            className={cn(
                'p-1.5 rounded-xs transition-colors',
            )}
            style={{
                color: active ? 'var(--accent-strong)' : 'var(--fg-muted)',
                background: active ? 'var(--accent-weak)' : 'transparent',
            }}
        >
            {children}
        </button>
    );
}

function Divider() {
    return <div className="w-px h-4 mx-0.5" style={{ background: 'var(--border)' }} />;
}

export default TiptapEditor;
