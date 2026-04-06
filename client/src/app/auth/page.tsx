'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { Mail, Lock, User, ArrowRight, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
    });
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = isLogin
                ? await authApi.login({ email: formData.email, password: formData.password })
                : await authApi.signup(formData);

            Cookies.set('token', res.data.token, { expires: 90 });
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d1117] relative overflow-hidden px-4">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-[#161b22]/70 backdrop-blur-3xl border border-white/10 rounded-3xl p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-3 tracking-tight">
                            {isLogin ? 'Welcome Back' : 'Get Started'}
                        </h1>
                        <p className="text-gray-400 text-lg">
                            {isLogin ? 'Sign in to continue to Notepad.' : 'Create an account to start writing.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode='wait'>
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="relative"
                                >
                                    <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block uppercase tracking-wider">Username</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-all duration-300" size={20} />
                                        <input
                                            type="text"
                                            required={!isLogin}
                                            placeholder="johndoe"
                                            className="w-full bg-[#0d1117]/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 placeholder:text-gray-600"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative">
                            <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block uppercase tracking-wider">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-all duration-300" size={20} />
                                <input
                                    type="email"
                                    required
                                    placeholder="name@example.com"
                                    className="w-full bg-[#0d1117]/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 placeholder:text-gray-600"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block uppercase tracking-wider">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-all duration-300" size={20} />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-[#0d1117]/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 placeholder:text-gray-600"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 text-sm"
                            >
                                <Info size={18} />
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden shadow-[0_10px_20px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <span>{isLogin ? 'Login to Console' : 'Create Account'}</span>
                                    <ArrowRight className="group-hover:translate-x-1.5 transition-transform duration-300" size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium"
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
