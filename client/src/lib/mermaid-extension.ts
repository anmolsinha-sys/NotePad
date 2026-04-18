import { Node, mergeAttributes } from '@tiptap/core';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

export const Mermaid = Node.create({
    name: 'mermaid',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            content: {
                default: 'graph TD\n  A[Start] --> B{Is it working?}\n  B -- Yes --> C[Great!]\n  B -- No --> D[Fix it]',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'pre',
                getAttrs: (element) => {
                    if (typeof element === 'string') return false;
                    const container = element as HTMLElement;
                    return container.classList.contains('mermaid') ? { content: container.innerText } : false;
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['pre', mergeAttributes(HTMLAttributes, { class: 'mermaid' }), HTMLAttributes.content];
    },

    addNodeView() {
        return ({ node, HTMLAttributes, getPos, editor }) => {
            const container = document.createElement('div');
            container.className = 'mermaid-container my-8 relative group';

            const renderContainer = document.createElement('div');
            renderContainer.className = 'mermaid-render bg-white/5 p-8 rounded-3xl border border-white/10 flex justify-center shadow-2xl';

            const render = async (contentToRender?: string) => {
                const id = `mermaid-${Math.floor(Math.random() * 1000000)}`;
                const currentContent = contentToRender || node.attrs.content;
                try {
                    const { svg } = await mermaid.render(id, currentContent);
                    renderContainer.innerHTML = DOMPurify.sanitize(svg, {
                        USE_PROFILES: { svg: true, svgFilters: true },
                        FORBID_TAGS: ['script', 'foreignObject'],
                        FORBID_ATTR: ['onerror', 'onload', 'onclick'],
                    });
                    const svgEl = renderContainer.querySelector('svg');
                    if (svgEl) {
                        svgEl.style.maxWidth = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.color = 'white'; // Force white for dark models
                    }
                } catch (e) {
                    renderContainer.innerHTML = `<div class="text-red-400 text-xs font-mono p-4">Invalid Mermaid Syntax</div>`;
                }
            };

            const editButton = document.createElement('button');
            editButton.className = 'absolute top-4 right-4 px-4 py-2 bg-blue-600/50 hover:bg-blue-600 rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest z-10 backdrop-blur-xl border border-white/10';
            editButton.innerText = 'Edit Matrix';

            container.append(renderContainer, editButton);

            editButton.onclick = () => {
                const newContent = window.prompt('Edit Quantum Diagram (Mermaid Syntax):', node.attrs.content);
                if (newContent !== null) {
                    if (typeof getPos === 'function') {
                        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
                            ...node.attrs,
                            content: newContent,
                        }));
                    }
                }
            };

            render();

            return {
                dom: container,
                update: (updatedNode) => {
                    if (updatedNode.type !== node.type) return false;
                    const newContent = (updatedNode.attrs as any).content;
                    if (newContent !== (node.attrs as any).content) {
                        render(newContent);
                    }
                    return true;
                },
            };
        };
    },
});
