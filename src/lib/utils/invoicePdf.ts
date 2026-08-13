// ============================================
// Client-side PDF Invoice Generator
// Uses jsPDF + jspdf-autotable
// ============================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '@/lib/types/order';
import { calculateDispatchDate } from '@/lib/utils/dispatchCalculator';

interface InvoiceSettings {
  companyName: string;
  companyTagline: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  invoicePrefix: string;
  invoiceFooter: string;
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  companyName: 'TheWorkwear',
  companyTagline: 'THE WORKWEAR SPECIALISTS',
  companyEmail: 'support@theworkwear.uk',
  companyPhone: '',
  companyAddress: 'United Kingdom',
  invoicePrefix: 'INV',
  invoiceFooter: 'Thank you for choosing TheWorkwear — Quality Embroidered & Printed Workwear',
};

/**
 * Replaces non-WinAnsi characters like £ with GBP for safe jsPDF rendering
 */
function sanitizePdfString(str: string): string {
  if (!str) return '';
  return str.replace(/£/g, 'GBP ');
}

export function generateInvoicePdf(order: Order, settings?: Partial<InvoiceSettings>): void {
  try {
    const config = { ...DEFAULT_SETTINGS, ...settings };
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const now = new Date();
    const invoiceNumber = `${config.invoicePrefix}-${now.getFullYear()}-${order.orderNumber}`;
    const invoiceDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const dispatchInfo = calculateDispatchDate(order.orderDate, 10);

    // ---- Header Banner (Dark Premium Navy) ----
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 45, 'F');

    // ---- Company Text (Logo Graphic Removed) ----
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(config.companyName, 20, 22);

    // Subtitle tagline
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(config.companyTagline, 20, 28);

    // INVOICE Badge / Title on top right
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 20, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(invoiceNumber, pageWidth - 20, 28, { align: 'right' });

    doc.setFontSize(8.5);
    doc.text(`Date: ${invoiceDate}`, pageWidth - 20, 35, { align: 'right' });

    // ---- Bill To & Order Info Block ----
    let yPos = 58;

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 20, yPos);
    doc.text('ORDER SUMMARY', 120, yPos);

    // Left Column: Customer details
    yPos += 7;
    let leftY = yPos;
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizePdfString(order.customerName || 'Customer'), 20, leftY);
    leftY += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600

    if (order.customerEmail) {
      doc.text(sanitizePdfString(order.customerEmail), 20, leftY);
      leftY += 5;
    }
    if (order.customerPhone) {
      doc.text(sanitizePdfString(order.customerPhone), 20, leftY);
      leftY += 5;
    }

    if (order.shippingAddress) {
      const addressLines = doc.splitTextToSize(sanitizePdfString(order.shippingAddress), 85);
      doc.text(addressLines, 20, leftY);
      leftY += addressLines.length * 5;
    }

    // Right Column: Order #, Order Date, Status, Target Dispatch Date
    let rightY = yPos;
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${order.orderNumber}`, 120, rightY);
    rightY += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Order Date: ${sanitizePdfString(order.orderDate || '—')}`, 120, rightY);
    rightY += 5;

    doc.text(`Status: ${sanitizePdfString(order.status)}`, 120, rightY);
    rightY += 5;

    if (dispatchInfo.formattedDispatchDate !== '—') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text(`Dispatch Date: ${dispatchInfo.formattedFull}`, 120, rightY);
      doc.setFont('helvetica', 'normal');
    }

    // ---- Divider Line ----
    yPos = Math.max(leftY, rightY) + 8;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

    // ---- Products Table ----
    const tableData = (order.products || []).map((p, idx) => [
      (idx + 1).toString(),
      sanitizePdfString(p.name || '—'),
      sanitizePdfString(p.productCode || '—'),
      sanitizePdfString(p.qty || '—'),
      sanitizePdfString(p.size || '—'),
      sanitizePdfString(p.colour || '—'),
      sanitizePdfString(p.emb || '—'),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'PRODUCT', 'CODE', 'QTY', 'SIZE', 'COLOUR', 'EMB']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249], // slate-100
        textColor: [71, 85, 105], // slate-600
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 4,
      },
      bodyStyles: {
        textColor: [30, 41, 59], // slate-800
        fontSize: 9,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 25, font: 'courier' },
        3: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
        6: { cellWidth: 30 },
      },
      margin: { left: 20, right: 20 },
    });

    // ---- Total Section ----
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(pageWidth - 95, finalY, 75, 24, 3, 3, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', pageWidth - 90, finalY + 9);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const totalDisplay = sanitizePdfString(order.total || '0.00');
    doc.text(totalDisplay, pageWidth - 25, finalY + 17, { align: 'right' });

    // ---- Footer ----
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(config.invoiceFooter, 20, footerY);
    doc.text(config.companyName, pageWidth - 20, footerY, { align: 'right' });

    // ---- Trigger Native PDF Download ----
    const filename = `Invoice-${order.orderNumber}.pdf`;
    doc.save(filename);
  } catch (err: any) {
    console.error('Invoice PDF error:', err);
    throw new Error('Failed to generate invoice PDF: ' + err.message);
  }
}
