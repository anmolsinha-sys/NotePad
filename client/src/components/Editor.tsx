'use client';

import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Image from '@tiptap/extension-image';
import ImageResize from 'tiptap-extension-resize-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Mermaid } from '@/lib/mermaid-extension';
import { useState, useEffect, useRef } from 'react';
import {
    Bold, Italic, List, ListOrdered,
    Code, Quote, Undo, Redo,
    Highlighter, Underline as UnderlineIcon, Image as ImageIcon,
    Save, Download, Tag as TagIcon, X, Terminal, Check, Sparkles, FileType, Share2,
    Heading1, Heading2, Type, ChevronDown
} from 'lucide-react';
import { exportToPDF } from '@/lib/export';
import { notesApi } from '@/lib/api';
import socket, {
    joinNoteRoom, emitNoteUpdate, subscribeToNoteUpdate,
    emitCursorMove, subscribeToUsersUpdate, subscribeToCursorMove
} from '@/lib/socket';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const lowlight = createLowlight(common);

interface EditorProps {
    initialContent?: string;
    initialTags?: string[];
    noteId?: string;
    onSave?: (content: string, tags: string[]) => void;
    isShared?: boolean;
    editable?: boolean;
    theme?: 'cyberpunk' | 'minimalist' | 'deepsea' | 'default';
}

const TiptapEditor = ({ initialContent = '', initialTags = [], noteId, onSave, isShared, editable = true, theme = 'default' }: EditorProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [tags, setTags] = useState<string[]>(initialTags);
    const [tagInput, setTagInput] = useState('');
    const lastEmittedContent = useRef<string>(initialContent);
    const isApplyingRemoteUpdate = useRef<boolean>(false);
    const [showBlockMenu, setShowBlockMenu] = useState(false);
    const [showTextSizeMenu, setShowTextSizeMenu] = useState(false);
    const textSizeMenuRef = useRef<HTMLDivElement>(null);
    const blockMenuRef = useRef<HTMLDivElement>(null);

    // Real-time Presence State
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const activeUsersRef = useRef<any[]>([]);
    useEffect(() => { activeUsersRef.current = activeUsers; }, [activeUsers]);
    const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});

    // Resolve Current User
    const [currentUser, setCurrentUser] = useState<any>(null);
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse user from localStorage');
            }
        }
    }, []);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
            }),
            Underline,
            Highlight.configure({ multicolor: true }),
            CodeBlockLowlight.configure({
                lowlight,
            }),
            Mermaid,
            Placeholder.configure({
                placeholder: 'Start typing your note...',
            }),
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-2xl border border-white/10 shadow-2xl mx-auto block max-w-full my-8',
                },
            }),
            ImageResize,
        ],
        content: initialContent,
        editable,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-invert max-w-none focus:outline-none min-h-[600px] p-12 rounded-b-3xl selection:bg-blue-500/30 selection:text-blue-100 relative transition-all duration-700',
                    theme === 'cyberpunk' && 'prose-cyberpunk border-x-4 border-b-4 border-fuchsia-600/30 shadow-[0_0_50px_rgba(232,121,249,0.1)]',
                    theme === 'minimalist' && 'prose-minimalist bg-white text-[#0d1117] selection:bg-blue-200 selection:text-blue-900 border-x border-b border-gray-100',
                    theme === 'deepsea' && 'prose-deepsea bg-gradient-to-br from-[#0c1b2f] to-[#040e1b] border-x-2 border-b-2 border-cyan-500/20 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)]',
                    theme === 'default' && 'glass-morphism border-x border-b border-white/5'
                ),
            },
        },
        onUpdate: ({ editor }) => {
            if (isApplyingRemoteUpdate.current) return;
            const content = editor.getHTML();
            if (noteId && isShared && content !== lastEmittedContent.current) {
                lastEmittedContent.current = content;
                emitNoteUpdate(noteId, content);
            }
        },
        onSelectionUpdate: ({ editor }) => {
            if (noteId && isShared && editable) {
                const { from } = editor.state.selection;
                emitCursorMove(noteId, from, { name: currentUser?.name || 'Guest' });
            }
        }
    });

    useEffect(() => {
        if (editor && editor.isEditable !== editable) {
            editor.setEditable(editable);
        }
    }, [editable, editor]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await notesApi.uploadImage(formData);
            const imageUrl = res.data?.data?.url || res.data?.url;
            if (imageUrl) {
                editor.chain().focus().setImage({ src: imageUrl }).run();
            } else {
                toast.error('Image uploaded but no URL returned.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to upload image.');
        }
        // Reset the input so the same file can be re-uploaded
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Collaborate Presence & Cursors Logic
    useEffect(() => {
        if (!(noteId && isShared && editor)) return;

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
            setActiveUsers(users.filter((u) => u.socketId !== socket?.id));
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
            } catch {
                // Cursor position out of range during sync — ignore.
            }
        });

        return () => {
            unsubUpdates();
            unsubUsers();
            unsubCursors();
            unsubRoom();
        };
    }, [noteId, isShared, editor, currentUser]);

    const handleSave = async () => {
        if (!editor || !noteId) return;
        setIsSaving(true);
        try {
            await notesApi.updateNote(noteId, { content: editor.getHTML(), tags });
            onSave?.(editor.getHTML(), tags);
            toast.success('Saved');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const handleGistExport = () => {
        if (!editor) return;
        const plainText = editor.getHTML().replace(/<[^>]*>/g, '');
        window.open(`https://gist.github.com/?content=${encodeURIComponent(plainText)}`, '_blank');
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (textSizeMenuRef.current && !textSizeMenuRef.current.contains(e.target as Node)) {
                setShowTextSizeMenu(false);
            }
            if (blockMenuRef.current && !blockMenuRef.current.contains(e.target as Node)) {
                setShowBlockMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!editor) return null;

    return (
        <div className="relative group/editor">
            {/* Presence Avatars */}
            {isShared && activeUsers.length > 0 && (
                <div className="absolute -top-12 right-6 flex items-center gap-2 z-50 animate-fade-in">
                    <div className="flex -space-x-3">
                        {activeUsers.map(user => (
                            <div key={user.socketId} className="w-10 h-10 rounded-full border-4 border-[#0d1117] flex items-center justify-center text-xs font-black text-white shadow-xl relative group/avatar" style={{ backgroundColor: user.color }}>
                                {user.name.charAt(0).toUpperCase()}
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#161b22] border border-white/10 rounded-lg text-[10px] font-bold text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity z-50">{user.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={cn(
                "flex flex-col w-full max-w-4xl mx-auto my-12 transition-all duration-700 relative",
                theme === 'minimalist' ? 'bg-white shadow-[0_50px_100px_rgba(0,0,0,0.05)] border-gray-100 rounded-3xl' : 'bg-[#0d1117]/80 border-white/5 rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)]'
            )}>

                {editable && (
                    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 p-1 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl backdrop-blur-3xl overflow-hidden ring-4 ring-black/20">
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('bold') && 'text-blue-500 bg-blue-500/10')}><Bold size={14} /></button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('italic') && 'text-blue-500 bg-blue-500/10')}><Italic size={14} /></button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('highlight') && 'text-blue-500 bg-blue-500/10')}><Highlighter size={14} /></button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('code') && 'text-blue-500 bg-blue-500/10')}><Code size={14} /></button>
                    </BubbleMenu>
                )}

                {/* Hidden file input for image upload */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />

                {/* TOOLBAR */}
                {editable && (
                    <div data-html2canvas-ignore="true" className={cn(
                        "flex flex-wrap items-center gap-1.5 p-5 border-b sticky top-0 z-20 backdrop-blur-2xl transition-all duration-700",
                        theme === 'minimalist' ? 'border-gray-100 bg-white/80 rounded-t-3xl' : 'border-white/5 bg-white/2 rounded-t-3xl'
                    )}>
                        {/* Formatting Group */}
                        <div className="flex items-center gap-1">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleBold().run()} className={cn('tool-icon', editor.isActive('bold') && 'active')}><Bold size={16} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleItalic().run()} className={cn('tool-icon', editor.isActive('italic') && 'active')}><Italic size={16} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.isActive('underline') ? (editor.chain().focus() as any).unsetUnderline().run() : (editor.chain().focus() as any).setUnderline().run()} className={cn('tool-icon', editor.isActive('underline') && 'active')}><UnderlineIcon size={16} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn('tool-icon', editor.isActive('highlight') && 'active')}><Highlighter size={16} /></button>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        {/* Text Size Dropdown */}
                        <div className="relative" ref={textSizeMenuRef}>
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setShowTextSizeMenu(!showTextSizeMenu); setShowBlockMenu(false); }}
                                className={cn('tool-icon flex items-center gap-1 px-3!', (showTextSizeMenu || editor.isActive('heading')) && 'active')}
                                title="Text Size"
                            >
                                <Type size={16} />
                                <ChevronDown size={12} />
                            </button>
                            {showTextSizeMenu && (
                                <div className="absolute top-full left-0 mt-2 w-44 bg-[#161b22] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-3xl overflow-hidden z-50 py-1">
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().setParagraph().run(); setShowTextSizeMenu(false); }} className={cn("text-size-btn", !editor.isActive('heading') && 'text-white bg-white/5')}>
                                        <Type size={14} className="text-gray-400" /> <span>Normal Text</span>
                                    </button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setShowTextSizeMenu(false); }} className={cn("text-size-btn", editor.isActive('heading', { level: 1 }) && 'text-white bg-white/5')}>
                                        <Heading1 size={14} className="text-blue-500" /> <span className="text-base font-black">Heading 1</span>
                                    </button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setShowTextSizeMenu(false); }} className={cn("text-size-btn", editor.isActive('heading', { level: 2 }) && 'text-white bg-white/5')}>
                                        <Heading2 size={14} className="text-indigo-500" /> <span className="text-sm font-bold">Heading 2</span>
                                    </button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setShowTextSizeMenu(false); }} className={cn("text-size-btn", editor.isActive('heading', { level: 3 }) && 'text-white bg-white/5')}>
                                        <FileType size={14} className="text-purple-500" /> <span className="text-xs font-semibold">Heading 3</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        {/* Block Insert Dropdown (replaces FloatingMenu) */}
                        <div className="relative" ref={blockMenuRef}>
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setShowBlockMenu(!showBlockMenu); setShowTextSizeMenu(false); }}
                                className={cn('tool-icon flex items-center gap-1 px-3!', showBlockMenu && 'active')}
                                title="Insert Block"
                            >
                                <Sparkles size={16} />
                                <ChevronDown size={12} />
                            </button>
                            {showBlockMenu && (
                                <div className="absolute top-full left-0 mt-2 w-52 bg-[#161b22] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-3xl overflow-hidden z-50 py-1">
                                    <div className="px-3 py-2 text-[9px] font-black uppercase text-gray-600 tracking-widest border-b border-white/5">Insert Block</div>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { (editor.chain() as any).focus().toggleBulletList().run(); setShowBlockMenu(false); }} className="block-menu-btn"><List size={14} className="text-emerald-500" /> Bullet List</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { (editor.chain() as any).focus().toggleOrderedList().run(); setShowBlockMenu(false); }} className="block-menu-btn"><ListOrdered size={14} className="text-teal-500" /> Numbered List</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { (editor.chain() as any).focus().toggleCodeBlock().run(); setShowBlockMenu(false); }} className="block-menu-btn"><Terminal size={14} className="text-amber-500" /> Code Snippet</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { (editor.chain() as any).focus().toggleBlockquote().run(); setShowBlockMenu(false); }} className="block-menu-btn"><Quote size={14} className="text-cyan-500" /> Quote</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { (editor.chain() as any).focus().insertContent({ type: 'mermaid' }).run(); setShowBlockMenu(false); }} className="block-menu-btn"><Sparkles size={14} className="text-fuchsia-500" /> Mermaid Diagram</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => { fileInputRef.current?.click(); setShowBlockMenu(false); }} className="block-menu-btn"><ImageIcon size={14} className="text-pink-500" /> Insert Image</button>
                                </div>
                            )}
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        {/* Direct action buttons */}
                        <div className="flex items-center gap-1">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => (editor.chain() as any).focus().toggleCodeBlock().run()} className={cn('tool-icon', editor.isActive('codeBlock') && 'active')} title="Code Block"><Terminal size={16} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="tool-icon" title="Insert Image"><ImageIcon size={16} /></button>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        <div className="flex items-center gap-1">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().undo().run()} className="tool-icon" title="Undo"><Undo size={16} /></button>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => editor.chain().focus().redo().run()} className="tool-icon" title="Redo"><Redo size={16} /></button>
                        </div>

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        <div className="flex items-center gap-2">
                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => exportToPDF('editor-content-target', `Note-${noteId}`)} className="tool-icon" title="Export PDF"><Download size={16} /></button>
                        </div>

                        <div className="grow"></div>

                        <button onClick={handleSave} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all", isSaving ? "bg-blue-600/30 text-blue-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 active:scale-95")}>
                            {isSaving ? <Save className="animate-spin" size={16} /> : <Check size={16} />}
                            {isSaving ? 'Syncing' : 'Sync Artifact'}
                        </button>
                    </div>
                )}

                {editable && (
                    <div data-html2canvas-ignore="true" className="flex items-center flex-wrap gap-2 px-8 py-3 bg-white/1 border-b border-white/5">
                        <TagIcon size={12} className="text-gray-500 mr-2" />
                        {tags.map(tag => (
                            <span key={tag} className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] text-gray-500 font-black tracking-widest uppercase">
                                {tag}
                                <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500"><X size={10} /></button>
                            </span>
                        ))}
                        <input type="text" placeholder="Add Milestone Tags..." className="bg-transparent border-none focus:outline-none text-[10px] text-gray-600 font-bold uppercase tracking-widest ml-2 py-1 flex-1" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} />
                    </div>
                )}

                <div className="relative p-12" id="editor-content-target">
                    <EditorContent editor={editor} />

                    {/* Remote Cursors */}
                    {isShared && Object.entries(remoteCursors).map(([id, cursor]: [string, any]) => (
                        <div key={id} className="absolute pointer-events-none z-60 transition-all duration-200" style={{ left: cursor.x, top: cursor.y }}>
                            <div className="w-[2px] h-[1.5em] relative animate-cursor-blink" style={{ backgroundColor: cursor.color }}>
                                <div className="absolute -top-7 left-0 px-2 py-1 rounded-lg text-[9px] font-black text-white whitespace-nowrap shadow-2xl" style={{ backgroundColor: cursor.color }}>{cursor.name}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <style jsx global>{`
                    .tool-icon { padding: 0.625rem; border-radius: 1rem; color: #4b5563; transition: all 0.3s; border: 1px solid transparent; }
                    .tool-icon:hover { color: white; background: rgba(255,255,255,0.05); }
                    .tool-icon.active { color: #3b82f6; background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.2); }
                    
                    .block-menu-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; font-size: 0.75rem; font-weight: 700; color: #9ca3af; transition: all 0.2s; width: 100%; text-align: left; }
                    .block-menu-btn:hover { color: white; background: rgba(37,99,235,0.1); }
                    
                    .text-size-btn { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; font-size: 0.75rem; font-weight: 700; color: #9ca3af; transition: all 0.2s; width: 100%; text-align: left; }
                    .text-size-btn:hover { color: white; background: rgba(37,99,235,0.1); }
                    
                    .prose { font-family: 'Inter', sans-serif; font-size: 1.125rem; line-height: 1.8; color: #adb5bd; }
                    .prose-minimalist { font-family: 'Inter', sans-serif; color: #1a1a1a; letter-spacing: -0.01em; }
                    .prose-minimalist h1, .prose-minimalist h2 { color: #000; }
                    
                    .prose h1 { margin-top: 3rem; font-size: 2.5rem; font-weight: 900; color: white; letter-spacing: -0.05em; margin-bottom: 1.5rem; }
                    .prose h2 { margin-top: 2.5rem; font-size: 2rem; font-weight: 800; color: #e5e7eb; letter-spacing: -0.04em; margin-bottom: 1.25rem; }
                    .prose h3 { margin-top: 2rem; font-size: 1.5rem; font-weight: 700; color: #d1d5db; letter-spacing: -0.03em; margin-bottom: 1rem; }
                    .prose p { margin-bottom: 1.25rem; }
                    
                    .prose-cyberpunk h1 { color: #f0abfc; text-shadow: 0 0 20px rgba(232,121,249,0.5); }
                    .prose-cyberpunk h2 { color: #c084fc; text-shadow: 0 0 15px rgba(192,132,252,0.4); }
                    .prose-cyberpunk h3 { color: #a855f7; text-shadow: 0 0 10px rgba(168,85,247,0.3); }
                    
                    .prose pre { background: #0b0e14; border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; padding: 1.5rem; margin: 2rem 0; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative; }
                    .prose-deepsea pre { background: #051933; border-color: #004e92; box-shadow: 0 0 30px rgba(0,78,146,0.3); }
                    
                    .mermaid-render svg { transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
                    .mermaid-render svg:hover { transform: scale(1.02); }
                `}</style>
            </div>
        </div>
    );
};

export default TiptapEditor;
