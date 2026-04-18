import { toast } from 'sonner';

const PRINT_STYLES = `
:root {
  color-scheme: light;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
}
body {
  margin: 0;
  background: #ffffff;
  color: #111111;
  font-size: 12pt;
  line-height: 1.55;
}
.page {
  max-width: 680px;
  margin: 0 auto;
  padding: 32px 36px 48px;
}
header.meta {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 14px;
  margin-bottom: 22px;
}
header.meta h1 {
  font-size: 22pt;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0 0 6px;
  line-height: 1.15;
  color: #000;
}
header.meta .sub {
  font-size: 9.5pt;
  color: #6b7280;
  letter-spacing: 0.02em;
}
.content h1 { font-size: 18pt; font-weight: 700; margin: 1.2em 0 0.4em; color: #000; }
.content h2 { font-size: 15pt; font-weight: 700; margin: 1.1em 0 0.4em; color: #111; }
.content h3 { font-size: 12.5pt; font-weight: 600; margin: 1em 0 0.3em; color: #111; }
.content p  { margin: 0.6em 0; }
.content ul, .content ol { margin: 0.5em 0 0.5em 1.4em; padding: 0; }
.content li { margin: 0.25em 0; }
.content blockquote {
  border-left: 3px solid #d4d4d8;
  color: #4b5563;
  padding: 2px 12px;
  margin: 0.8em 0;
  font-style: italic;
}
.content code {
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 10.5pt;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
  border-radius: 3px;
  padding: 0 3px;
}
.content pre {
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 10pt;
  background: #f8fafc;
  border: 1px solid #e4e4e7;
  border-radius: 4px;
  padding: 10px 12px;
  overflow-x: auto;
  line-height: 1.5;
  color: #111;
  page-break-inside: avoid;
  white-space: pre-wrap;
}
.content pre code { background: transparent; border: none; padding: 0; }
.content a { color: #047857; }
.content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
  page-break-inside: avoid;
}
.content hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.2em 0; }
.content table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 10.5pt; }
.content th, .content td { border: 1px solid #e4e4e7; padding: 6px 8px; text-align: left; vertical-align: top; }
.content th { background: #f4f4f5; font-weight: 600; }
.content mark { background: #fef9c3; color: inherit; padding: 0 2px; }
.content a.wikilink {
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 2px;
  padding: 0 4px;
  text-decoration: none;
  font-size: 0.9em;
}
.footer-note {
  margin-top: 40px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 9pt;
  color: #9ca3af;
  text-align: center;
  letter-spacing: 0.04em;
}
@page { margin: 18mm; }
@media print {
  body { background: white; }
  .page { padding: 0; max-width: none; }
  .no-print { display: none !important; }
}
`;

const stripControlChrome = (html: string): string => {
    // Remove editor tooling / resize handles / html2canvas-ignore blocks
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    doc.querySelectorAll('[data-html2canvas-ignore], .flex-image-resizer').forEach((el) => el.remove());
    doc.querySelectorAll('.flex-image-wrap').forEach((el) => {
        // Strip absolute positioning so images land naturally in the printout
        (el as HTMLElement).style.position = 'static';
        (el as HTMLElement).style.left = 'auto';
        (el as HTMLElement).style.top = 'auto';
        (el as HTMLElement).classList.remove('mode-free');
    });
    return doc.body.firstElementChild?.innerHTML || html;
};

const escapeHtml = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        toast.error('Nothing to export.');
        return;
    }

    const title = filename || 'Note';
    const now = new Date().toLocaleString();
    const contentHtml = stripControlChrome(element.innerHTML);

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
<div class="page">
    <header class="meta">
        <h1>${escapeHtml(title)}</h1>
        <div class="sub">Exported ${escapeHtml(now)} · Notepad</div>
    </header>
    <article class="content">${contentHtml}</article>
    <div class="footer-note">Use your browser&rsquo;s print dialog to save as PDF.</div>
</div>
<script>
window.addEventListener('load', function() {
    setTimeout(function() {
        window.focus();
        window.print();
    }, 250);
});
</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
        toast.error('Could not open print window. Check your popup blocker.');
        return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('Print dialog opened — choose "Save as PDF" to export');
};
