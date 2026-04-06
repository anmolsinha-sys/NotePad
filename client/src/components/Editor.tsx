'use client';

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
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
    Save, Download, Tag as TagIcon, X, Terminal, Check, Sparkles, FileType, Share2
} from 'lucide-react';
import { exportToPDF } from '@/lib/export';
import { notesApi } from '@/lib/api';
import socket, {
    joinNoteRoom, emitNoteUpdate, subscribeToNoteUpdate,
    emitCursorMove, subscribeToUsersUpdate, subscribeToCursorMove
} from '@/lib/socket';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import confetti from 'canvas-confetti';

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
    theme?: 'cyberpunk' | 'minimalist' | 'deepsea' | 'default';
}

const TiptapEditor = ({ initialContent = '', initialTags = [], noteId, onSave, isShared, theme = 'default' }: EditorProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [tags, setTags] = useState<string[]>(initialTags);
    const [tagInput, setTagInput] = useState('');
    const lastEmittedContent = useRef<string>(initialContent);

    // Real-time Presence State
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
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
                placeholder: 'Type / for magic commands or ### for headers...',
            }),
            ImageResize,
        ],
        content: initialContent,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-invert max-w-none focus:outline-none min-h-[600px] p-12 rounded-b-[2rem] selection:bg-blue-500/30 selection:text-blue-100 relative transition-all duration-700',
                    theme === 'cyberpunk' && 'prose-cyberpunk border-x-4 border-b-4 border-fuchsia-600/30 shadow-[0_0_50px_rgba(232,121,249,0.1)]',
                    theme === 'minimalist' && 'prose-minimalist bg-white text-[#0d1117] selection:bg-blue-200 selection:text-blue-900 border-x border-b border-gray-100',
                    theme === 'deepsea' && 'prose-deepsea bg-gradient-to-br from-[#0c1b2f] to-[#040e1b] border-x-2 border-b-2 border-cyan-500/20 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)]',
                    theme === 'default' && 'glass-morphism border-x border-b border-white/5'
                ),
            },
        },
        onUpdate: ({ editor }) => {
            const content = editor.getHTML();
            if (noteId && isShared && content !== lastEmittedContent.current) {
                lastEmittedContent.current = content;
                emitNoteUpdate(noteId, content);
            }
        },
        onSelectionUpdate: ({ editor }) => {
            if (noteId && isShared) {
                const { from } = editor.state.selection;
                emitCursorMove(noteId, from, { name: currentUser?.name || 'Guest' });
            }
        }
    });

    // Confetti logic for "Done" or "Completed"
    useEffect(() => {
        const triggers = ['done', 'completed', 'finished', 'winner', 'milestone', 'published'];
        if (tags.some(tag => triggers.includes(tag.toLowerCase()))) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#facc15', '#10b981'],
                disableForReducedMotion: true
            });
        }
    }, [tags]);

    // Collaborate Presence & Cursors Logic
    useEffect(() => {
        if (noteId && isShared && editor) {
            const userName = currentUser?.name || `Guest-${Math.floor(Math.random() * 1000)}`;
            const userEmail = currentUser?.email || 'guest@notepad.local';

            joinNoteRoom(noteId, { name: userName, email: userEmail });

            const unsubUpdates = subscribeToNoteUpdate((newContent) => {
                if (editor.getHTML() !== newContent) {
                    lastEmittedContent.current = newContent;
                    editor.commands.setContent(newContent, false);
                }
            });

            const unsubUsers = subscribeToUsersUpdate((users) => {
                setActiveUsers(users.filter(u => u.socketId !== socket?.id));
            });

            const unsubCursors = subscribeToCursorMove((data) => {
                const { socketId, pos, user } = data;
                try {
                    const coords = editor.view.coordsAtPos(pos);
                    const domRect = editor.view.dom.getBoundingClientRect();
                    const userInfo = activeUsers.find(u => u.socketId === socketId);

                    setRemoteCursors(prev => ({
                        ...prev,
                        [socketId]: {
                            x: coords.left - domRect.left,
                            y: coords.top - domRect.top,
                            name: user.name,
                            color: userInfo?.color || '#3b82f6'
                        }
                    }));
                } catch (e) { }
            });

            return () => {
                unsubUpdates();
                unsubUsers();
                unsubCursors();
            };
        }
    }, [noteId, isShared, editor, activeUsers, currentUser]);

    const handleSave = async () => {
        if (!editor || !noteId) return;
        setIsSaving(true);
        try {
            await notesApi.updateNote(noteId, { content: editor.getHTML(), tags });
            onSave?.(editor.getHTML(), tags);
        } catch (err) {
            console.error('Save failed:', err);
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
                theme === 'minimalist' ? 'bg-white shadow-[0_50px_100px_rgba(0,0,0,0.05)] border-gray-100 rounded-[1.5rem]' : 'bg-[#0d1117]/80 border-white/5 rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6)]'
            )}>

                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 p-1 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl backdrop-blur-3xl overflow-hidden ring-4 ring-black/20">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('bold') && 'text-blue-500 bg-blue-500/10')}><Bold size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('italic') && 'text-blue-500 bg-blue-500/10')}><Italic size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleHighlight().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('highlight') && 'text-blue-500 bg-blue-500/10')}><Highlighter size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleCode().run()} className={cn("p-2 text-gray-400 hover:text-white rounded-lg transition-colors", editor.isActive('code') && 'text-blue-500 bg-blue-500/10')}><Code size={14} /></button>
                </BubbleMenu>

                <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex flex-col gap-1 p-1 bg-[#161b22] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden max-h-[300px] overflow-y-auto no-scrollbar ring-8 ring-black/10">
                    <div className="px-3 py-2 text-[9px] font-black uppercase text-gray-600 tracking-widest border-b border-white/5 mb-1">Slash Magic</div>
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="float-menu-btn"><FileType size={14} className="text-blue-500" /> Heading 1</button>
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="float-menu-btn"><FileType size={14} className="text-indigo-500" /> Heading 2</button>
                    <button onClick={() => (editor.chain() as any).focus().toggleBulletList().run()} className="float-menu-btn"><List size={14} className="text-emerald-500" /> Bullet List</button>
                    <button onClick={() => (editor.chain() as any).focus().toggleCodeBlock().run()} className="float-menu-btn"><Terminal size={14} className="text-amber-500" /> Code Snippet</button>
                    <button onClick={() => (editor.chain() as any).focus().insertContent({ type: 'mermaid' }).run()} className="float-menu-btn"><Sparkles size={14} className="text-fuchsia-500" /> Mermaid Diagram</button>
                </FloatingMenu>

                {/* TOOLBAR */}
                <div data-html2canvas-ignore="true" className={cn(
                    "flex flex-wrap items-center gap-1.5 p-5 border-b sticky top-0 z-20 backdrop-blur-2xl transition-all duration-700",
                    theme === 'minimalist' ? 'border-gray-100 bg-white/80 rounded-t-[1.5rem]' : 'border-white/5 bg-white/[0.02] rounded-t-[2.5rem]'
                )}>
                    <div className="flex items-center gap-1">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn('tool-icon', editor.isActive('bold') && 'active')}><Bold size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn('tool-icon', editor.isActive('italic') && 'active')}><Italic size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn('tool-icon', editor.isActive('underline') && 'active')}><UnderlineIcon size={16} /></button>
                        <button onClick={() => (editor.chain() as any).focus().toggleCodeBlock().run()} className={cn('tool-icon', editor.isActive('codeBlock') && 'active')}><Terminal size={16} /></button>
                    </div>

                    <div className="w-[1px] h-6 bg-white/10 mx-2"></div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => exportToPDF('editor-content-target', `Note-${noteId}`)} className="tool-icon" title="Export PDF"><Download size={16} /></button>
                        <button onClick={handleGistExport} className="tool-icon" title="Publish to GitHub Gist"><Terminal size={16} /></button>
                    </div>

                    <div className="flex-grow"></div>

                    <button onClick={handleSave} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all", isSaving ? "bg-blue-600/30 text-blue-400" : "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 active:scale-95")}>
                        {isSaving ? <Save className="animate-spin" size={16} /> : <Check size={16} />}
                        {isSaving ? 'Syncing' : 'Sync Artifact'}
                    </button>
                </div>

                <div data-html2canvas-ignore="true" className="flex items-center flex-wrap gap-2 px-8 py-3 bg-white/[0.01] border-b border-white/5">
                    <TagIcon size={12} className="text-gray-500 mr-2" />
                    {tags.map(tag => (
                        <span key={tag} className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] text-gray-500 font-black tracking-widest uppercase">
                            {tag}
                            <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-red-500"><X size={10} /></button>
                        </span>
                    ))}
                    <input type="text" placeholder="Add Milestone Tags..." className="bg-transparent border-none focus:outline-none text-[10px] text-gray-600 font-bold uppercase tracking-widest ml-2 py-1 flex-1" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} />
                </div>

                <div className="relative p-12" id="editor-content-target">
                    <EditorContent editor={editor} />

                    {/* Remote Cursors */}
                    {isShared && Object.entries(remoteCursors).map(([id, cursor]: [string, any]) => (
                        <div key={id} className="absolute pointer-events-none z-[60] transition-all duration-200" style={{ left: cursor.x, top: cursor.y }}>
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
                    
                    .float-menu-btn { display: flex; items-center; gap: 1rem; padding: 0.75rem 1.25rem; font-size: 0.75rem; font-weight: 800; color: #9ca3af; transition: all 0.2s; border-radius: 1rem; width: 100%; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; }
                    .float-menu-btn:hover { color: white; background: rgba(37,99,235,0.1); }
                    
                    .prose { font-family: 'Inter', sans-serif; font-size: 1.125rem; line-height: 1.8; color: #adb5bd; }
                    .prose-minimalist { font-family: 'Inter', sans-serif; color: #1a1a1a; letter-spacing: -0.01em; }
                    .prose-minimalist h1, .prose-minimalist h2 { color: #000; }
                    
                    .prose h1 { margin-top: 3rem; font-size: 2.5rem; font-weight: 900; color: white; letter-spacing: -0.05em; }
                    .prose-cyberpunk h1 { color: #f0abfc; text-shadow: 0 0 20px rgba(232,121,249,0.5); }
                    
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
