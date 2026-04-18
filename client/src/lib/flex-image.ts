import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';

export type ImageMode = 'flow' | 'free';
export type ImageAlign = 'left' | 'center' | 'right' | 'inline';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        flexImage: {
            setImageAlign: (align: ImageAlign) => ReturnType;
            setImageMode: (mode: ImageMode) => ReturnType;
        };
    }
}

const MIN_WIDTH = 60;
const DEFAULT_WIDTH = 280;

export const FlexImage = Image.extend({
    inline: true,
    group: 'inline',
    draggable: true,
    selectable: true,

    addAttributes() {
        const parent = this.parent?.() || {};
        return {
            ...parent,
            mode: {
                default: 'flow',
                parseHTML: (el: HTMLElement) => (el.getAttribute('data-mode') as ImageMode) || 'flow',
                renderHTML: (attrs: any) => ({ 'data-mode': attrs.mode || 'flow' }),
            },
            align: {
                default: 'inline',
                parseHTML: (el: HTMLElement) => el.getAttribute('data-align') || 'inline',
                renderHTML: (attrs: any) => ({ 'data-align': attrs.align || 'inline' }),
            },
            width: {
                default: DEFAULT_WIDTH,
                parseHTML: (el: HTMLElement) => {
                    const v = el.getAttribute('data-width');
                    return v ? parseInt(v, 10) : DEFAULT_WIDTH;
                },
                renderHTML: (attrs: any) => ({ 'data-width': String(attrs.width || DEFAULT_WIDTH) }),
            },
            posX: {
                default: 0,
                parseHTML: (el: HTMLElement) => parseInt(el.getAttribute('data-x') || '0', 10),
                renderHTML: (attrs: any) => ({ 'data-x': String(attrs.posX || 0) }),
            },
            posY: {
                default: 0,
                parseHTML: (el: HTMLElement) => parseInt(el.getAttribute('data-y') || '0', 10),
                renderHTML: (attrs: any) => ({ 'data-y': String(attrs.posY || 0) }),
            },
        };
    },

    renderHTML({ HTMLAttributes, node }) {
        return ['img', mergeAttributes(HTMLAttributes, {
            class: `flex-image flex-image-${node.attrs.mode}`,
            style: styleFor(node.attrs),
        })];
    },

    addCommands() {
        const parent = (this.parent?.() || {}) as any;
        return {
            ...parent,
            setImageAlign: (align: ImageAlign) => ({ commands }: any) =>
                commands.updateAttributes(this.name, { align, mode: 'flow' }),
            setImageMode: (mode: ImageMode) => ({ commands }: any) =>
                commands.updateAttributes(this.name, { mode }),
        };
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const container = document.createElement('span');
            container.setAttribute('data-type', 'flex-image');

            const img = document.createElement('img');
            img.draggable = false;
            const resizer = document.createElement('span');
            resizer.className = 'flex-image-resizer';
            resizer.setAttribute('contenteditable', 'false');

            container.appendChild(img);
            container.appendChild(resizer);

            const applyAttrs = (attrs: any) => {
                img.src = attrs.src || '';
                img.alt = attrs.alt || '';
                container.className = `flex-image-wrap mode-${attrs.mode} align-${attrs.align}`;
                container.style.cssText = containerStyle(attrs);
                img.style.cssText = imgStyle(attrs);
            };

            applyAttrs(node.attrs);

            // ── Move (drag body) ─────────────────────────────────────────
            const startMove = (e: PointerEvent) => {
                if (!editor.isEditable) return;
                if ((e.target as HTMLElement) === resizer) return;
                e.preventDefault();
                const pos = typeof getPos === 'function' ? getPos() : null;
                if (pos == null) return;

                const currentNode = editor.view.state.doc.nodeAt(pos);
                if (!currentNode) return;
                const attrs = { ...currentNode.attrs };

                // Reference frame: the editor content root
                const editorRoot = editor.view.dom as HTMLElement;
                const rootRect = editorRoot.getBoundingClientRect();
                const contRect = container.getBoundingClientRect();

                let currentMode: ImageMode = attrs.mode;
                let posX = attrs.posX;
                let posY = attrs.posY;

                // If currently in flow, switch to free and anchor at current visual position
                if (currentMode === 'flow') {
                    currentMode = 'free';
                    posX = Math.round(contRect.left - rootRect.left);
                    posY = Math.round(contRect.top - rootRect.top);
                }

                const startPointerX = e.clientX;
                const startPointerY = e.clientY;
                const startPosX = posX;
                const startPosY = posY;

                container.setPointerCapture(e.pointerId);
                container.classList.add('is-dragging');

                const onMove = (ev: PointerEvent) => {
                    const nx = startPosX + (ev.clientX - startPointerX);
                    const ny = startPosY + (ev.clientY - startPointerY);
                    const nextAttrs = { ...attrs, mode: currentMode, posX: nx, posY: ny };
                    applyAttrs(nextAttrs);
                };
                const onUp = (ev: PointerEvent) => {
                    container.releasePointerCapture(ev.pointerId);
                    container.classList.remove('is-dragging');
                    container.removeEventListener('pointermove', onMove);
                    container.removeEventListener('pointerup', onUp);
                    container.removeEventListener('pointercancel', onUp);

                    const finalX = startPosX + (ev.clientX - startPointerX);
                    const finalY = startPosY + (ev.clientY - startPointerY);
                    if (typeof getPos === 'function') {
                        const p = getPos();
                        const tr = editor.view.state.tr.setNodeMarkup(p, undefined, {
                            ...attrs,
                            mode: currentMode,
                            posX: finalX,
                            posY: finalY,
                        });
                        editor.view.dispatch(tr);
                    }
                };

                container.addEventListener('pointermove', onMove);
                container.addEventListener('pointerup', onUp);
                container.addEventListener('pointercancel', onUp);
            };

            img.addEventListener('pointerdown', startMove);

            // ── Resize (SE corner) ───────────────────────────────────────
            const startResize = (e: PointerEvent) => {
                if (!editor.isEditable) return;
                e.preventDefault();
                e.stopPropagation();

                const pos = typeof getPos === 'function' ? getPos() : null;
                if (pos == null) return;
                const currentNode = editor.view.state.doc.nodeAt(pos);
                if (!currentNode) return;
                const attrs = { ...currentNode.attrs };
                const startWidth = attrs.width || container.offsetWidth || DEFAULT_WIDTH;
                const startPointerX = e.clientX;

                resizer.setPointerCapture(e.pointerId);
                container.classList.add('is-resizing');

                const onMove = (ev: PointerEvent) => {
                    const nw = Math.max(MIN_WIDTH, Math.round(startWidth + (ev.clientX - startPointerX)));
                    applyAttrs({ ...attrs, width: nw });
                };
                const onUp = (ev: PointerEvent) => {
                    resizer.releasePointerCapture(ev.pointerId);
                    container.classList.remove('is-resizing');
                    resizer.removeEventListener('pointermove', onMove);
                    resizer.removeEventListener('pointerup', onUp);
                    resizer.removeEventListener('pointercancel', onUp);

                    const finalW = Math.max(MIN_WIDTH, Math.round(startWidth + (ev.clientX - startPointerX)));
                    if (typeof getPos === 'function') {
                        const p = getPos();
                        const tr = editor.view.state.tr.setNodeMarkup(p, undefined, { ...attrs, width: finalW });
                        editor.view.dispatch(tr);
                    }
                };

                resizer.addEventListener('pointermove', onMove);
                resizer.addEventListener('pointerup', onUp);
                resizer.addEventListener('pointercancel', onUp);
            };

            resizer.addEventListener('pointerdown', startResize);

            return {
                dom: container,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== this.name) return false;
                    applyAttrs(updatedNode.attrs);
                    return true;
                },
            };
        };
    },
});

// ── helpers ─────────────────────────────────────────────────────────────
function containerStyle(attrs: any): string {
    const w = attrs.width || DEFAULT_WIDTH;
    if (attrs.mode === 'free') {
        return `position:absolute;left:${attrs.posX || 0}px;top:${attrs.posY || 0}px;width:${w}px;z-index:5;cursor:move;user-select:none;`;
    }
    // flow mode — align via float/display
    if (attrs.align === 'left') return `display:inline-block;float:left;width:${w}px;margin:4px 12px 4px 0;cursor:move;`;
    if (attrs.align === 'right') return `display:inline-block;float:right;width:${w}px;margin:4px 0 4px 12px;cursor:move;`;
    if (attrs.align === 'center') return `display:block;width:${w}px;margin:8px auto;cursor:move;`;
    return `display:inline-block;width:${w}px;margin:0 4px;cursor:move;vertical-align:middle;`;
}

function imgStyle(_attrs: any): string {
    return `width:100%;height:auto;display:block;pointer-events:auto;`;
}

function styleFor(attrs: any): string {
    // Used for serialization (when node view isn't active, e.g. print/export)
    return containerStyle(attrs);
}
