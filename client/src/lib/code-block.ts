import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

export const EnhancedCodeBlock = CodeBlockLowlight.extend({
    addNodeView() {
        return ({ node, HTMLAttributes, getPos, editor }) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrap';

            const header = document.createElement('div');
            header.className = 'code-block-header';
            header.setAttribute('contenteditable', 'false');

            const langBadge = document.createElement('span');
            langBadge.className = 'code-block-lang';
            langBadge.textContent = (node.attrs.language || 'text').toLowerCase();

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'code-block-copy';
            copyBtn.textContent = 'copy';
            copyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const pre = wrapper.querySelector('pre');
                const text = pre?.textContent || '';
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.textContent = 'copied';
                    setTimeout(() => { copyBtn.textContent = 'copy'; }, 1500);
                } catch {
                    copyBtn.textContent = 'failed';
                    setTimeout(() => { copyBtn.textContent = 'copy'; }, 1500);
                }
            });

            header.appendChild(langBadge);
            header.appendChild(copyBtn);

            const pre = document.createElement('pre');
            Object.entries(HTMLAttributes || {}).forEach(([k, v]) => {
                if (typeof v === 'string') pre.setAttribute(k, v);
            });
            const code = document.createElement('code');
            if (node.attrs.language) code.className = `language-${node.attrs.language}`;
            pre.appendChild(code);

            wrapper.appendChild(header);
            wrapper.appendChild(pre);

            return {
                dom: wrapper,
                contentDOM: code,
                update: (updatedNode) => {
                    if (updatedNode.type.name !== this.name) return false;
                    langBadge.textContent = (updatedNode.attrs.language || 'text').toLowerCase();
                    const nextLang = updatedNode.attrs.language;
                    if (nextLang) code.className = `language-${nextLang}`;
                    else code.className = '';
                    return true;
                },
            };
        };
    },
});
