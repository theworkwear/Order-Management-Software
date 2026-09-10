// ============================================
// Client-side Landscape Order Detail / Invoice Generator
// Generates A4 Landscape matching exact "Order Detail" physical layout
// ============================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '@/lib/types/order';
import { calculateDispatchDate, parseOrderDate } from '@/lib/utils/dispatchCalculator';

export interface OrderLandscapeExportOptions {
  profession?: string;
  source?: string;
  logoDetails?: string;
  logoImagesBase64?: string[];
  frontLogoImageBase64?: string;
  backLogoImageBase64?: string;
  extraImages?: string[];
  embroideryFiles?: string[];
}

function sanitizePdfString(str: string): string {
  if (!str) return '';
  return str.replace(/£/g, 'GBP ');
}

function formatToDDMMYYYY(date: Date | null, fallbackStr: string): string {
  if (!date) {
    if (fallbackStr && fallbackStr.includes('/')) return fallbackStr;
    const parsed = parseOrderDate(fallbackStr);
    if (parsed) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return fallbackStr || '—';
  }
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function generateInvoicePdf(order: Order, options?: OrderLandscapeExportOptions): void {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();   // 297 mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;          // 269 mm

    const dispatchInfo = calculateDispatchDate(order.orderDate, 10);
    const orderDateFormatted = formatToDDMMYYYY(dispatchInfo.orderDate, order.orderDate);
    const dispatchDateFormatted = formatToDDMMYYYY(dispatchInfo.dispatchDate, dispatchInfo.formattedDispatchDate);

    // ==========================================
    // 1. Header: "Order Detail"
    // ==========================================
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text('Order Detail', margin, 16);

    // ==========================================
    // 2. Metadata Grid Table
    // ==========================================
    const labelColWidth = 38;
    const valColWidth = (contentWidth - labelColWidth * 2) / 2; // 96.5 mm each

    const metaRows = [
      [
        { content: 'Date order taken:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(orderDateFormatted), styles: { textColor: [15, 23, 42] } },
        { content: 'Contact Name:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(order.customerName || '—'), styles: { textColor: [15, 23, 42] } },
      ],
      [
        { content: 'Dispatch Date', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(dispatchDateFormatted), styles: { textColor: [15, 23, 42] } },
        { content: 'Reference Number', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(order.orderNumber || '—'), styles: { textColor: [15, 23, 42] } },
      ],
      [
        { content: 'Contact Number:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(order.customerPhone || '—'), styles: { textColor: [15, 23, 42] } },
        { content: 'Email:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(order.customerEmail || '—'), styles: { textColor: [15, 23, 42] } },
      ],
      [
        { content: 'Delivery Address:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(order.shippingAddress || '—'), colSpan: 3, styles: { textColor: [15, 23, 42] } },
      ],
      [
        { content: 'Profession:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(options?.profession || '-'), colSpan: 3, styles: { textColor: [15, 23, 42] } },
      ],
      [
        { content: 'Source:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: sanitizePdfString(options?.source || 'Theworkwear Website'), colSpan: 3, styles: { textColor: [15, 23, 42] } },
      ],
    ];

    autoTable(doc, {
      startY: 20,
      body: metaRows as any,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.15,
        font: 'helvetica',
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: labelColWidth },
        1: { cellWidth: valColWidth },
        2: { cellWidth: labelColWidth },
        3: { cellWidth: valColWidth },
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        // Draw inner box around Source value cell to match reference design
        if (data.row.index === 5 && data.column.index === 1) {
          const docRef = data.doc;
          docRef.setDrawColor(203, 213, 225); // slate-300
          docRef.setLineWidth(0.2);
          docRef.roundedRect(data.cell.x + 1, data.cell.y + 1, data.cell.width - 2, data.cell.height - 2, 1, 1, 'S');
        }
      },
    });

    const metaFinalY = (doc as any).lastAutoTable.finalY || 62;

    // ==========================================
    // 3. Products Table
    // ==========================================
    const productCols = [
      { header: 'Product', dataKey: 'name' },
      { header: 'Product Code', dataKey: 'code' },
      { header: 'QTY', dataKey: 'qty' },
      { header: 'Size', dataKey: 'size' },
      { header: 'Colour', dataKey: 'colour' },
      { header: 'EMB(F/B)', dataKey: 'emb' },
    ];

    const productRows = (order.products && order.products.length > 0)
      ? order.products.map(p => ({
          name: sanitizePdfString(p.name || '—'),
          code: sanitizePdfString(p.productCode || '—'),
          qty: sanitizePdfString(p.qty || '1'),
          size: sanitizePdfString(p.size || '—'),
          colour: sanitizePdfString(p.colour || '—'),
          emb: sanitizePdfString(p.emb || 'LB / B'),
        }))
      : [
          { name: 'Polos', code: 'UC101', qty: '4', size: 'L', colour: 'Black', emb: 'LB / B' },
          { name: 'Hoodies', code: 'UX4', qty: '1', size: 'L', colour: 'Black', emb: 'LB / B' },
          { name: 'Jackets', code: 'TRA628', qty: '1', size: 'L', colour: 'Black', emb: 'LB / B' },
        ];

    autoTable(doc, {
      startY: metaFinalY + 3.5,
      columns: productCols,
      body: productRows,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [100, 116, 139], // slate-500
        fontSize: 8,
        fontStyle: 'normal',
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      bodyStyles: {
        textColor: [15, 23, 42],
        fontSize: 8.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        lineColor: [226, 232, 240],
        lineWidth: 0.15,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 42 },
        2: { cellWidth: 22, halign: 'left' },
        3: { cellWidth: 35 },
        4: { cellWidth: 45 },
        5: { cellWidth: 55 },
      },
      margin: { left: margin, right: margin },
    });

    const productsFinalY = (doc as any).lastAutoTable.finalY || 105;

    // ==========================================
    // 4. Picture of Logo Section (All Logos on Left Side)
    // ==========================================
    const artworkStartY = productsFinalY + 6;
    const col1X = margin;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PICTURE OF LOGO', col1X, artworkStartY);

    const allLogoB64s: string[] = [];
    if (options?.logoImagesBase64 && options.logoImagesBase64.length > 0) {
      allLogoB64s.push(...options.logoImagesBase64);
    } else {
      if (options?.frontLogoImageBase64) allLogoB64s.push(options.frontLogoImageBase64);
      if (options?.backLogoImageBase64) allLogoB64s.push(options.backLogoImageBase64);
    }

    const logoBoxWidth = 16;
    const logoBoxHeight = 16;
    const logoBoxGap = 4;
    const logoImgTopY = artworkStartY + 2.5;

    if (allLogoB64s.length > 0) {
      allLogoB64s.forEach((imgData, idx) => {
        const imgX = col1X + idx * (logoBoxWidth + logoBoxGap);
        if (imgX + logoBoxWidth <= pageWidth - margin) {
          try {
            let format = 'PNG';
            if (imgData.startsWith('data:image/jpeg') || imgData.startsWith('data:image/jpg')) {
              format = 'JPEG';
            } else if (imgData.startsWith('data:image/webp')) {
              format = 'WEBP';
            }
            doc.addImage(imgData, format, imgX, logoImgTopY, logoBoxWidth, logoBoxHeight, undefined, 'FAST');
          } catch (e) {
            console.warn('Could not render logo image in PDF:', e);
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(imgX, logoImgTopY, logoBoxWidth, logoBoxHeight, 2, 2, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.2);
            doc.roundedRect(imgX, logoImgTopY, logoBoxWidth, logoBoxHeight, 2, 2, 'S');
          }
        }
      });
    } else {
      // Draw subtle circular / rounded logo emblem placeholder
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(col1X, logoImgTopY, 14, 14, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(col1X, logoImgTopY, 14, 14, 2, 2, 'S');
    }

    // ==========================================
    // 5. Logo Details Box (Properly offset below images to prevent overlap)
    // ==========================================
    const logoImgBottomY = logoImgTopY + logoBoxHeight;
    const logoDetailsY = logoImgBottomY + 6; // Clear 6mm spacing below the logo pictures
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('LOGO DETAILS', col1X, logoDetailsY);

    const boxY = logoDetailsY + 2.5;
    const boxHeight = 12;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(col1X, boxY, contentWidth, boxHeight, 1.5, 1.5, 'S');

    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const logoDetailsText = options?.logoDetails || order.logoDetails || '';
    if (logoDetailsText.trim()) {
      const splitLines = doc.splitTextToSize(sanitizePdfString(logoDetailsText), contentWidth - 6);
      doc.text(splitLines, col1X + 3, boxY + 4.5);
    }

    // Save and download PDF
    const filename = `Invoice-${order.orderNumber}.pdf`;
    doc.save(filename);
  } catch (err: any) {
    console.error('Invoice PDF error:', err);
    throw new Error('Failed to generate invoice PDF: ' + err.message);
  }
}
