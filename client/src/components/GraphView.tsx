'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3-force';
import { X, Workflow } from 'lucide-react';

type Note = { id: string; title: string; content?: string };
type Node = d3.SimulationNodeDatum & { id: string; title: string; degree: number };
type Link = d3.SimulationLinkDatum<Node> & { source: any; target: any };

const WIKILINK_RE = /data-target="([^"]+)"/g;

const parseLinks = (html: string | undefined): string[] => {
    if (!html) return [];
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = WIKILINK_RE.exec(html))) out.push(m[1]);
    return out;
};

export default function GraphView({
    open,
    notes,
    onClose,
    onOpenNote,
}: {
    open: boolean;
    notes: Note[];
    onClose: () => void;
    onOpenNote: (id: string) => void;
}) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const [tick, setTick] = useState(0);

    const graph = useMemo(() => {
        const idSet = new Set(notes.map((n) => n.id));
        const deg = new Map<string, number>();
        const links: Link[] = [];
        for (const n of notes) {
            const targets = parseLinks(n.content);
            for (const t of targets) {
                if (!idSet.has(t) || t === n.id) continue;
                links.push({ source: n.id, target: t });
                deg.set(n.id, (deg.get(n.id) || 0) + 1);
                deg.set(t, (deg.get(t) || 0) + 1);
            }
        }
        const nodes: Node[] = notes.map((n) => ({
            id: n.id,
            title: n.title || 'Untitled',
            degree: deg.get(n.id) || 0,
        }));
        return { nodes, links };
    }, [notes]);

    useEffect(() => {
        if (!open) return;
        const el = svgRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setSize({ w: Math.max(300, rect.width), h: Math.max(300, rect.height) });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const { nodes, links } = graph;
        if (nodes.length === 0) return;

        const sim = d3.forceSimulation<Node, Link>(nodes)
            .force('link', d3.forceLink<Node, Link>(links).id((d) => d.id).distance(90).strength(0.5))
            .force('charge', d3.forceManyBody().strength(-220))
            .force('center', d3.forceCenter(size.w / 2, size.h / 2))
            .force('collide', d3.forceCollide<Node>().radius((d) => radiusFor(d) + 4))
            .alpha(1)
            .alphaDecay(0.03);

        sim.on('tick', () => setTick((t) => t + 1));

        return () => { sim.stop(); };
    }, [open, graph, size.w, size.h]);

    if (!open) return null;

    const { nodes, links } = graph;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-5xl h-[85vh] surface flex flex-col overflow-hidden">
                <div className="h-11 px-3 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <Workflow size={14} style={{ color: 'var(--fg-muted)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>Graph</span>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--fg-dim)' }}>
                            {nodes.length} {nodes.length === 1 ? 'note' : 'notes'} · {links.length} {links.length === 1 ? 'link' : 'links'}
                        </span>
                    </div>
                    <button onClick={onClose} className="btn btn-ghost p-1"><X size={14} /></button>
                </div>
                <div className="flex-1 relative" style={{ background: 'var(--bg)' }}>
                    {nodes.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--fg-dim)' }}>
                            No notes yet. Link notes with <span className="kbd mx-1">[[</span> to see connections here.
                        </div>
                    ) : (
                        <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${size.w} ${size.h}`} style={{ cursor: 'default' }}>
                            <g>
                                {links.map((l, i) => {
                                    const src = l.source as Node;
                                    const tgt = l.target as Node;
                                    return (
                                        <line
                                            key={i}
                                            x1={src.x || 0} y1={src.y || 0}
                                            x2={tgt.x || 0} y2={tgt.y || 0}
                                            stroke="var(--border-strong)"
                                            strokeWidth={1}
                                        />
                                    );
                                })}
                            </g>
                            <g>
                                {nodes.map((n) => (
                                    <g
                                        key={n.id}
                                        transform={`translate(${n.x || 0}, ${n.y || 0})`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => { onOpenNote(n.id); onClose(); }}
                                    >
                                        <circle
                                            r={radiusFor(n)}
                                            fill={n.degree > 0 ? 'var(--accent)' : 'var(--bg-elev)'}
                                            stroke={n.degree > 0 ? 'var(--accent-strong)' : 'var(--border-strong)'}
                                            strokeWidth={1.5}
                                        />
                                        <text
                                            y={radiusFor(n) + 12}
                                            textAnchor="middle"
                                            style={{
                                                fontSize: 11,
                                                fontFamily: 'var(--font-sans)',
                                                fill: 'var(--fg-muted)',
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {truncate(n.title, 22)}
                                        </text>
                                    </g>
                                ))}
                            </g>
                            {/* Tick spinner — force re-render */}
                            <desc>{tick}</desc>
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
}

function radiusFor(n: Node): number {
    return 5 + Math.min(14, Math.sqrt(n.degree + 1) * 3);
}

function truncate(s: string, n: number) {
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
