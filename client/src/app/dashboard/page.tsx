'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notesApi, authApi } from '@/lib/api';
import TiptapEditor from '@/components/Editor';
import ShareModal from '@/components/ShareModal';
import {
    Plus, FileText, Search, Settings,
    LogOut, User as UserIcon, Clock, Share2,
    ChevronRight, ChevronLeft, MoreVertical, Trash2, Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import { disconnectSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

export default function Dashboard() {
    const [notes, setNotes] = useState<any[]>([]);
    const [selectedNote, setSelectedNote] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<'default' | 'cyberpunk' | 'minimalist' | 'deepsea'>('default');
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            try {
                const [authRes, notesRes] = await Promise.all([
                    authApi.validate(),
                    notesApi.getNotes()
                ]);
                setUser(authRes.data.data.user);
                setNotes(notesRes.data.data.notes);
                if (notesRes.data.data.notes.length > 0) {
                    setSelectedNote(notesRes.data.data.notes[0]);
                }
            } catch (err) {
                console.error('Initialization failed:', err);
                router.push('/auth');
            } finally {
                setLoading(false);
            }
        };
        init();

        return () => {
            disconnectSocket();
        };
    }, []);

    const handleCreateNote = async () => {
        try {
            const res = await notesApi.createNote({ title: 'Untitled Note', content: '', tags: [] });
            setNotes([res.data.data.note, ...notes]);
            setSelectedNote(res.data.data.note);
        } catch (err) {
            console.error('Failed to create note:', err);
        }
    };

    const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Delete this note?')) return;
        try {
            await notesApi.deleteNote(id);
            const updatedNotes = notes.filter(n => n._id !== id);
            setNotes(updatedNotes);
            if (selectedNote?._id === id) {
                setSelectedNote(updatedNotes[0] || null);
            }
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };

    const handleLogout = () => {
        Cookies.remove('token');
        localStorage.removeItem('user');
        router.push('/auth');
    };

    const filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = activeTag ? note.tags?.includes(activeTag) : true;
        return matchesSearch && matchesTag;
    });

    const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

    if (loading) {
        return (
            <div className="h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-blue-400/5 rounded-full blur-xl animate-pulse"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0d1117] text-gray-200 overflow-hidden font-inter">
            {/* SIDEBAR */}
            <aside className={cn(
                "flex-shrink-0 flex flex-col border-r border-white/5 bg-[#161b22]/50 backdrop-blur-3xl relative z-20 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[20px_0_50px_rgba(0,0,0,0.3)]",
                isSidebarMinimized ? "w-24" : "w-85"
            )}>
                {/* Minimized Overlay Toggle */}
                <button
                    onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center border border-white/10 shadow-2xl transition-all duration-300 z-50 hover:scale-110 active:scale-95 group/toggle"
                >
                    <ChevronLeft size={14} className={cn("text-white transition-transform duration-500", isSidebarMinimized && "rotate-180")} />
                </button>

                {/* Sidebar Header */}
                <div className={cn("p-6 border-b border-white/5 flex items-center justify-between", isSidebarMinimized && "p-4 justify-center flex-col gap-6")}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] shrink-0 ring-2 ring-white/5">
                            <FileText size={22} className="text-white" />
                        </div>
                        {!isSidebarMinimized && (
                            <div className="animate-fade-in truncate">
                                <h1 className="font-black text-xl text-white tracking-tighter italic">Notepad <span className="text-blue-500">UL</span></h1>
                                <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-0.5 opacity-70">Cloud Sync</p>
                            </div>
                        )}
                    </div>
                    {!isSidebarMinimized ? (
                        <button onClick={handleCreateNote} className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all duration-300 shadow-lg shadow-blue-600/20 active:scale-90 border border-white/10 group/new">
                            <Plus size={20} className="group-hover/new:rotate-90 transition-transform" />
                        </button>
                    ) : (
                        <button onClick={handleCreateNote} className="w-12 h-12 bg-white/5 hover:bg-blue-600 rounded-2xl text-gray-400 hover:text-white transition-all duration-300 flex items-center justify-center shadow-inner group/new-mini">
                            <Plus size={24} className="group-hover/new-mini:rotate-90 transition-transform" />
                        </button>
                    )}
                </div>

                {/* Sidebar Search */}
                {!isSidebarMinimized && (
                    <div className="px-6 py-6 animate-fade-in">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search thoughts..."
                                className="w-full bg-[#0d1117]/60 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all duration-300 placeholder:text-gray-600"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Sidebar Tags Filter */}
                {!isSidebarMinimized && allTags.length > 0 && (
                    <div className="px-6 pb-6 animate-fade-in">
                        <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTag(null)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${!activeTag ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                            >
                                All
                            </button>
                            {allTags.map((tag: any) => (
                                <button
                                    key={tag}
                                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${activeTag === tag ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sidebar Notes List */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 mt-2 custom-scrollbar">
                    {!isSidebarMinimized && <h3 className="px-4 py-2 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] animate-fade-in mb-2">Memory Stream</h3>}
                    {filteredNotes.length === 0 ? (
                        !isSidebarMinimized && <div className="p-8 text-center text-gray-600 italic text-sm animate-fade-in">No artifacts found...</div>
                    ) : (
                        [...filteredNotes]
                            .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                            .map((note) => (
                                <motion.div
                                    key={note._id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => setSelectedNote(note)}
                                    className={cn("group relative flex flex-col rounded-[1.5rem] cursor-pointer transition-all duration-300 border-2",
                                        isSidebarMinimized ? "p-3 items-center" : "p-5",
                                        selectedNote?._id === note._id
                                            ? 'bg-blue-600/10 border-blue-500/40 shadow-[0_8px_30px_rgba(0,0,0,0.3)]'
                                            : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                                    )}
                                >
                                    <div className={cn("flex items-center justify-between", !isSidebarMinimized && "mb-3")}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {note.isPinned && <Pin size={isSidebarMinimized ? 16 : 14} className="text-amber-500 fill-amber-500/20 shrink-0" />}
                                            {!isSidebarMinimized && (
                                                <h4 className={cn("font-black text-sm truncate transition-colors", selectedNote?._id === note._id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200')}>
                                                    {note.title}
                                                </h4>
                                            )}
                                        </div>
                                        {!isSidebarMinimized && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        notesApi.updateNote(note._id, { isPinned: !note.isPinned });
                                                        setNotes(notes.map(n => n._id === note._id ? { ...n, isPinned: !n.isPinned } : n));
                                                    }}
                                                    className={cn("p-2 rounded-xl transition-all", note.isPinned ? 'text-amber-500 bg-amber-500/10' : 'text-gray-500 hover:text-white hover:bg-white/10')}
                                                >
                                                    <Pin size={14} className={note.isPinned ? 'fill-current' : ''} />
                                                </button>
                                                <button onClick={(e) => handleDeleteNote(note._id, e)} className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {isSidebarMinimized && !note.isPinned && (
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-sm font-black text-gray-500 transition-all group-hover:bg-blue-600/20 group-hover:text-blue-400 ring-1 ring-white/5">
                                            {note.title[0]?.toUpperCase() || 'N'}
                                        </div>
                                    )}

                                    {!isSidebarMinimized && (
                                        <>
                                            <p className="text-xs text-gray-500 line-clamp-1 mb-4 font-medium opacity-80">
                                                {note.content.replace(/<[^>]*>/g, '') || 'Begin your story...'}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(note.tags || []).slice(0, 2).map((tag: string) => (
                                                        <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] text-gray-500 uppercase font-bold tracking-tight">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                    {note.tags?.length > 2 && <span className="text-[8px] text-gray-600 font-bold">+{note.tags.length - 2}</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-600 uppercase tracking-tighter">
                                                    <Clock size={10} />
                                                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            ))
                    )}
                </div>

                {/* Sidebar Footer */}
                <div className={cn("p-4 border-t border-white/5 bg-[#0d1117]/40 transition-all", isSidebarMinimized && "p-3")}>
                    <div className={cn("flex items-center gap-3 p-3 rounded-[1.25rem] bg-white/[0.03] border border-white/5 shadow-inner transition-all", isSidebarMinimized && "justify-center p-2 rounded-2xl")}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-sm shadow-xl overflow-hidden ring-2 ring-white/10 shrink-0">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {!isSidebarMinimized && (
                            <div className="flex-1 min-w-0 animate-fade-in">
                                <p className="text-sm font-black truncate text-white leading-tight uppercase tracking-tight">{user?.username}</p>
                                <p className="text-[9px] text-gray-500 truncate font-bold uppercase tracking-widest mt-0.5">{user?.email}</p>
                            </div>
                        )}
                        {!isSidebarMinimized && (
                            <button
                                onClick={handleLogout}
                                className="p-2.5 text-gray-500 hover:text-white transition-all hover:bg-red-500/20 hover:text-red-400 rounded-xl group/logout"
                                title="Logout"
                            >
                                <LogOut size={18} className="group-hover/logout:-translate-x-0.5 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col relative overflow-y-auto bg-[#0d1117] custom-scrollbar">
                {/* Background Blobs */}
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -z-10 animate-pulse-slow delay-1000"></div>

                {/* Main Header */}
                <header className="h-24 border-b border-white/5 flex items-center justify-between px-10 bg-[#0d1117]/80 backdrop-blur-xl relative z-20">
                    <div className="flex items-center gap-6">
                        <AnimatePresence mode="wait">
                            {selectedNote ? (
                                <motion.div
                                    key="header-note"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-4"
                                >
                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                        <FileText size={20} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight leading-none uppercase">{selectedNote.title}</h2>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                            Active Perspective
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="text-gray-600 font-black italic uppercase tracking-widest text-sm">Select Your Focus</div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Theme Picker */}
                        <div className="flex items-center gap-1.5 p-1.5 bg-[#161b22] border border-white/5 rounded-2xl mr-4 shadow-inner ring-1 ring-white/5">
                            {(['default', 'cyberpunk', 'minimalist', 'deepsea'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setCurrentTheme(t)}
                                    className={cn(
                                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all group/theme relative",
                                        currentTheme === t ? "bg-blue-600 shadow-lg shadow-blue-600/30" : "hover:bg-white/5"
                                    )}
                                    title={`${t.charAt(0).toUpperCase() + t.slice(1)} Mode`}
                                >
                                    <div className={cn("w-3 h-3 rounded-full transition-transform group-hover/theme:scale-125",
                                        t === 'default' && "bg-slate-400",
                                        t === 'cyberpunk' && "bg-fuchsia-500 shadow-[0_0_8px_rgba(232,121,249,0.5)]",
                                        t === 'minimalist' && "bg-white",
                                        t === 'deepsea' && "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                    )}></div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="flex items-center gap-2.5 px-6 py-3 bg-[#1e2329] hover:bg-blue-600/10 border border-white/5 rounded-2xl transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em] group/share active:scale-95 shadow-xl"
                        >
                            <Share2 size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                            Share Area
                        </button>
                        <div className="w-[1px] h-8 bg-white/10 mx-2"></div>
                        <button className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all">
                            <Settings size={20} />
                        </button>
                    </div>
                </header>

                {/* Editor Content */}
                <div className="flex-1 px-10 py-10 relative">
                    <AnimatePresence mode="wait">
                        {selectedNote ? (
                            <motion.div
                                key={selectedNote._id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            >
                                <TiptapEditor
                                    key={selectedNote._id}
                                    noteId={selectedNote._id}
                                    initialContent={selectedNote.content}
                                    initialTags={selectedNote.tags || []}
                                    isShared={selectedNote.isPublic || false}
                                    theme={currentTheme}
                                    onSave={(content, tags) => {
                                        setNotes(notes.map(n => n._id === selectedNote._id ? { ...n, content, tags, updatedAt: new Date() } : n));
                                    }}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center gap-8"
                            >
                                <div className="w-32 h-32 bg-white/[0.02] rounded-[3rem] border border-white/5 flex items-center justify-center relative group">
                                    <div className="absolute inset-0 bg-blue-600/10 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <FileText size={60} className="text-gray-700 transition-transform group-hover:scale-110 group-hover:text-blue-500/50" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-gray-600 tracking-tighter uppercase mb-4 italic">No Fragment Selected</h3>
                                    <p className="text-gray-600 text-sm max-w-xs font-bold leading-relaxed uppercase tracking-wider">
                                        Choose a note from your vault or create a new reality.
                                    </p>
                                </div>
                                <button
                                    onClick={handleCreateNote}
                                    className="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-2xl shadow-blue-600/20 active:scale-95 border border-white/10"
                                >
                                    Forge New Artifact
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Share Modal */}
            {selectedNote && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    noteId={selectedNote._id}
                    noteTitle={selectedNote.title}
                    isPublic={selectedNote.isPublic}
                />
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.05); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s infinite ease-in-out;
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
