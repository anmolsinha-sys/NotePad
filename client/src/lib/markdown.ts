import TurndownService from 'turndown';
import { marked } from 'marked';

const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
});

// Preserve gallery as a sequence of image lines
turndown.addRule('imageGallery', {
    filter: (node) => node.nodeName === 'DIV' && (node as HTMLElement).getAttribute('data-type') === 'image-gallery',
    replacement: (_, node) => {
        const el = node as HTMLElement;
        const imgs = Array.from(el.querySelectorAll('img'));
        if (imgs.length === 0) return '';
        return '\n\n' + imgs.map((img) => `![${img.getAttribute('alt') || ''}](${img.getAttribute('src') || ''})`).join('\n') + '\n\n';
    },
});

// Mermaid -> fenced code block
turndown.addRule('mermaid', {
    filter: (node) => node.nodeName === 'PRE' && (node as HTMLElement).classList.contains('mermaid'),
    replacement: (_, node) => {
        const el = node as HTMLElement;
        return '\n```mermaid\n' + el.textContent + '\n```\n';
    },
});

export const htmlToMarkdown = (html: string): string => turndown.turndown(html);

marked.setOptions({ gfm: true, breaks: false });

export const markdownToHtml = (md: string): string => {
    const result = marked.parse(md);
    return typeof result === 'string' ? result : String(result);
};

export const downloadMarkdown = (filename: string, md: string) => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};
