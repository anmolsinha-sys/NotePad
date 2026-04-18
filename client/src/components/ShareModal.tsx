'use client';

import { useState } from 'react';
import { X, Mail, Link as LinkIcon, Share2, Shield, UserPlus, CheckCircle, Eye, Pencil } from 'lucide-react';
import { notesApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    noteId: string;
    noteTitle: string;
    isPublic?: boolean;
    onPublicChange?: (next: boolean) => void;
}

export default function ShareModal({ isOpen, onClose, noteId, noteTitle, isPublic = false, onPublicChange }: ShareModalProps) {
    const [email, setEmail] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('viewer');
    const [isToggling, setIsToggling] = useState(false);
    const [isInviting, setIsInviting] = useState(false);

    const shareLink = typeof window !== 'undefined'
        ? `${window.location.origin}/note/${noteId}`
        : `/note/${noteId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            toast.error('Could not copy link');
        }
    };

    const togglePublic = async () => {
        if (isToggling) return;
        setIsToggling(true);
        const next = !isPublic;
        try {
            await notesApi.updateNote(noteId, { is_public: next });
            onPublicChange?.(next);
            toast.success(next ? 'Public link enabled' : 'Public link disabled');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not update sharing');
        } finally {
            setIsToggling(false);
        }
    };

    const sendInvite = async () => {
        const trimmed = email.trim();
        if (!trimmed) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            toast.error('Enter a valid email address');
            return;
        }
        setIsInviting(true);
        try {
            await notesApi.inviteCollaborator(noteId, trimmed, shareRole);
            toast.success(`Invited ${trimmed} as ${shareRole}`);
            setEmail('');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not send invite');
        } finally {
            setIsInviting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <div className="relative w-full max-w-lg bg-[#111] border border-[#27272a] p-6 rounded-lg shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Share2 size={18} className="text-emerald-400" />
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-100">Share note</h2>
                            <p className="text-xs text-zinc-500 truncate max-w-[280px]">{noteTitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="flex items-center justify-between p-3 bg-[#0a0a0a] border border-[#27272a] rounded">
                        <div className="flex items-center gap-3">
                            <Shield size={14} className="text-zinc-500" />
                            <div>
                                <p className="text-xs font-medium text-zinc-200">Public link</p>
                                <p className="text-[11px] text-zinc-500">Anyone with the link can view</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={togglePublic}
                            disabled={isToggling}
                            className={cn(
                                'w-10 h-5 rounded-full p-0.5 transition-colors relative',
                                isPublic ? 'bg-emerald-500' : 'bg-zinc-700',
                                isToggling && 'opacity-60'
                            )}
                            aria-pressed={isPublic}
                        >
                            <div className={cn(
                                'w-4 h-4 bg-white rounded-full transition-transform',
                                isPublic ? 'translate-x-5' : 'translate-x-0'
                            )} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Invite by email</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    className="w-full bg-[#0a0a0a] border border-[#27272a] rounded py-2 pl-9 pr-3 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') sendInvite(); }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={sendInvite}
                                disabled={isInviting || !email.trim()}
                                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-black rounded text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <UserPlus size={14} />
                                {isInviting ? 'Inviting…' : 'Invite'}
                            </button>
                        </div>

                        <div className="flex gap-1 pt-1">
                            <button
                                type="button"
                                onClick={() => setShareRole('viewer')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs transition-colors border',
                                    shareRole === 'viewer'
                                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                                        : 'bg-transparent text-zinc-500 border-[#27272a] hover:text-zinc-300'
                                )}
                            >
                                <Eye size={12} /> Viewer
                            </button>
                            <button
                                type="button"
                                onClick={() => setShareRole('editor')}
                                className={cn(
                                    'flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs transition-colors border',
                                    shareRole === 'editor'
                                        ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                                        : 'bg-transparent text-zinc-500 border-[#27272a] hover:text-zinc-300'
                                )}
                            >
                                <Pencil size={12} /> Editor
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-[#27272a]" />

                    <div className="space-y-2">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Direct link</label>
                        <div className="p-2.5 bg-[#0a0a0a] border border-[#27272a] rounded flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                <LinkIcon size={13} className="text-zinc-500 shrink-0" />
                                <span className="text-xs font-mono text-zinc-400 truncate">{shareLink}</span>
                            </div>
                            <button
                                type="button"
                                onClick={copyToClipboard}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                                    isCopied ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                                )}
                            >
                                {isCopied ? <CheckCircle size={12} /> : null}
                                {isCopied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
