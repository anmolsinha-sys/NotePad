import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

export const exportToPDF = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Detected style for background
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

        // Use standard dimensions for clarity
        const pdf = new jsPDF({
            orientation: element.offsetWidth > element.offsetHeight ? 'landscape' : 'portrait',
            unit: 'px',
            format: [element.offsetWidth * 2, element.offsetHeight * 2],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, element.offsetWidth * 2, element.offsetHeight * 2);
        pdf.save(`${filename}.pdf`);
    } catch (e) {
        console.error('Modern Export failed:', e);
    }
};
