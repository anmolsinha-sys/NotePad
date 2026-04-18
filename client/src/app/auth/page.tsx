'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const friendlyError = (err: any): string => {
    const status = err?.response?.status;
    const raw = (err?.response?.data?.message || '').toLowerCase();

    if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server.';
    if (status === 401) return 'Incorrect email or password.';
    if (status === 409 || raw.includes('already') || raw.includes('taken')) {
        if (raw.includes('username')) return 'That username is taken.';
        if (raw.includes('email')) return 'An account with this email already exists.';
        return 'Account already exists.';
    }
    if (status === 400) return err?.response?.data?.message || 'Please fill in all fields.';
    if (status === 429) return 'Too many attempts. Try again in a minute.';
    if (status === 500) return 'Server error. Try again in a moment.';
    return err?.response?.data?.message || 'Something went wrong.';
};

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ username: '', email: '', password: '' });
    const router = useRouter();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = isLogin
                ? await authApi.login({ email: form.email, password: form.password })
                : await authApi.signup(form);
            Cookies.set('token', res.data.token, { expires: 30, sameSite: 'lax' });
            try { localStorage.setItem('user', JSON.stringify(res.data.data.user)); } catch {}
            router.push('/dashboard');
        } catch (err: any) {
            toast.error(friendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [k]: e.target.value });

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                        <span className="font-mono text-[13px] font-bold" style={{ color: '#00120a' }}>N</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Notepad</h1>
                        <p className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>developer notes</p>
                    </div>
                </div>

                <div className="surface p-6">
                    <h2 className="text-base font-medium mb-1" style={{ color: 'var(--fg)' }}>
                        {isLogin ? 'Sign in' : 'Create account'}
                    </h2>
                    <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
                        {isLogin ? 'Welcome back.' : 'Start writing in seconds.'}
                    </p>

                    <form onSubmit={submit} className="space-y-3">
                        {!isLogin && (
                            <div className="relative">
                                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" size={14} style={{ color: 'var(--fg-dim)' }} />
                                <input
                                    type="text"
                                    required
                                    autoComplete="username"
                                    placeholder="Username"
                                    className="input pl-9"
                                    value={form.username}
                                    onChange={setField('username')}
                                />
                            </div>
                        )}

                        <div className="relative">
                            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" size={14} style={{ color: 'var(--fg-dim)' }} />
                            <input
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="name@example.com"
                                className="input pl-9"
                                value={form.email}
                                onChange={setField('email')}
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" size={14} style={{ color: 'var(--fg-dim)' }} />
                            <input
                                type="password"
                                required
                                minLength={isLogin ? undefined : 8}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                placeholder="Password"
                                className="input pl-9"
                                value={form.password}
                                onChange={setField('password')}
                            />
                        </div>

                        {!isLogin && (
                            <p className="text-[11px]" style={{ color: 'var(--fg-dim)' }}>
                                At least 8 characters.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-2 text-sm font-medium"
                        >
                            {loading
                                ? <Loader2 className="animate-spin" size={14} />
                                : <span>{isLogin ? 'Sign in' : 'Create account'}</span>}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs hover:underline"
                            style={{ color: 'var(--fg-muted)' }}
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
