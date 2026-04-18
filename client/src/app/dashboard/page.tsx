'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notesApi, authApi } from '@/lib/api';
import TiptapEditor from '@/components/Editor';
import ShareModal from '@/components/ShareModal';
import CommandPalette, { type PaletteItem } from '@/components/CommandPalette';
import KeyboardHelp from '@/components/KeyboardHelp';
import HistoryDrawer from '@/components/HistoryDrawer';
import SettingsPanel from '@/components/SettingsPanel';
import StreakHeatmap from '@/components/StreakHeatmap';
import BacklinksPanel from '@/components/BacklinksPanel';
import GraphView from '@/components/GraphView';
import LockScreen from '@/components/LockScreen';
import DueDatePicker from '@/components/DueDatePicker';
import CommentsPanel from '@/components/CommentsPanel';
import { setWikilinkNotes } from '@/lib/wikilink-state';
import { encryptWithPassphrase, decryptWithPassphrase, isEncryptedPayload } from '@/lib/crypto';
import { exportToPDF } from '@/lib/export';
import { htmlToMarkdown, markdownToHtml, downloadMarkdown } from '@/lib/markdown';
import {
    Plus, Search, LogOut, Pin, Trash2, Share2,
    FileText, Command, History, Focus, Settings as SettingsIcon, Menu, Calendar, MessageSquare,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { disconnectSocket, emitTitleUpdate, subscribeToTitleUpdate, subscribeToConnectionState } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow, parseISO } from 'date-fns';

const relativeDate = (iso: string | Date | null | undefined) => {
    if (!iso) return '';
    try {
        const d = typeof iso === 'string' ? parseISO(iso) : iso;
        return formatDistanceToNow(d, { addSuffix: true });
    } catch {
        return '';
    }
};

type Note = {
    id: string;
    title: string;
    content: string;
    tags?: string[];
    is_pinned?: boolean;
    is_public?: boolean;
    is_encrypted?: boolean;
    due_date?: string | null;
    updated_at?: string;
    owner_id?: string;
    collaborators?: string[];
};

export default function Dashboard() {
    const router = useRouter();

    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

    // Status bar state
    const [connectionState, setConnectionState] = useState<string>('disconnected');
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [collaboratorCount, setCollaboratorCount] = useState<number>(0);

    // Overlays
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isGraphOpen, setIsGraphOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [typewriter, setTypewriter] = useState(false);

    // Encryption: noteId -> plaintext content + passphrase, in-memory only
    const [passphrases, setPassphrases] = useState<Record<string, string>>({});
    const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});
    const [lockMode, setLockMode] = useState<'idle' | 'lock'>('idle');
    const [dueDateOpen, setDueDateOpen] = useState(false);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [commentCount, setCommentCount] = useState(0);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('np.typewriter');
            if (stored !== null) setTypewriter(stored === '1');
        } catch {}
    }, []);
    useEffect(() => {
        try { localStorage.setItem('np.typewriter', typewriter ? '1' : '0'); } catch {}
    }, [typewriter]);

    // init
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const authRes = await authApi.validate();
                if (cancelled) return;
                const validatedUser = authRes.data.data.user;
                setUser(validatedUser);
                try { localStorage.setItem('user', JSON.stringify(validatedUser)); } catch {}

                const notesRes = await notesApi.getNotes();
                if (cancelled) return;
                const fetched: Note[] = notesRes.data.data.notes || [];
                setNotes(fetched);
                if (fetched.length > 0) setSelectedNote(fetched[0]);
            } catch {
                if (!cancelled) router.push('/auth');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [router]);

    // connection status feed
    useEffect(() => {
        return subscribeToConnectionState(setConnectionState);
    }, []);

    // realtime title updates for the selected note
    useEffect(() => {
        if (!selectedNote) return;
        const unsub = subscribeToTitleUpdate((newTitle) => {
            setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, title: newTitle } : n));
            setSelectedNote(prev => prev && prev.id === selectedNote.id ? { ...prev, title: newTitle } : prev);
        });
        return unsub;
    }, [selectedNote?.id]);

    useEffect(() => () => disconnectSocket(), []);

    // Feed wikilink suggestion with current notes
    useEffect(() => {
        setWikilinkNotes(notes.map((n) => ({
            id: n.id,
            title: n.title || 'Untitled',
            content: n.content,
            updated_at: n.updated_at,
        })));
    }, [notes]);

    // Handle wikilink clicks: jump to that note
    useEffect(() => {
        const onOpen = (e: Event) => {
            const id = (e as CustomEvent).detail?.target;
            if (!id) return;
            const target = notes.find((n) => n.id === id);
            if (target) setSelectedNote(target);
        };
        document.addEventListener('wikilink:open', onOpen);
        return () => document.removeEventListener('wikilink:open', onOpen);
    }, [notes]);

    // actions
    const createNote = useCallback(async () => {
        try {
            const res = await notesApi.createNote({ title: 'Untitled', content: '', tags: [] });
            const note: Note = res.data.data.note;
            setNotes(prev => [note, ...prev]);
            setSelectedNote(note);
            toast.success('Note created');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not create note');
        }
    }, []);

    const confirmDelete = () => {
        const note = pendingDelete;
        if (!note) return;
        setPendingDelete(null);

        // Optimistically remove; show toast with Undo; commit after 10s.
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        if (selectedNote?.id === note.id) {
            setSelectedNote((prev) => {
                if (prev?.id !== note.id) return prev;
                const remaining = notes.filter((n) => n.id !== note.id);
                return remaining[0] || null;
            });
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            if (cancelled) return;
            try {
                await notesApi.deleteNote(note.id);
            } catch (err: any) {
                setNotes((prev) => [note, ...prev]);
                toast.error(err?.response?.data?.message || 'Could not delete note');
            }
        }, 10_000);

        toast(`"${note.title || 'Untitled'}" deleted`, {
            duration: 10_000,
            action: {
                label: 'Undo',
                onClick: () => {
                    cancelled = true;
                    clearTimeout(timer);
                    setNotes((prev) => [note, ...prev]);
                    setSelectedNote(note);
                },
            },
        });
    };

    const togglePin = async (note: Note) => {
        const next = !note.is_pinned;
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: next } : n));
        try {
            await notesApi.updateNote(note.id, { is_pinned: next });
        } catch (err: any) {
            setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: !next } : n));
            toast.error(err?.response?.data?.message || 'Could not update pin');
        }
    };

    const updateTitle = async (id: string, title: string) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        try {
            await notesApi.updateNote(id, { title: trimmed });
            setNotes(prev => prev.map(n => n.id === id ? { ...n, title: trimmed } : n));
            setSelectedNote(prev => prev && prev.id === id ? { ...prev, title: trimmed } : prev);
            emitTitleUpdate(id, trimmed);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not rename note');
        }
    };

    const handlePublicChange = (next: boolean) => {
        if (!selectedNote) return;
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, is_public: next } : n));
        setSelectedNote(prev => prev ? { ...prev, is_public: next } : prev);
    };

    const logout = () => {
        Cookies.remove('token');
        try { localStorage.removeItem('user'); } catch {}
        disconnectSocket();
        router.push('/auth');
    };

    // derived data
    const filtered = notes.filter(n => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q
            || (n.title || '').toLowerCase().includes(q)
            || (n.content || '').toLowerCase().includes(q);
        const matchesTag = activeTag ? (n.tags || []).includes(activeTag) : true;
        return matchesSearch && matchesTag;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (!!b.is_pinned !== !!a.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
        const ad = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bd = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bd - ad;
    });

    const pinned = sorted.filter(n => n.is_pinned);
    const unpinned = sorted.filter(n => !n.is_pinned);

    const todayStr = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const dueNotes = sorted.filter((n) => n.due_date && n.due_date <= todayStr);
    const overdueBadgeFor = (iso?: string | null): string | null => {
        if (!iso) return null;
        if (iso < todayStr) return 'Overdue';
        if (iso === todayStr) return 'Today';
        return null;
    };

    const allTags: string[] = Array.from(new Set(notes.flatMap(n => n.tags || [])));

    // Global keybindings
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsPaletteOpen((v) => !v);
            } else if (mod && e.key.toLowerCase() === 'n' && !e.shiftKey) {
                e.preventDefault();
                createNote();
            } else if (mod && e.key === '/') {
                e.preventDefault();
                setIsHelpOpen((v) => !v);
            } else if (mod && e.key === '.') {
                e.preventDefault();
                setFocusMode((v) => !v);
            } else if (mod && e.shiftKey && e.key.toLowerCase() === 'g') {
                e.preventDefault();
                setIsGraphOpen((v) => !v);
            } else if (e.key === 'Escape' && focusMode) {
                setFocusMode(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [createNote, focusMode]);

    const lockNote = async (passphrase: string): Promise<boolean> => {
        if (!selectedNote) return false;
        try {
            const plain = decryptedContent[selectedNote.id] ?? selectedNote.content ?? '';
            const cipher = await encryptWithPassphrase(plain, passphrase);
            await notesApi.updateNote(selectedNote.id, { content: cipher, is_encrypted: true });
            setNotes((prev) => prev.map((n) => n.id === selectedNote.id ? { ...n, content: cipher, is_encrypted: true } : n));
            setSelectedNote((prev) => prev ? { ...prev, content: cipher, is_encrypted: true } : prev);
            setPassphrases((prev) => ({ ...prev, [selectedNote.id]: passphrase }));
            setDecryptedContent((prev) => ({ ...prev, [selectedNote.id]: plain }));
            setLockMode('idle');
            toast.success('Note locked');
            return true;
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not lock note');
            return false;
        }
    };

    const unlockNote = async (passphrase: string): Promise<boolean> => {
        if (!selectedNote) return false;
        const plain = await decryptWithPassphrase(selectedNote.content, passphrase);
        if (plain === null) return false;
        setPassphrases((prev) => ({ ...prev, [selectedNote.id]: passphrase }));
        setDecryptedContent((prev) => ({ ...prev, [selectedNote.id]: plain }));
        return true;
    };

    const setDueDate = async (iso: string | null) => {
        if (!selectedNote) return;
        try {
            await notesApi.updateNote(selectedNote.id, { due_date: iso });
            setNotes((prev) => prev.map((n) => n.id === selectedNote.id ? { ...n, due_date: iso } : n));
            setSelectedNote((prev) => prev ? { ...prev, due_date: iso } : prev);
            toast.success(iso ? `Due ${iso}` : 'Due date cleared');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not update due date');
        }
    };

    const removePassword = async () => {
        if (!selectedNote) return;
        const plain = decryptedContent[selectedNote.id];
        if (!plain) {
            toast.error('Unlock the note first');
            return;
        }
        try {
            await notesApi.updateNote(selectedNote.id, { content: plain, is_encrypted: false });
            setNotes((prev) => prev.map((n) => n.id === selectedNote.id ? { ...n, content: plain, is_encrypted: false } : n));
            setSelectedNote((prev) => prev ? { ...prev, content: plain, is_encrypted: false } : prev);
            setPassphrases((prev) => {
                const { [selectedNote.id]: _, ...rest } = prev;
                return rest;
            });
            toast.success('Password removed');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not remove password');
        }
    };

    const exportMarkdown = () => {
        if (!selectedNote) return;
        const md = htmlToMarkdown(selectedNote.content || '');
        const safeTitle = (selectedNote.title || 'note').replace(/[^\w-]/g, '_') || 'note';
        downloadMarkdown(safeTitle, md);
        toast.success('Markdown exported');
    };

    const importMarkdownFiles = async (files: File[]) => {
        const mdFiles = files.filter((f) => /\.(md|markdown|txt)$/i.test(f.name));
        if (mdFiles.length === 0) {
            toast.error('Drop a .md file to import');
            return;
        }
        let imported = 0;
        for (const file of mdFiles) {
            try {
                const text = await file.text();
                const html = markdownToHtml(text);
                const title = file.name.replace(/\.(md|markdown|txt)$/i, '') || 'Imported note';
                const res = await notesApi.createNote({ title, content: html, tags: [] });
                setNotes((prev) => [res.data.data.note, ...prev]);
                imported += 1;
            } catch (err: any) {
                toast.error(err?.response?.data?.message || `Could not import ${file.name}`);
            }
        }
        if (imported > 0) toast.success(`Imported ${imported} ${imported === 1 ? 'note' : 'notes'}`);
    };

    const onFilesDropped = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) importMarkdownFiles(files);
    };

    // Palette items
    const paletteItems: PaletteItem[] = (() => {
        const items: PaletteItem[] = [
            { id: 'act:new', section: 'Actions', icon: 'plus', label: 'New note', hint: '⌘N', run: createNote },
            { id: 'act:help', section: 'Actions', icon: 'keyboard', label: 'Keyboard shortcuts', hint: '⌘/', run: () => setIsHelpOpen(true) },
            { id: 'act:graph', section: 'Actions', icon: 'note', label: 'Open graph view', hint: '⌘⇧G', run: () => setIsGraphOpen(true) },
            ...(selectedNote ? [
                { id: 'act:share', section: 'Actions' as const, icon: 'share' as const, label: 'Share current note', run: () => setIsShareModalOpen(true) },
                { id: 'act:history', section: 'Actions' as const, icon: 'note' as const, label: 'Version history', run: () => setIsHistoryOpen(true) },
                { id: 'act:focus', section: 'Actions' as const, icon: 'note' as const, label: focusMode ? 'Exit focus mode' : 'Focus mode', hint: '⌘.', run: () => setFocusMode((v) => !v) },
                { id: 'act:pdf', section: 'Actions' as const, icon: 'export' as const, label: 'Export current note as PDF', run: () => exportToPDF('editor-content-target', `Note-${selectedNote.id}`) },
                { id: 'act:md', section: 'Actions' as const, icon: 'export' as const, label: 'Export current note as Markdown', run: exportMarkdown },
                selectedNote.is_encrypted
                    ? { id: 'act:unlock', section: 'Actions' as const, icon: 'note' as const, label: 'Remove password from this note', run: () => removePassword() }
                    : { id: 'act:lock', section: 'Actions' as const, icon: 'note' as const, label: 'Lock note with password', run: () => setLockMode('lock') },
                { id: 'act:due', section: 'Actions' as const, icon: 'note' as const, label: selectedNote.due_date ? 'Change due date' : 'Set due date', run: () => setDueDateOpen(true) },
            ] : []),
            { id: 'act:logout', section: 'Actions', icon: 'logout', label: 'Sign out', run: logout },
        ];
        for (const n of notes) {
            items.push({
                id: `note:${n.id}`,
                section: 'Notes',
                icon: 'note',
                label: n.title || 'Untitled',
                hint: relativeDate(n.updated_at),
                run: () => setSelectedNote(n),
            });
        }
        for (const t of allTags) {
            items.push({
                id: `tag:${t}`,
                section: 'Tags',
                icon: 'tag',
                label: `#${t}`,
                run: () => setActiveTag(activeTag === t ? null : t),
            });
        }
        return items;
    })();

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{ background: 'var(--bg)', color: 'var(--fg)' }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={onFilesDropped}
        >
            {/* Mobile sidebar backdrop */}
            {isSidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 z-30 bg-black/50"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'flex flex-col shrink-0 transition-all duration-150',
                    'md:w-[260px]',
                    'max-md:fixed max-md:left-0 max-md:top-0 max-md:bottom-0 max-md:z-40 max-md:w-[260px] max-md:transform',
                    !isSidebarOpen && 'max-md:-translate-x-full',
                    focusMode && 'md:w-0 md:overflow-hidden md:opacity-0 md:pointer-events-none'
                )}
                style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-panel)' }}
            >
                <div className="h-11 px-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 px-1">
                        <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                            <span className="font-mono text-[10px] font-bold" style={{ color: '#00120a' }}>N</span>
                        </div>
                        <span className="text-[13px] font-medium">Notepad</span>
                    </div>
                    <button
                        onClick={createNote}
                        className="btn btn-ghost p-1"
                        title="New note (⌘N)"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                <div className="px-2 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="relative">
                        <Search
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            size={13}
                            style={{ color: 'var(--fg-dim)' }}
                        />
                        <input
                            type="text"
                            placeholder="Search"
                            className="input py-1.5 text-[13px]"
                            style={{ paddingLeft: '1.875rem' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <StreakHeatmap notes={notes} />

                {/* Notes list */}
                <div className="flex-1 overflow-y-auto px-1 py-2">
                    {dueNotes.length > 0 && (
                        <>
                            <SectionHeader label="Due" count={dueNotes.length} />
                            {dueNotes.map((n) => (
                                <NoteRow
                                    key={`due:${n.id}`}
                                    note={n}
                                    active={selectedNote?.id === n.id}
                                    badge={overdueBadgeFor(n.due_date) || undefined}
                                    onSelect={() => setSelectedNote(n)}
                                    onPin={() => togglePin(n)}
                                    onDelete={() => setPendingDelete(n)}
                                />
                            ))}
                        </>
                    )}
                    {pinned.length > 0 && (
                        <>
                            <SectionHeader label="Pinned" count={pinned.length} />
                            {pinned.map(n => (
                                <NoteRow key={n.id} note={n} active={selectedNote?.id === n.id}
                                    onSelect={() => setSelectedNote(n)}
                                    onPin={() => togglePin(n)}
                                    onDelete={() => setPendingDelete(n)} />
                            ))}
                        </>
                    )}
                    <SectionHeader label="All notes" count={unpinned.length} />
                    {unpinned.length === 0 && pinned.length === 0 ? (
                        <div className="px-3 py-6 text-center text-[12px]" style={{ color: 'var(--fg-dim)' }}>
                            {notes.length === 0 ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileText size={18} style={{ color: 'var(--fg-dim)' }} />
                                    <span>No notes yet</span>
                                    <button onClick={createNote} className="btn btn-primary mt-1 px-3 py-1 text-[11px]">
                                        <Plus size={11} /> New note
                                    </button>
                                </div>
                            ) : (
                                <span>No matches</span>
                            )}
                        </div>
                    ) : unpinned.map(n => (
                        <NoteRow key={n.id} note={n} active={selectedNote?.id === n.id}
                            onSelect={() => setSelectedNote(n)}
                            onPin={() => togglePin(n)}
                            onDelete={() => setPendingDelete(n)} />
                    ))}

                    {allTags.length > 0 && (
                        <>
                            <SectionHeader label="Tags" count={allTags.length} />
                            <div className="px-2 pb-2 flex flex-wrap gap-1">
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                        className={cn(
                                            'text-[11px] font-mono px-2 py-0.5 rounded-xs border transition-colors',
                                            activeTag === tag ? 'text-accent-400 border-accent-500' : ''
                                        )}
                                        style={{
                                            borderColor: activeTag === tag ? 'var(--accent)' : 'var(--border)',
                                            background: activeTag === tag ? 'var(--accent-weak)' : 'transparent',
                                            color: activeTag === tag ? 'var(--accent-strong)' : 'var(--fg-muted)',
                                        }}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* User footer */}
                <div className="h-11 px-2 flex items-center justify-between gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 min-w-0 px-1">
                        <div className="w-6 h-6 rounded-sm flex items-center justify-center font-mono text-[11px] font-semibold"
                            style={{ background: 'var(--bg-hover)', color: 'var(--fg)' }}>
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                            <div className="text-[12px] truncate" style={{ color: 'var(--fg)' }}>{user?.username}</div>
                            <div className="text-[10px] truncate font-mono" style={{ color: 'var(--fg-dim)' }}>{user?.email}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => setIsSettingsOpen((v) => !v)}
                            className="btn btn-ghost p-1"
                            title="Settings"
                        >
                            <SettingsIcon size={13} />
                        </button>
                        <button onClick={logout} className="btn btn-ghost p-1" title="Sign out">
                            <LogOut size={13} />
                        </button>
                    </div>
                    {isSettingsOpen && (
                        <>
                            <div
                                onClick={() => setIsSettingsOpen(false)}
                                className="fixed inset-0 z-40"
                            />
                            <div
                                className="fixed z-50 surface shadow-xl"
                                style={{ bottom: 52, left: 8, width: 244 }}
                            >
                                <SettingsPanel
                                    typewriter={typewriter}
                                    onTypewriterChange={setTypewriter}
                                />
                            </div>
                        </>
                    )}
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header
                    className={cn(
                        'h-11 px-3 md:px-4 flex items-center justify-between gap-2 md:gap-3 shrink-0 transition-opacity duration-150',
                        focusMode && 'opacity-30 hover:opacity-100'
                    )}
                    style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
                >
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden btn btn-ghost p-1"
                        aria-label="Open sidebar"
                    >
                        <Menu size={14} />
                    </button>
                    {selectedNote ? (
                        <input
                            key={selectedNote.id}
                            type="text"
                            defaultValue={selectedNote.title}
                            onBlur={(e) => updateTitle(selectedNote.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="bg-transparent border-none outline-none text-sm font-medium flex-1 min-w-0 focus:ring-0"
                            style={{ color: 'var(--fg)' }}
                            placeholder="Untitled"
                        />
                    ) : <div />}

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsPaletteOpen(true)}
                            className="btn btn-ghost py-1 px-2 text-xs"
                            title="Command palette (⌘K)"
                        >
                            <Command size={11} /> <span className="kbd hidden md:inline-flex">K</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFocusMode((v) => !v)}
                            className="btn btn-ghost py-1 px-2 text-xs"
                            title="Focus mode (⌘.)"
                        >
                            <Focus size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={() => selectedNote && setIsCommentsOpen(true)}
                            disabled={!selectedNote}
                            className="btn btn-ghost py-1 px-2 text-xs relative"
                            title="Comments"
                        >
                            <MessageSquare size={12} />
                            {commentCount > 0 && (
                                <span className="text-[10px] font-mono ml-1" style={{ color: 'var(--accent-strong)' }}>{commentCount}</span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => selectedNote && setIsHistoryOpen(true)}
                            disabled={!selectedNote}
                            className="btn btn-ghost py-1 px-2 text-xs"
                            title="Version history"
                        >
                            <History size={12} /> History
                        </button>
                        <button
                            type="button"
                            onClick={() => selectedNote && setIsShareModalOpen(true)}
                            disabled={!selectedNote}
                            className="btn btn-ghost py-1 px-2 text-xs"
                        >
                            <Share2 size={12} /> Share
                        </button>
                    </div>
                </header>

                {/* Editor area */}
                <div className="flex-1 overflow-y-auto" data-scroll-root style={{ background: 'var(--bg)' }}>
                    {selectedNote ? (
                        <div className="max-w-3xl mx-auto px-8 py-8">
                            {lockMode === 'lock' ? (
                                <LockScreen
                                    mode="lock"
                                    onSubmit={lockNote}
                                    onCancel={() => setLockMode('idle')}
                                />
                            ) : selectedNote.is_encrypted && !passphrases[selectedNote.id] ? (
                                <LockScreen mode="unlock" onSubmit={unlockNote} />
                            ) : (
                                <>
                                    <TiptapEditor
                                        key={selectedNote.id + ':' + (passphrases[selectedNote.id] ? 'decrypted' : 'plain')}
                                        noteId={selectedNote.id}
                                        initialContent={
                                            selectedNote.is_encrypted
                                                ? (decryptedContent[selectedNote.id] || '')
                                                : selectedNote.content
                                        }
                                        initialTags={selectedNote.tags || []}
                                        isShared={!selectedNote.is_encrypted}
                                        editable={true}
                                        typewriter={typewriter}
                                        wrapContent={
                                            selectedNote.is_encrypted && passphrases[selectedNote.id]
                                                ? async (plain: string) => {
                                                    setDecryptedContent((prev) => ({ ...prev, [selectedNote.id]: plain }));
                                                    return encryptWithPassphrase(plain, passphrases[selectedNote.id]);
                                                }
                                                : undefined
                                        }
                                        onSave={(content, tags) => {
                                            const storedContent = selectedNote.is_encrypted ? selectedNote.content : content;
                                            setNotes(prev => prev.map(n => n.id === selectedNote.id
                                                ? { ...n, content: storedContent, tags, updated_at: new Date().toISOString() }
                                                : n));
                                            setLastSavedAt(new Date());
                                        }}
                                        onCollaboratorsChange={setCollaboratorCount}
                                    />
                                    <BacklinksPanel
                                        notes={notes}
                                        currentNoteId={selectedNote.id}
                                        onOpen={(id) => {
                                            const target = notes.find((n) => n.id === id);
                                            if (target) setSelectedNote(target);
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-3">
                            <FileText size={22} style={{ color: 'var(--fg-dim)' }} />
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No note selected</p>
                            <button onClick={createNote} className="btn btn-primary text-xs">
                                <Plus size={12} /> New note
                            </button>
                        </div>
                    )}
                </div>

                {/* Status bar */}
                <div
                    className={cn(
                        'h-7 px-4 flex items-center justify-between gap-4 text-[11px] font-mono shrink-0 transition-opacity duration-150',
                        focusMode && 'opacity-30 hover:opacity-100'
                    )}
                    style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--fg-dim)' }}
                >
                    <div className="flex items-center gap-3">
                        {selectedNote && (
                            <>
                                <span>{countWords(selectedNote.content)} words</span>
                                <span style={{ color: 'var(--border-strong)' }}>·</span>
                                <span>
                                    {lastSavedAt ? `saved ${relativeDate(lastSavedAt)}` : 'autosave on'}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <ConnectionDot state={connectionState} />
                        {collaboratorCount > 0 && (
                            <span>{collaboratorCount} online</span>
                        )}
                    </div>
                </div>
            </main>

            {selectedNote && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    noteId={selectedNote.id}
                    noteTitle={selectedNote.title}
                    isPublic={selectedNote.is_public || false}
                    onPublicChange={handlePublicChange}
                />
            )}

            <CommandPalette
                open={isPaletteOpen}
                onClose={() => setIsPaletteOpen(false)}
                items={paletteItems}
            />

            <KeyboardHelp
                open={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />

            <HistoryDrawer
                open={isHistoryOpen}
                noteId={selectedNote?.id || null}
                currentContent={selectedNote?.content || ''}
                onClose={() => setIsHistoryOpen(false)}
                onRestored={(content, title) => {
                    if (!selectedNote) return;
                    setNotes(prev => prev.map(n => n.id === selectedNote.id ? { ...n, content, title: title || n.title } : n));
                    setSelectedNote(prev => prev ? { ...prev, content, title: title || prev.title } : prev);
                }}
            />

            <GraphView
                open={isGraphOpen}
                notes={notes}
                onClose={() => setIsGraphOpen(false)}
                onOpenNote={(id) => {
                    const target = notes.find((n) => n.id === id);
                    if (target) setSelectedNote(target);
                }}
            />

            {dueDateOpen && selectedNote && (
                <DueDatePicker
                    initial={selectedNote.due_date || null}
                    onSave={(iso) => setDueDate(iso)}
                    onClear={() => setDueDate(null)}
                    onClose={() => setDueDateOpen(false)}
                />
            )}

            <CommentsPanel
                open={isCommentsOpen}
                noteId={selectedNote?.id || null}
                currentUserId={user?.id || null}
                onClose={() => setIsCommentsOpen(false)}
                onCountChange={setCommentCount}
            />

            {pendingDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div onClick={() => setPendingDelete(null)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative w-full max-w-sm p-5 rounded surface">
                        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>Delete this note?</h3>
                        <p className="text-xs mb-4 truncate" style={{ color: 'var(--fg-muted)' }}>
                            &ldquo;{pendingDelete.title}&rdquo; will be permanently removed.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setPendingDelete(null)} className="btn btn-ghost text-xs">Cancel</button>
                            <button onClick={confirmDelete} className="btn text-xs" style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <span className="text-[10px] uppercase tracking-wide font-medium" style={{ color: 'var(--fg-dim)' }}>{label}</span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--fg-dim)' }}>{count}</span>
        </div>
    );
}

function NoteRow({ note, active, badge, onSelect, onPin, onDelete }: {
    note: Note; active: boolean; badge?: string; onSelect: () => void; onPin: () => void; onDelete: () => void;
}) {
    return (
        <div
            onClick={onSelect}
            className={cn(
                'group px-3 py-1.5 rounded-sm cursor-pointer flex items-center gap-2 transition-colors',
                active ? 'bg-[var(--bg-hover)]' : 'hover:bg-[var(--bg-hover)]'
            )}
        >
            {note.is_pinned
                ? <Pin size={10} style={{ color: 'var(--accent-strong)' }} className="shrink-0" />
                : <div className="w-2.5 shrink-0" />}
            <span
                className="text-[13px] truncate flex-1"
                style={{ color: active ? 'var(--fg)' : 'var(--fg-muted)' }}
            >
                {note.title || 'Untitled'}
            </span>
            {badge && (
                <span
                    className="text-[9px] font-mono uppercase tracking-wide px-1 py-px rounded-xs"
                    style={{
                        background: badge === 'Overdue' ? '#ef4444' : 'var(--accent)',
                        color: badge === 'Overdue' ? 'white' : '#00120a',
                    }}
                >
                    {badge}
                </span>
            )}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onPin(); }}
                    className="p-0.5 rounded-xs hover:bg-[var(--border)]"
                    title={note.is_pinned ? 'Unpin' : 'Pin'}
                >
                    <Pin size={10} style={{ color: note.is_pinned ? 'var(--accent-strong)' : 'var(--fg-dim)' }} />
                </button>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-0.5 rounded-xs hover:bg-[var(--border)]"
                    title="Delete"
                >
                    <Trash2 size={10} style={{ color: 'var(--fg-dim)' }} />
                </button>
            </div>
        </div>
    );
}

function ConnectionDot({ state }: { state: string }) {
    const color = state === 'connected' ? 'var(--accent)' :
                  state === 'reconnecting' || state === 'connecting' ? 'var(--warning)' :
                  'var(--fg-dim)';
    const label = state === 'connected' ? 'connected' :
                  state === 'reconnecting' ? 'reconnecting' :
                  state === 'connecting' ? 'connecting' :
                  'offline';
    return (
        <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span>{label}</span>
        </span>
    );
}

function countWords(html: string): number {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
}
