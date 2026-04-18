'use client';

import { useRouter } from 'next/navigation';
import {
    ArrowRight, Command, Lock, Users, History, Workflow, Hash,
    Terminal, Sparkles, FileCode, Waypoints,
} from 'lucide-react';

export default function LandingPage() {
    const router = useRouter();

    return (
        <div className="landing">
            <div className="aurora" aria-hidden="true">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
                <div className="blob blob-3" />
            </div>
            <div className="grid-overlay" aria-hidden="true" />
            <div className="scanline" aria-hidden="true" />

            {/* Nav */}
            <header className="nav">
                <div className="brand">
                    <div className="brand-mark">
                        <span>N</span>
                    </div>
                    <div className="brand-text">
                        <div className="brand-title">Notepad</div>
                        <div className="brand-sub">developer workspace</div>
                    </div>
                </div>
                <nav className="nav-links">
                    <a href="#features">Features</a>
                    <a href="#shortcuts">Shortcuts</a>
                    <a href="https://github.com/anmolsinha-sys/NotePad" target="_blank" rel="noreferrer" className="nav-icon" title="GitHub">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.76.41-1.28.74-1.57-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.2-3.08-.12-.29-.52-1.46.12-3.04 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.58.24 2.75.12 3.04.75.8 1.2 1.83 1.2 3.08 0 4.41-2.7 5.38-5.26 5.67.42.36.8 1.07.8 2.17v3.22c0 .31.21.67.8.56 4.57-1.53 7.85-5.83 7.85-10.91C23.5 5.73 18.27.5 12 .5z"/>
                        </svg>
                    </a>
                    <button className="btn-ghost" onClick={() => router.push('/auth')}>Sign in</button>
                    <button className="btn-primary" onClick={() => router.push('/auth')}>
                        Get started
                        <ArrowRight size={13} />
                    </button>
                </nav>
            </header>

            {/* Hero */}
            <section className="hero">
                <div className="badge">
                    <span className="badge-dot" />
                    v2.0 · real-time · encrypted
                </div>
                <h1 className="headline">
                    The notepad for<br />
                    <span className="headline-accent">engineers who write.</span>
                </h1>
                <p className="sub">
                    Rich text, code blocks, mermaid diagrams, and canvas-style images — all
                    with real-time collaboration, client-side encryption, and a command
                    palette you will not want to live without.
                </p>
                <div className="cta-row">
                    <button className="btn-primary btn-lg" onClick={() => router.push('/auth')}>
                        Start writing
                        <ArrowRight size={15} />
                    </button>
                    <button className="btn-terminal btn-lg" onClick={() => router.push('/auth')}>
                        <span className="term-prompt">$</span> open --workspace
                    </button>
                </div>
                <div className="keys">
                    <span className="kbd">⌘K</span> palette
                    <span className="sep">·</span>
                    <span className="kbd">⌘N</span> new
                    <span className="sep">·</span>
                    <span className="kbd">⌘S</span> save
                    <span className="sep">·</span>
                    <span className="kbd">⌘.</span> focus
                    <span className="sep">·</span>
                    <span className="kbd">⌘⇧G</span> graph
                </div>
            </section>

            {/* Editor preview */}
            <section className="preview">
                <div className="preview-chrome">
                    <div className="preview-dots">
                        <span /><span /><span />
                    </div>
                    <div className="preview-title">note.md — Notepad</div>
                    <div className="preview-status">● connected · 2 online</div>
                </div>
                <div className="preview-body">
                    <div className="preview-sidebar">
                        <div className="ps-row ps-row-heat">
                            <span className="fire">🔥</span> 12 day streak
                        </div>
                        <div className="ps-section">Pinned</div>
                        <div className="ps-row active">q4-roadmap</div>
                        <div className="ps-section">All</div>
                        <div className="ps-row">design-review</div>
                        <div className="ps-row">rfc-encryption</div>
                        <div className="ps-row">meeting-notes</div>
                    </div>
                    <div className="preview-editor">
                        <div className="pe-toolbar">
                            <span className="t-btn">B</span>
                            <span className="t-btn t-italic">I</span>
                            <span className="t-btn">H1</span>
                            <span className="t-btn">⟨/⟩</span>
                            <span className="t-badge">saving…</span>
                        </div>
                        <div className="pe-line pe-h1">Q4 roadmap <span className="pe-caret" /></div>
                        <div className="pe-line">Shipping the stuff we committed to in <a className="pe-wikilink">[[design-review]]</a>.</div>
                        <div className="pe-code">
                            <div className="pe-code-head">
                                <span>typescript</span>
                                <span>copy</span>
                            </div>
                            <pre>
{`export const ship = async () => {
  const ok = await migrate();
  return ok ? deploy() : rollback();
};`}
                            </pre>
                        </div>
                        <div className="pe-line pe-tag">#release  #infra  <span className="pe-due">Today</span></div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="features">
                <div className="section-eyebrow">features</div>
                <h2 className="section-title">Everything. Nothing extra.</h2>
                <div className="feature-grid">
                    <Feature icon={Users} title="Real-time collaboration" body="Multi-user cursors, presence avatars, and live updates over sockets. Offline edits queue and sync on reconnect." />
                    <Feature icon={Command} title="Command palette" body="⌘K finds any note, any action. Slash menu inside the editor for headings, tables, mermaid, code blocks, galleries." />
                    <Feature icon={Lock} title="Password-protected notes" body="Optional AES-GCM encryption with PBKDF2. Your passphrase never leaves the browser — the server only stores ciphertext." />
                    <Feature icon={Waypoints} title="Wikilinks + graph view" body="Type [[ to link notes. Backlinks appear under every note. Open the graph view to see your second brain." />
                    <Feature icon={History} title="Version history" body="Automatic snapshots every 5 minutes. Restore with one click. Diff mode shows red/green changes." />
                    <Feature icon={Workflow} title="Image canvas" body="Drag images anywhere on the page — even over text. Resize handles, alignment, multi-image galleries." />
                    <Feature icon={FileCode} title="Smart paste" body="Paste a URL — fetch the title automatically. Paste JSON — get a formatted code block. Paste an image — edit inline." />
                    <Feature icon={Hash} title="Full-text search" body="Postgres tsvector-backed search on title and content. Instant from the command palette." />
                    <Feature icon={Terminal} title="PWA installable" body="Install as a desktop app. Offline shell caching via service worker. Feels native, stays lightweight." />
                </div>
            </section>

            {/* Shortcuts */}
            <section id="shortcuts" className="shortcuts">
                <div className="section-eyebrow">keyboard-first</div>
                <h2 className="section-title">Built for the keyboard.</h2>
                <div className="shortcut-grid">
                    <Shortcut keys={['⌘', 'K']} label="Command palette" />
                    <Shortcut keys={['⌘', 'N']} label="New note" />
                    <Shortcut keys={['⌘', 'S']} label="Save now" />
                    <Shortcut keys={['⌘', '.']} label="Focus mode" />
                    <Shortcut keys={['⌘', '/']} label="Shortcuts" />
                    <Shortcut keys={['⌘', '⇧', 'G']} label="Graph view" />
                    <Shortcut keys={['/']} label="Slash commands" />
                    <Shortcut keys={['[[']} label="Link a note" />
                    <Shortcut keys={[':', 'date']} label="Expand today\u2019s date" />
                </div>
            </section>

            {/* CTA */}
            <section className="cta">
                <div className="cta-card">
                    <div className="cta-inner">
                        <Sparkles size={18} className="cta-icon" />
                        <h3>Your second brain, free forever.</h3>
                        <p>Create an account in a few seconds. Your notes, your keys, your keyboard.</p>
                        <button className="btn-primary btn-lg" onClick={() => router.push('/auth')}>
                            Get started
                            <ArrowRight size={15} />
                        </button>
                    </div>
                </div>
            </section>

            <footer className="footer">
                <div className="footer-brand">
                    <div className="brand-mark small"><span>N</span></div>
                    <span>Notepad · {new Date().getFullYear()}</span>
                </div>
                <div className="footer-links">
                    <a href="https://github.com/anmolsinha-sys/NotePad" target="_blank" rel="noreferrer">GitHub</a>
                    <a href="/auth">Sign in</a>
                </div>
            </footer>

            <style jsx>{`
                .landing {
                    position: relative;
                    min-height: 100vh;
                    background: radial-gradient(ellipse at top, #081410 0%, #040606 45%, #000 100%);
                    color: #e4e4e7;
                    overflow: hidden;
                    font-family: var(--font-sans);
                }

                .aurora { position: absolute; inset: 0; z-index: 0; filter: blur(90px); opacity: 0.5; pointer-events: none; }
                .blob { position: absolute; border-radius: 50%; will-change: transform; }
                .blob-1 { width: 620px; height: 620px; top: -12%; left: -10%;
                    background: radial-gradient(circle, rgba(16,185,129,0.55), transparent 70%);
                    animation: drift-1 18s ease-in-out infinite;
                }
                .blob-2 { width: 520px; height: 520px; top: 10%; right: -8%;
                    background: radial-gradient(circle, rgba(56,189,248,0.28), transparent 70%);
                    animation: drift-2 22s ease-in-out infinite;
                }
                .blob-3 { width: 460px; height: 460px; top: 55%; left: 40%;
                    background: radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%);
                    animation: drift-3 26s ease-in-out infinite;
                }
                @keyframes drift-1 { 0%,100%{transform: translate(0,0) scale(1)} 50%{transform: translate(80px,40px) scale(1.08)} }
                @keyframes drift-2 { 0%,100%{transform: translate(0,0) scale(1)} 50%{transform: translate(-60px,-40px) scale(1.12)} }
                @keyframes drift-3 { 0%,100%{transform: translate(0,0) scale(1)} 50%{transform: translate(-30px,-40px) scale(0.96)} }

                .grid-overlay {
                    position: absolute; inset: 0; z-index: 1; pointer-events: none;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
                    background-size: 44px 44px;
                    mask-image: radial-gradient(ellipse at center, black 15%, transparent 75%);
                    -webkit-mask-image: radial-gradient(ellipse at center, black 15%, transparent 75%);
                }
                .scanline {
                    position: absolute; inset: 0; z-index: 2; pointer-events: none;
                    background: linear-gradient(180deg, transparent 0%, rgba(16,185,129,0.06) 50%, transparent 100%);
                    background-size: 100% 8px;
                    opacity: 0.35;
                    mix-blend-mode: overlay;
                }

                /* Nav */
                .nav {
                    position: sticky; top: 0; z-index: 30;
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 28px;
                    background: rgba(4,6,6,0.72);
                    backdrop-filter: blur(14px);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .brand { display: flex; align-items: center; gap: 10px; }
                .brand-mark {
                    width: 30px; height: 30px; border-radius: 7px;
                    background: linear-gradient(135deg, #10b981, #34d399);
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 0 0 1px rgba(16,185,129,0.4), 0 0 20px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.35);
                }
                .brand-mark.small { width: 22px; height: 22px; border-radius: 5px; }
                .brand-mark span { color: #00120a; font-family: var(--font-mono); font-size: 13px; font-weight: 800; }
                .brand-mark.small span { font-size: 11px; }
                .brand-text { line-height: 1.2; }
                .brand-title { font-weight: 600; font-size: 14px; color: #fafafa; letter-spacing: -0.01em; }
                .brand-sub { font-family: var(--font-mono); font-size: 10px; color: rgba(16,185,129,0.8); }

                .nav-links { display: flex; align-items: center; gap: 18px; }
                .nav-links a { color: #a1a1aa; font-size: 13px; text-decoration: none; transition: color 120ms; }
                .nav-links a:hover { color: #fafafa; }
                .nav-icon { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08); }

                .btn-ghost, .btn-primary, .btn-terminal {
                    display: inline-flex; align-items: center; gap: 6px;
                    font-size: 13px; font-weight: 500; padding: 7px 12px; border-radius: 5px;
                    border: 1px solid transparent; cursor: pointer; transition: all 140ms ease-out;
                    font-family: inherit;
                }
                .btn-ghost { background: transparent; color: #a1a1aa; }
                .btn-ghost:hover { color: #fafafa; background: rgba(255,255,255,0.05); }
                .btn-primary {
                    background: linear-gradient(180deg, #10b981, #059669);
                    color: #00120a; border-color: #10b981; font-weight: 600;
                    box-shadow: 0 8px 24px -8px rgba(16,185,129,0.55), inset 0 1px 0 rgba(255,255,255,0.3);
                }
                .btn-primary:hover { filter: brightness(1.06); }
                .btn-terminal {
                    background: rgba(8,10,10,0.85);
                    border-color: rgba(255,255,255,0.1);
                    color: #a1a1aa;
                    font-family: var(--font-mono);
                }
                .btn-terminal:hover { border-color: rgba(16,185,129,0.55); color: #fafafa; }
                .btn-terminal .term-prompt { color: #10b981; }
                .btn-lg { padding: 11px 18px; font-size: 14px; border-radius: 7px; }

                /* Hero */
                .hero {
                    position: relative; z-index: 3;
                    text-align: center; max-width: 900px;
                    margin: 80px auto 40px;
                    padding: 0 24px;
                }
                .badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 5px 12px; border-radius: 999px;
                    background: rgba(16,185,129,0.1);
                    border: 1px solid rgba(16,185,129,0.3);
                    font-family: var(--font-mono); font-size: 11px;
                    color: rgba(52,211,153,0.95); letter-spacing: 0.04em;
                    margin-bottom: 28px;
                }
                .badge-dot {
                    width: 6px; height: 6px; border-radius: 50%; background: #10b981;
                    box-shadow: 0 0 10px rgba(16,185,129,0.8);
                    animation: pulse 1.8s ease-in-out infinite;
                }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

                .headline {
                    font-size: clamp(2.5rem, 6.5vw, 5rem);
                    line-height: 1.05;
                    font-weight: 700;
                    letter-spacing: -0.035em;
                    color: #fafafa;
                    margin: 0 0 18px;
                }
                .headline-accent {
                    background: linear-gradient(110deg, #34d399 0%, #60a5fa 50%, #a78bfa 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    font-style: italic;
                }
                .sub {
                    font-size: 17px; line-height: 1.65; color: #a1a1aa;
                    max-width: 640px; margin: 0 auto 32px;
                }
                .cta-row {
                    display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
                    margin-bottom: 32px;
                }
                .keys {
                    font-family: var(--font-mono); font-size: 11px;
                    color: rgba(161,161,170,0.8);
                    display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 6px;
                }
                .keys .kbd {
                    display: inline-flex; align-items: center; padding: 1px 5px;
                    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09);
                    border-bottom-width: 2px; border-radius: 3px;
                    color: rgba(231,231,235,0.95); margin-right: 4px;
                }
                .keys .sep { color: rgba(113,113,122,0.6); }

                /* Editor preview mock */
                .preview {
                    position: relative; z-index: 3;
                    max-width: 1040px; margin: 60px auto 80px; padding: 0 24px;
                }
                .preview-chrome {
                    display: flex; align-items: center; gap: 12px;
                    padding: 10px 14px;
                    background: rgba(17,17,17,0.85); backdrop-filter: blur(14px);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-bottom: none;
                    border-radius: 10px 10px 0 0;
                    box-shadow: 0 0 0 1px rgba(16,185,129,0.18);
                }
                .preview-dots { display: flex; gap: 6px; }
                .preview-dots span {
                    width: 11px; height: 11px; border-radius: 50%;
                    background: rgba(255,255,255,0.1);
                }
                .preview-dots span:nth-child(1) { background: #ef4444; }
                .preview-dots span:nth-child(2) { background: #f59e0b; }
                .preview-dots span:nth-child(3) { background: #10b981; }
                .preview-title { flex: 1; text-align: center; font-family: var(--font-mono); font-size: 11px; color: rgba(161,161,170,0.85); }
                .preview-status { font-family: var(--font-mono); font-size: 10px; color: rgba(52,211,153,0.9); }

                .preview-body {
                    display: grid;
                    grid-template-columns: 190px 1fr;
                    background: rgba(10,10,10,0.9); backdrop-filter: blur(14px);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 0 0 10px 10px;
                    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.8), 0 0 60px -15px rgba(16,185,129,0.3);
                    min-height: 360px;
                }
                .preview-sidebar {
                    border-right: 1px solid rgba(255,255,255,0.06);
                    padding: 12px 8px;
                    font-size: 12px;
                }
                .ps-row-heat {
                    padding: 6px 8px; color: #fafafa;
                    display: flex; align-items: center; gap: 6px;
                    font-family: var(--font-mono);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    margin-bottom: 8px;
                }
                .fire { filter: drop-shadow(0 0 6px rgba(251,146,60,0.6)); }
                .ps-section {
                    padding: 8px 8px 4px;
                    font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase;
                    color: rgba(113,113,122,0.9);
                }
                .ps-row {
                    padding: 4px 8px; border-radius: 3px; color: #a1a1aa;
                    cursor: default;
                }
                .ps-row.active { background: rgba(255,255,255,0.05); color: #fafafa; }

                .preview-editor { padding: 16px 22px; }
                .pe-toolbar {
                    display: flex; align-items: center; gap: 6px;
                    padding-bottom: 10px; margin-bottom: 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    font-family: var(--font-mono); font-size: 11px;
                }
                .t-btn {
                    padding: 2px 6px; border-radius: 3px;
                    background: rgba(255,255,255,0.04);
                    color: rgba(161,161,170,0.95);
                }
                .t-italic { font-style: italic; }
                .t-badge {
                    margin-left: auto; font-size: 10px;
                    color: rgba(52,211,153,0.95); padding: 2px 6px;
                    background: rgba(16,185,129,0.1); border-radius: 3px;
                }
                .pe-line { margin-bottom: 8px; color: #e4e4e7; font-size: 14px; line-height: 1.55; }
                .pe-h1 {
                    font-size: 22px; font-weight: 600;
                    letter-spacing: -0.015em; color: #fafafa;
                    margin-top: 4px; margin-bottom: 12px;
                    display: flex; align-items: center;
                }
                .pe-caret {
                    display: inline-block; width: 2px; height: 22px;
                    margin-left: 4px; background: #10b981;
                    animation: blink 1s ease-in-out infinite;
                }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
                .pe-wikilink {
                    color: #34d399;
                    background: rgba(16,185,129,0.12);
                    border: 1px solid rgba(16,185,129,0.3);
                    border-radius: 2px; padding: 0 4px;
                    font-size: 0.86em;
                }
                .pe-code {
                    margin: 12px 0;
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 6px;
                    background: rgba(5,5,5,0.7);
                    overflow: hidden;
                }
                .pe-code-head {
                    display: flex; justify-content: space-between;
                    padding: 4px 10px;
                    background: rgba(255,255,255,0.03);
                    font-family: var(--font-mono); font-size: 10px;
                    color: rgba(113,113,122,0.95);
                    text-transform: uppercase; letter-spacing: 0.05em;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .pe-code pre {
                    margin: 0; padding: 10px 12px;
                    font-family: var(--font-mono); font-size: 12px;
                    color: #d4d4d8; line-height: 1.6; white-space: pre;
                }
                .pe-tag {
                    font-family: var(--font-mono); font-size: 11px;
                    color: rgba(113,113,122,0.9);
                }
                .pe-due {
                    display: inline-block;
                    background: #10b981; color: #00120a;
                    padding: 0 4px; border-radius: 2px;
                    font-weight: 600; margin-left: 6px;
                }

                /* Features */
                .features {
                    position: relative; z-index: 3;
                    max-width: 1100px; margin: 80px auto;
                    padding: 0 24px;
                }
                .section-eyebrow {
                    font-family: var(--font-mono); font-size: 11px;
                    text-transform: uppercase; letter-spacing: 0.15em;
                    color: rgba(52,211,153,0.9);
                    margin-bottom: 8px; text-align: center;
                }
                .section-title {
                    font-size: clamp(1.8rem, 4vw, 2.75rem);
                    font-weight: 600; letter-spacing: -0.02em;
                    color: #fafafa; text-align: center;
                    margin: 0 0 40px;
                }
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
                    gap: 14px;
                }

                /* Shortcuts */
                .shortcuts {
                    position: relative; z-index: 3;
                    max-width: 980px; margin: 80px auto;
                    padding: 0 24px;
                }
                .shortcut-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 8px;
                }

                /* CTA */
                .cta {
                    position: relative; z-index: 3;
                    max-width: 720px; margin: 100px auto 60px;
                    padding: 0 24px;
                }
                .cta-card {
                    position: relative;
                    border-radius: 14px; padding: 1px;
                    background: linear-gradient(180deg, rgba(16,185,129,0.4), rgba(16,185,129,0.05));
                    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.8), 0 0 80px -20px rgba(16,185,129,0.3);
                }
                .cta-inner {
                    border-radius: 13px;
                    background: rgba(8,10,10,0.88);
                    backdrop-filter: blur(18px);
                    text-align: center;
                    padding: 36px 24px;
                }
                .cta-icon { color: #34d399; margin-bottom: 12px; }
                .cta-card h3 {
                    font-size: 24px; font-weight: 600; color: #fafafa;
                    letter-spacing: -0.02em; margin: 8px 0 6px;
                }
                .cta-card p {
                    font-size: 14px; color: #a1a1aa; margin: 0 0 18px;
                }

                /* Footer */
                .footer {
                    position: relative; z-index: 3;
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 28px; border-top: 1px solid rgba(255,255,255,0.05);
                    font-size: 12px; color: rgba(113,113,122,0.9);
                    font-family: var(--font-mono);
                }
                .footer-brand { display: flex; align-items: center; gap: 10px; }
                .footer-links { display: flex; gap: 20px; }
                .footer-links a { color: #a1a1aa; text-decoration: none; }
                .footer-links a:hover { color: #fafafa; }

                @media (max-width: 720px) {
                    .nav-links a { display: none; }
                    .nav-icon { display: none; }
                    .preview-body { grid-template-columns: 1fr; }
                    .preview-sidebar { display: none; }
                }
            `}</style>
        </div>
    );
}

function Feature({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
    return (
        <div className="f-card">
            <div className="f-icon"><Icon size={15} /></div>
            <div className="f-title">{title}</div>
            <p className="f-body">{body}</p>
            <style jsx>{`
                .f-card {
                    padding: 18px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(17,17,17,0.55);
                    border-radius: 8px;
                    transition: border-color 160ms, background 160ms, transform 160ms;
                }
                .f-card:hover {
                    border-color: rgba(16,185,129,0.4);
                    background: rgba(17,17,17,0.9);
                    transform: translateY(-2px);
                }
                .f-icon {
                    width: 28px; height: 28px; border-radius: 5px;
                    display: inline-flex; align-items: center; justify-content: center;
                    background: rgba(16,185,129,0.12);
                    color: #34d399;
                    margin-bottom: 10px;
                }
                .f-title {
                    font-size: 14px; font-weight: 600; color: #fafafa;
                    letter-spacing: -0.01em; margin-bottom: 6px;
                }
                .f-body {
                    font-size: 13px; color: #a1a1aa;
                    line-height: 1.55; margin: 0;
                }
            `}</style>
        </div>
    );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
    return (
        <div className="s-row">
            <div className="s-keys">
                {keys.map((k, i) => (
                    <span key={i} className="s-kbd">{k}</span>
                ))}
            </div>
            <span className="s-label">{label}</span>
            <style jsx>{`
                .s-row {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 10px 14px;
                    border: 1px solid rgba(255,255,255,0.06);
                    background: rgba(17,17,17,0.55);
                    border-radius: 6px;
                    transition: border-color 140ms;
                }
                .s-row:hover { border-color: rgba(16,185,129,0.35); }
                .s-keys { display: flex; gap: 4px; font-family: var(--font-mono); }
                .s-kbd {
                    padding: 1px 6px; font-size: 11px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-bottom-width: 2px;
                    border-radius: 3px;
                    color: rgba(231,231,235,0.95);
                }
                .s-label { font-size: 12px; color: #a1a1aa; }
            `}</style>
        </div>
    );
}
