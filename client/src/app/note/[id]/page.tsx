'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { notesApi } from '@/lib/api';
import { subscribeToTitleUpdate } from '@/lib/socket';
import TiptapEditor from '@/components/Editor';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft } from 'lucide-react';

export default function SharedNotePage() {
    const { id } = useParams();
    const [note, setNote] = useState<any>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchNote = async () => {
            try {
                const res = await notesApi.getNote(id as string);
                setNote(res.data.data.note);
                setCanEdit(res.data.data.canEdit);
            } catch (err) {
                console.error('Failed to fetch shared note:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchNote();

        const unsubTitle = subscribeToTitleUpdate((newTitle) => {
            setNote((prev: any) => prev ? { ...prev, title: newTitle } : prev);
        });

        return () => {
            unsubTitle();
        };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!note) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-white gap-6">
                <FileText size={80} className="text-gray-600" />
                <h2 className="text-3xl font-bold">Note Not Found</h2>
                <p className="text-gray-400">This note might have been deleted or the link is incorrect.</p>
                <button onClick={() => router.push('/')} className="px-8 py-3 bg-blue-600 rounded-xl font-bold">Go Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d1117] text-white">
            <header className="h-20 border-b border-white/5 flex items-center justify-between px-10 bg-[#0d1117]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={() => router.push('/dashboard')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">{note.title}</h1>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest leading-none mt-1">Shared Session</p>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto"
                >
                    <TiptapEditor
                        key={note.id}
                        noteId={note.id}
                        initialContent={note.content}
                        initialTags={note.tags || []}
                        isShared={true}
                        editable={canEdit}
                        onSave={(content, tags) => {
                            if (!canEdit) return;
                            notesApi.updateNote(note.id, { content, tags });
                        }}
                    />
                </motion.div>
            </main>

            <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px] -z-10"></div>
            <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] -z-10"></div>
        </div>
    );
}
