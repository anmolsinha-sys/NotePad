import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

const LARGE_DOC_BYTES = 500_000;

export const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const htmlBytes = element.innerHTML.length;
    if (htmlBytes > LARGE_DOC_BYTES) {
        toast.message('Large note — PDF export may take a moment.', { duration: 3000 });
    }

    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor;

    try {
        const imgData = await domToPng(element, {
            scale: 2,
            backgroundColor: bgColor,
            filter: (el) => {
                const e = el as HTMLElement;
                if (e.hasAttribute && e.hasAttribute('data-html2canvas-ignore')) return false;
                return true;
            },
        });

        const pdf = new jsPDF({
            orientation: element.offsetWidth > element.offsetHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [element.offsetWidth * 2, element.offsetHeight * 2],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, element.offsetWidth * 2, element.offsetHeight * 2);
        pdf.save(`${filename}.pdf`);
        toast.success('PDF exported');
    } catch (e) {
        toast.error('PDF export failed');
    }
};
