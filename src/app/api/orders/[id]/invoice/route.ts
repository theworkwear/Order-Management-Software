// ============================================
// PDF Invoice Download API Route
// ============================================
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchAllOrders } from '@/lib/google/sheets';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateDispatchDate } from '@/lib/utils/dispatchCalculator';

function sanitizePdfString(str: string): string {
  if (!str) return '';
  return str.replace(/£/g, 'GBP ');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const orderId = decodeURIComponent(id);

    const accessToken = (session as any)?.accessToken;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID not configured' }, { status: 500 });
    }

    const orders = await fetchAllOrders(accessToken, spreadsheetId, sheetName);
    const order = orders.find(o => o.orderNumber === orderId || o.rowIndex.toString() === orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}-${order.orderNumber}`;
    const invoiceDate = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const dispatchInfo = calculateDispatchDate(order.orderDate, 10);

    // ---- Header Banner (Dark Premium Navy) ----
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 45, 'F');

    // ---- Company Logo Text (Graphic Icon Removed) ----
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('TheWorkwear', 20, 22);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('THE WORKWEAR SPECIALISTS', 20, 28);

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

    // ---- Bill To & Order Summary Block ----
    let yPos = 58;

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 20, yPos);
    doc.text('ORDER SUMMARY', 120, yPos);

    yPos += 7;
    let leftY = yPos;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(sanitizePdfString(order.customerName || 'Customer'), 20, leftY);
    leftY += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);

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
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${order.orderNumber}`, 120, rightY);
    rightY += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Order Date: ${sanitizePdfString(order.orderDate || '—')}`, 120, rightY);
    rightY += 5;

    doc.text(`Status: ${sanitizePdfString(order.status)}`, 120, rightY);
    rightY += 5;

    if (dispatchInfo.formattedDispatchDate !== '—') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text(`Dispatch Date: ${dispatchInfo.formattedFull}`, 120, rightY);
      doc.setFont('helvetica', 'normal');
    }

    yPos = Math.max(leftY, rightY) + 8;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;

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
        fillColor: [241, 245, 249],
        textColor: [71, 85, 105],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 4,
      },
      bodyStyles: {
        textColor: [30, 41, 59],
        fontSize: 9,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
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

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFillColor(248, 250, 252);
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

    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for choosing TheWorkwear — Quality Embroidered & Printed Workwear', 20, footerY);
    doc.text('TheWorkwear', pageWidth - 20, footerY, { align: 'right' });

    const pdfArrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(pdfArrayBuffer);

    const filename = `Invoice-${order.orderNumber}.pdf`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 });
  }
}
