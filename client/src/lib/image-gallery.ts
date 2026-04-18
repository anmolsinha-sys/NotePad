import { Node, mergeAttributes } from '@tiptap/core';

export type GalleryItem = { src: string; alt?: string; flex: number };

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        imageGallery: {
            insertGallery: (items: { src: string; alt?: string }[]) => ReturnType;
        };
    }
}

const DEFAULT_FLEX = 1;
const MIN_FLEX = 0.25;

export const ImageGallery = Node.create({
    name: 'imageGallery',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
        return {
            items: {
                default: [] as GalleryItem[],
                parseHTML: (el) => {
                    const raw = el.getAttribute('data-items');
                    if (!raw) return [];
                    try { return JSON.parse(raw); } catch { return []; }
                },
                renderHTML: (attrs) => ({ 'data-items': JSON.stringify(attrs.items || []) }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="image-gallery"]' }];
    },

    renderHTML({ HTMLAttributes, node }) {
        const items: GalleryItem[] = (node.attrs as any).items || [];
        return [
            'div',
            mergeAttributes(HTMLAttributes, { 'data-type': 'image-gallery', class: 'image-gallery' }),
            ...items.map((item) => ([
                'img',
                {
                    src: item.src,
                    alt: item.alt || '',
                    style: `flex: ${item.flex || DEFAULT_FLEX} 1 0; min-width: 0;`,
                },
            ] as const)),
        ];
    },

    addCommands() {
        return {
            insertGallery: (items) => ({ commands }) => {
                if (!items || items.length === 0) return false;
                const payload: GalleryItem[] = items.map((i) => ({ ...i, flex: DEFAULT_FLEX }));
                return commands.insertContent({
                    type: this.name,
                    attrs: { items: payload },
                });
            },
        };
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const container = document.createElement('div');
            container.className = 'image-gallery';
            container.setAttribute('data-type', 'image-gallery');
            container.style.display = 'flex';
            container.style.gap = '6px';
            container.style.alignItems = 'stretch';
            container.style.margin = '1rem 0';

            const render = (currentNode: typeof node) => {
                container.innerHTML = '';
                const items: GalleryItem[] = (currentNode.attrs as any).items || [];
                container.setAttribute('data-items', JSON.stringify(items));

                items.forEach((item, idx) => {
                    // Image
                    const wrap = document.createElement('div');
                    wrap.style.flex = `${item.flex || DEFAULT_FLEX} 1 0`;
                    wrap.style.minWidth = '0';
                    wrap.style.position = 'relative';

                    const img = document.createElement('img');
                    img.src = item.src;
                    img.alt = item.alt || '';
                    img.style.width = '100%';
                    img.style.height = 'auto';
                    img.style.display = 'block';
                    img.style.borderRadius = '6px';
                    img.style.border = '1px solid var(--border)';
                    wrap.appendChild(img);

                    // Remove button
                    if (editor.isEditable) {
                        const removeBtn = document.createElement('button');
                        removeBtn.type = 'button';
                        removeBtn.innerHTML = '×';
                        removeBtn.title = 'Remove';
                        removeBtn.style.position = 'absolute';
                        removeBtn.style.top = '4px';
                        removeBtn.style.right = '4px';
                        removeBtn.style.width = '20px';
                        removeBtn.style.height = '20px';
                        removeBtn.style.borderRadius = '4px';
                        removeBtn.style.background = 'rgba(0,0,0,0.6)';
                        removeBtn.style.color = 'white';
                        removeBtn.style.border = '1px solid var(--border)';
                        removeBtn.style.cursor = 'pointer';
                        removeBtn.style.opacity = '0';
                        removeBtn.style.transition = 'opacity 120ms';
                        removeBtn.style.fontSize = '14px';
                        removeBtn.style.lineHeight = '18px';
                        wrap.addEventListener('mouseenter', () => { removeBtn.style.opacity = '1'; });
                        wrap.addEventListener('mouseleave', () => { removeBtn.style.opacity = '0'; });
                        removeBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const current: GalleryItem[] = (editor.view.state.doc.nodeAt(typeof getPos === 'function' ? getPos()! : 0)?.attrs as any)?.items || items;
                            const next = current.filter((_, i) => i !== idx);
                            if (typeof getPos === 'function') {
                                if (next.length === 0) {
                                    editor.chain().focus().deleteRange({ from: getPos(), to: getPos() + node.nodeSize }).run();
                                } else {
                                    editor.view.dispatch(
                                        editor.view.state.tr.setNodeMarkup(getPos(), undefined, { items: next })
                                    );
                                }
                            }
                        });
                        wrap.appendChild(removeBtn);
                    }

                    container.appendChild(wrap);

                    // Divider between images — draggable to redistribute flex
                    if (idx < items.length - 1 && editor.isEditable) {
                        const handle = document.createElement('div');
                        handle.style.width = '6px';
                        handle.style.cursor = 'col-resize';
                        handle.style.flexShrink = '0';
                        handle.style.background = 'transparent';
                        handle.style.borderRadius = '2px';
                        handle.style.transition = 'background 120ms';
                        handle.addEventListener('mouseenter', () => { handle.style.background = 'var(--accent)'; });
                        handle.addEventListener('mouseleave', () => { handle.style.background = 'transparent'; });

                        handle.addEventListener('mousedown', (e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const current: GalleryItem[] = (editor.view.state.doc.nodeAt(typeof getPos === 'function' ? getPos()! : 0)?.attrs as any)?.items || items;
                            const leftFlex = current[idx].flex || DEFAULT_FLEX;
                            const rightFlex = current[idx + 1].flex || DEFAULT_FLEX;
                            const totalFlex = leftFlex + rightFlex;
                            const containerWidth = container.getBoundingClientRect().width;

                            const onMove = (ev: MouseEvent) => {
                                const dx = ev.clientX - startX;
                                const frac = dx / containerWidth;
                                const newLeft = Math.max(MIN_FLEX, leftFlex + frac * totalFlex);
                                const newRight = Math.max(MIN_FLEX, totalFlex - newLeft);
                                const next = current.map((it, i) => {
                                    if (i === idx) return { ...it, flex: newLeft };
                                    if (i === idx + 1) return { ...it, flex: newRight };
                                    return it;
                                });
                                if (typeof getPos === 'function') {
                                    editor.view.dispatch(
                                        editor.view.state.tr.setNodeMarkup(getPos(), undefined, { items: next })
                                    );
                                }
                            };
                            const onUp = () => {
                                document.removeEventListener('mousemove', onMove);
                                document.removeEventListener('mouseup', onUp);
                            };
                            document.addEventListener('mousemove', onMove);
                            document.addEventListener('mouseup', onUp);
                        });
                        container.appendChild(handle);
                    }
                });
            };

            render(node);

            return {
                dom: container,
                update: (updatedNode) => {
                    if (updatedNode.type !== node.type) return false;
                    render(updatedNode);
                    return true;
                },
            };
        };
    },
});
