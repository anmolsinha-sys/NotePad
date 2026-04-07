'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Link as LinkIcon, Share2, Shield, UserPlus, CheckCircle, Eye, Pencil } from 'lucide-react';
import { notesApi } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    noteTitle: string;
    isPublic?: boolean;
}

export default function ShareModal({ isOpen, onClose, noteId, noteTitle, isPublic = false }: ShareModalProps) {
    const [email, setEmail] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('viewer');
    const shareLink = `http://localhost:3000/note/${noteId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleClose = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-lg bg-[#161b22] border border-white/10 p-8 rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
                >
                    {/* Background Blobs */}
                    <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-blue-600/10 rounded-full blur-2xl"></div>

                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                                <Share2 size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Share Workspace</h2>
                                <p className="text-sm text-gray-500">Collaborate on &quot;{noteTitle}&quot;</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2.5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white active:scale-90 cursor-pointer z-10"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Public Access Toggle */}
                        <div className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <Shield size={18} className="text-blue-500" />
                                <div>
                                    <p className="text-sm font-bold text-white">Public Access</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Anyone with link can access</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        const newStatus = !isPublic;
                                        await notesApi.updateNote(noteId, { isPublic: newStatus });
                                        window.dispatchEvent(new CustomEvent('note-updated', { detail: { id: noteId, isPublic: newStatus } }));
                                    } catch (err) {
                                        console.error('Failed to update public status:', err);
                                    }
                                }}
                                className={cn(
                                    "w-12 h-6 rounded-full p-1 transition-all duration-300 relative cursor-pointer",
                                    isPublic ? "bg-blue-600" : "bg-white/10"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 bg-white rounded-full transition-all duration-300",
                                    isPublic ? "translate-x-6" : "translate-x-0"
                                )} />
                            </button>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Sharing Role</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShareRole('viewer')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border",
                                        shareRole === 'viewer'
                                            ? "bg-blue-600/10 text-blue-400 border-blue-600/30"
                                            : "bg-white/2 text-gray-500 border-white/5 hover:bg-white/5 hover:text-gray-300"
                                    )}
                                >
                                    <Eye size={16} />
                                    Viewer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShareRole('editor')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border",
                                        shareRole === 'editor'
                                            ? "bg-emerald-600/10 text-emerald-400 border-emerald-600/30"
                                            : "bg-white/2 text-gray-500 border-white/5 hover:bg-white/5 hover:text-gray-300"
                                    )}
                                >
                                    <Pencil size={16} />
                                    Editor
                                </button>
                            </div>
                        </div>

                        {/* Invite Collaborators */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Invite Collaborators</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="email"
                                        placeholder="Add friends by email..."
                                        className="w-full bg-[#0d1117] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600/50 transition-all placeholder:text-gray-600"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
                                >
                                    <UserPlus size={18} />
                                    Invite
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-600 ml-1">
                                Inviting as <span className={shareRole === 'editor' ? 'text-emerald-500 font-bold' : 'text-blue-500 font-bold'}>{shareRole}</span>
                            </p>
                        </div>

                        <div className="w-full h-px bg-white/5"></div>

                        {/* Link area */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1 text-left block">Direct Link Access</label>
                            <div className="p-4 bg-[#0d1117] border border-dashed border-white/10 rounded-2xl flex items-center justify-between group/link hover:border-blue-600/30 transition-all">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2.5 bg-blue-600/10 rounded-xl text-blue-500">
                                        <LinkIcon size={16} />
                                    </div>
                                    <span className="text-sm text-gray-400 truncate max-w-[200px]">{shareLink}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                                        isCopied
                                            ? "bg-emerald-600/10 text-emerald-500"
                                            : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    {isCopied ? <CheckCircle size={14} /> : null}
                                    {isCopied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
