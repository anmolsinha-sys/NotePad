'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Terminal, ArrowRight, Zap, Code, Share2, ShieldCheck, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0d1117] text-white overflow-hidden relative selection:bg-blue-500/30 selection:text-blue-200">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse delay-1000 pointer-events-none"></div>

      {/* Hero Content */}
      <main className="container mx-auto px-6 pt-32 pb-20 relative z-10">
        <nav className="flex items-center justify-between py-6 fixed top-0 left-0 right-0 px-10 bg-[#0d1117]/80 backdrop-blur-xl border-b border-white/5 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <FileText size={22} className="text-white" />
            </div>
            <h1 className="font-bold text-2xl tracking-tighter">Notepad <span className="text-blue-500 font-black">UL</span></h1>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/auth')}
              className="text-gray-400 hover:text-white transition-colors font-medium"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/auth')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold transition-all duration-300 shadow-xl shadow-blue-600/20 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </nav>

        <section className="text-center max-w-4xl mx-auto mb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 text-sm font-bold uppercase tracking-widest mb-8 shadow-[0_0_20px_rgba(37,99,235,0.1)]"
          >
            <Sparkles size={16} />
            <span>Next-Gen Editor Experience</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-7xl md:text-8xl font-black mb-8 leading-[1.05] tracking-tight"
          >
            Notepad for the <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent italic underline decoration-blue-500/30">Future World.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            The world's most intuitive and powerful rich text editor for developers, writers, and teams. Paste code, images, and notes with real-time collaboration.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <button
              onClick={() => router.push('/auth')}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-white font-extrabold text-lg transition-all duration-300 shadow-[0_20px_40px_rgba(37,99,235,0.4)] flex items-center gap-3 group relative overflow-hidden"
            >
              Start Writing Now
              <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" />
            </button>
            <button className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold text-lg transition-all duration-300 flex items-center gap-3 group">
              <Terminal size={22} className="text-gray-400 group-hover:text-white transition-colors" />
              <span>Watch Demo</span>
            </button>
          </motion.div>
        </section>

        {/* Features Carousel/Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Code className="text-blue-400" />}
            title="IDE-Grade Code Snippets"
            description="Lush syntax highlighting for over 50 languages with IDE-like behavior and easy copying."
          />
          <FeatureCard
            icon={<Sparkles className="text-indigo-400" />}
            title="Rich Text Mastery"
            description="Intuitive bold, italics, highlights, and deep formatting controls. Minimal yet powerful."
          />
          <FeatureCard
            icon={<Share2 className="text-purple-400" />}
            title="Real-time Magic"
            description="Live multi-user editing with cursor activity and instant synchronization. Zero conflicts."
          />
        </div>
      </main>

      {/* Preview Section */}
      <div className="relative mt-20 pointer-events-none overflow-hidden pb-40">
        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 10 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="container mx-auto px-6"
        >
          <div className="bg-[#161b22]/70 border-4 border-white/10 rounded-[3rem] p-10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl overflow-hidden group perspective-1000">
            <div className="h-[600px] w-full bg-[#0d1117]/80 rounded-[2rem] border border-white/5 p-8 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40"></div>
                <div className="w-4 h-4 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div>
                <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40"></div>
                <div className="flex-1 h-3 rounded-full bg-white/5 mx-10"></div>
              </div>
              <div className="flex gap-10 h-full">
                <div className="w-1/4 h-full bg-white/5 rounded-2xl flex flex-col p-4 gap-4">
                  <div className="h-4 w-3/4 bg-white/10 rounded-full"></div>
                  <div className="h-20 w-full bg-blue-500/20 border border-blue-500/30 rounded-xl"></div>
                  <div className="h-4 w-1/2 bg-white/10 rounded-full"></div>
                  <div className="h-4 w-2/3 bg-white/5 rounded-full"></div>
                </div>
                <div className="flex-1 h-full bg-white/5 rounded-2xl p-10 flex flex-col gap-6">
                  <div className="h-10 w-1/2 bg-white/10 rounded-xl"></div>
                  <div className="h-4 w-full bg-white/5 rounded-full"></div>
                  <div className="h-4 w-full bg-white/5 rounded-full"></div>
                  <div className="h-4 w-4/5 bg-white/5 rounded-full"></div>
                  <div className="h-40 w-full bg-[#1e2227] rounded-2xl border border-white/10"></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Background Stats */}
      <div className="bg-[#0d1117] py-20 border-t border-white/5">
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          <Stat text="100ms" sub="Real-time Latency" />
          <Stat text="50+" sub="Code Languages" />
          <Stat text="AES-256" sub="Storage Encryption" />
          <Stat text="∞" sub="Infinite Creativity" />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.02 }}
      className="p-10 bg-[#161b22]/50 border border-white/5 rounded-[2.5rem] backdrop-blur-2xl transition-all duration-300 hover:border-blue-500/20 hover:bg-white/5 group shadow-xl"
    >
      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 rotate-3 transition-transform group-hover:rotate-0 shadow-lg group-hover:bg-blue-500/10">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-lg">{description}</p>
    </motion.div>
  );
}

function Stat({ text, sub }: any) {
  return (
    <div>
      <h4 className="text-4xl md:text-5xl font-black text-white mb-2">{text}</h4>
      <p className="text-gray-500 font-medium uppercase tracking-widest text-xs">{sub}</p>
    </div>
  );
}
