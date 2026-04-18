'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { Mail, Lock, User, Loader2, ArrowRight } from 'lucide-react';
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
        <div className="auth-shell">
            {/* Animated gradient aurora */}
            <div className="auth-aurora">
                <div className="aurora-blob aurora-blob-1" />
                <div className="aurora-blob aurora-blob-2" />
                <div className="aurora-blob aurora-blob-3" />
            </div>

            {/* Grid overlay */}
            <div className="auth-grid" aria-hidden="true" />

            {/* Scanline */}
            <div className="auth-scanline" aria-hidden="true" />

            <div className="relative z-10 w-full max-w-md px-5 sm:px-0">
                {/* Brand */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="brand-mark">
                            <span className="font-mono text-[15px] font-bold" style={{ color: '#00120a' }}>N</span>
                        </div>
                        <div>
                            <div className="text-base font-semibold text-zinc-50 tracking-tight">Notepad</div>
                            <div className="text-[11px] font-mono text-emerald-400/80 flex items-center gap-1.5">
                                <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                dev workspace online
                            </div>
                        </div>
                    </div>
                    <div className="hidden sm:block text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase">
                        v2.0 / stable
                    </div>
                </div>

                {/* Card */}
                <div className="auth-card">
                    <div className="auth-card-inner">
                        <div className="mb-6">
                            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-emerald-400/80 mb-2">
                                {isLogin ? '$ auth --mode login' : '$ auth --mode signup'}
                            </div>
                            <h1 className="text-2xl font-semibold text-zinc-50 tracking-tight">
                                {isLogin ? 'Welcome back' : 'Create your account'}
                            </h1>
                            <p className="text-sm text-zinc-400 mt-1">
                                {isLogin ? 'Sign in to pick up where you left off.' : 'One account. Every note. Forever.'}
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-3">
                            {!isLogin && (
                                <Field icon={User}>
                                    <input
                                        type="text"
                                        required
                                        autoComplete="username"
                                        placeholder="username"
                                        className="auth-input"
                                        value={form.username}
                                        onChange={setField('username')}
                                    />
                                </Field>
                            )}

                            <Field icon={Mail}>
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="you@domain.com"
                                    className="auth-input"
                                    value={form.email}
                                    onChange={setField('email')}
                                />
                            </Field>

                            <Field icon={Lock}>
                                <input
                                    type="password"
                                    required
                                    minLength={isLogin ? undefined : 8}
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    placeholder={isLogin ? 'password' : 'at least 8 characters'}
                                    className="auth-input"
                                    value={form.password}
                                    onChange={setField('password')}
                                />
                            </Field>

                            <button
                                type="submit"
                                disabled={loading}
                                className="auth-submit"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={15} />
                                ) : (
                                    <>
                                        <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                                        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-5 border-t border-white/5 text-center">
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                            >
                                {isLogin ? "Don't have an account? Sign up →" : '← Already have an account? Sign in'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer status line */}
                <div className="mt-6 flex items-center justify-between text-[10px] font-mono text-zinc-600">
                    <span>end-to-end encrypted in transit</span>
                    <span>⌘K anywhere</span>
                </div>
            </div>

            <style jsx>{`
                .auth-shell {
                    position: relative;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(ellipse at top left, #0b1410 0%, #050505 50%, #000 100%);
                    overflow: hidden;
                    padding: 1.5rem 1rem;
                }

                .auth-aurora {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    filter: blur(90px);
                    opacity: 0.55;
                }

                .aurora-blob {
                    position: absolute;
                    border-radius: 50%;
                    will-change: transform;
                }

                .aurora-blob-1 {
                    width: 520px;
                    height: 520px;
                    top: -10%;
                    left: -10%;
                    background: radial-gradient(circle, rgba(16,185,129,0.55), transparent 70%);
                    animation: aurora-drift-1 18s ease-in-out infinite;
                }

                .aurora-blob-2 {
                    width: 420px;
                    height: 420px;
                    bottom: -8%;
                    right: -6%;
                    background: radial-gradient(circle, rgba(56,189,248,0.35), transparent 70%);
                    animation: aurora-drift-2 22s ease-in-out infinite;
                }

                .aurora-blob-3 {
                    width: 360px;
                    height: 360px;
                    top: 40%;
                    left: 55%;
                    background: radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%);
                    animation: aurora-drift-3 26s ease-in-out infinite;
                }

                @keyframes aurora-drift-1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50%      { transform: translate(60px, 40px) scale(1.1); }
                }
                @keyframes aurora-drift-2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50%      { transform: translate(-50px, -60px) scale(1.15); }
                }
                @keyframes aurora-drift-3 {
                    0%, 100% { transform: translate(-50%, 0) scale(1); }
                    50%      { transform: translate(-30%, -30px) scale(0.95); }
                }

                .auth-grid {
                    position: absolute;
                    inset: 0;
                    z-index: 1;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
                    background-size: 32px 32px;
                    mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
                    -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
                    pointer-events: none;
                }

                .auth-scanline {
                    position: absolute;
                    inset: 0;
                    z-index: 2;
                    background: linear-gradient(180deg, transparent 0%, rgba(16,185,129,0.08) 50%, transparent 100%);
                    background-size: 100% 6px;
                    opacity: 0.4;
                    pointer-events: none;
                    mix-blend-mode: overlay;
                }

                .brand-mark {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #10b981, #34d399);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow:
                        0 0 0 1px rgba(16,185,129,0.4),
                        0 0 20px rgba(16,185,129,0.35),
                        inset 0 1px 0 rgba(255,255,255,0.35);
                    position: relative;
                }
                .brand-mark::after {
                    content: '';
                    position: absolute;
                    inset: -6px;
                    border-radius: 12px;
                    border: 1px solid rgba(16,185,129,0.15);
                    animation: brand-pulse 3s ease-in-out infinite;
                }
                @keyframes brand-pulse {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50%      { opacity: 0.6; transform: scale(1.08); }
                }

                .auth-card {
                    position: relative;
                    border-radius: 14px;
                    padding: 1px;
                    background:
                        linear-gradient(180deg, rgba(16,185,129,0.4), rgba(16,185,129,0.05) 40%, rgba(255,255,255,0.03));
                    box-shadow:
                        0 30px 80px -20px rgba(0,0,0,0.8),
                        0 0 80px -20px rgba(16,185,129,0.35);
                }

                .auth-card-inner {
                    position: relative;
                    border-radius: 13px;
                    background: rgba(8, 10, 10, 0.85);
                    backdrop-filter: blur(18px);
                    -webkit-backdrop-filter: blur(18px);
                    padding: 1.75rem;
                    overflow: hidden;
                }
                .auth-card-inner::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background:
                        radial-gradient(circle at 20% 0%, rgba(16,185,129,0.12), transparent 45%),
                        radial-gradient(circle at 80% 100%, rgba(56,189,248,0.08), transparent 45%);
                    pointer-events: none;
                }

                .auth-submit {
                    width: 100%;
                    margin-top: 0.25rem;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.7rem 1rem;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #00120a;
                    background: linear-gradient(180deg, #10b981, #059669);
                    border: 1px solid rgba(16,185,129,0.8);
                    box-shadow:
                        0 10px 30px -10px rgba(16,185,129,0.6),
                        inset 0 1px 0 rgba(255,255,255,0.35);
                    cursor: pointer;
                    transition: transform 120ms, box-shadow 200ms, filter 200ms;
                    position: relative;
                }
                .auth-submit:hover:not(:disabled) {
                    filter: brightness(1.05);
                    box-shadow:
                        0 14px 36px -10px rgba(16,185,129,0.75),
                        inset 0 1px 0 rgba(255,255,255,0.35);
                }
                .auth-submit:active:not(:disabled) {
                    transform: translateY(1px);
                }
                .auth-submit:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                @media (max-width: 480px) {
                    .auth-card-inner { padding: 1.25rem; }
                    h1 { font-size: 1.375rem; }
                    .aurora-blob-1 { width: 360px; height: 360px; }
                    .aurora-blob-2 { width: 300px; height: 300px; }
                    .aurora-blob-3 { width: 260px; height: 260px; }
                }

                @media (prefers-reduced-motion: reduce) {
                    .aurora-blob, .brand-mark::after { animation: none !important; }
                }
            `}</style>

            <style jsx global>{`
                .auth-input {
                    width: 100%;
                    padding: 0.65rem 0.85rem 0.65rem 2.25rem;
                    background: rgba(8, 10, 10, 0.8);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 6px;
                    color: #fafafa;
                    font-size: 0.875rem;
                    transition: border-color 120ms, box-shadow 120ms, background 120ms;
                }
                .auth-input::placeholder {
                    color: #52525b;
                }
                .auth-input:focus {
                    outline: none;
                    border-color: rgba(16,185,129,0.6);
                    background: rgba(8, 10, 10, 0.95);
                    box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
                }
            `}</style>
        </div>
    );
}

function Field({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
    return (
        <div className="relative">
            <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" size={14} />
            {children}
        </div>
    );
}
