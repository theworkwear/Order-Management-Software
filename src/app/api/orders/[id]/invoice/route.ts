// ============================================
// PDF Order Detail / Invoice Download API Route
// Generates A4 Landscape matching the exact "Order Detail" physical layout
// ============================================
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchAllOrders } from '@/lib/google/sheets';
import { google } from 'googleapis';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateDispatchDate, parseOrderDate } from '@/lib/utils/dispatchCalculator';

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

function getDriveAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    let key = process.env.GOOGLE_PRIVATE_KEY.trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }
    key = key.replace(/\\n/g, '\n');

    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),
      key,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
  }

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const keys = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return google.auth.fromJSON(keys) as any;
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
    }
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    }
    return auth;
  }

  return null;
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

    // Try to fetch all logo images from Drive folder if available
    const logoImagesBase64: string[] = [];

    if (order.orderFolder) {
      try {
        const folderIdMatch = order.orderFolder.match(/[-\w]{25,}/);
        if (folderIdMatch) {
          const folderId = folderIdMatch[0];
          const auth = getDriveAuth();
          if (auth) {
            const drive = google.drive({ version: 'v3', auth: auth as any });
            const listRes = await drive.files.list({
              q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
              fields: 'files(id, name, mimeType)',
              pageSize: 10,
            });

            const files = listRes.data.files || [];
            const imgFiles = files.filter(f => f.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name || ''));
            for (const imgFile of imgFiles) {
              if (imgFile.id) {
                try {
                  const fileStream = await drive.files.get(
                    { fileId: imgFile.id, alt: 'media' },
                    { responseType: 'arraybuffer' }
                  );
                  const b64 = Buffer.from(fileStream.data as ArrayBuffer).toString('base64');
                  const mime = imgFile.mimeType || 'image/png';
                  logoImagesBase64.push(`data:${mime};base64,${b64}`);
                } catch (e) {
                  console.warn(`Failed to fetch image ${imgFile.name}:`, e);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not load logos from Drive for PDF:', err);
      }
    }

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
        { content: '-', colSpan: 3, styles: { textColor: [15, 23, 42] } },
      ],
      [
        { content: 'Source:', styles: { fontStyle: 'normal' as const, textColor: [100, 116, 139] } },
        { content: 'Theworkwear Website', colSpan: 3, styles: { textColor: [15, 23, 42] } },
      ],
    ];

    autoTable(doc, {
      startY: 20,
      body: metaRows as any,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        lineColor: [226, 232, 240],
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
        if (data.row.index === 5 && data.column.index === 1) {
          const docRef = data.doc;
          docRef.setDrawColor(203, 213, 225);
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
        textColor: [100, 116, 139],
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

    const logoBoxWidth = 16;
    const logoBoxHeight = 16;
    const logoBoxGap = 4;
    const logoImgTopY = artworkStartY + 2.5;

    if (logoImagesBase64.length > 0) {
      logoImagesBase64.forEach((imgData, idx) => {
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
            console.warn('Failed to embed logo in server invoice PDF:', e);
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(imgX, logoImgTopY, logoBoxWidth, logoBoxHeight, 2, 2, 'F');
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.2);
            doc.roundedRect(imgX, logoImgTopY, logoBoxWidth, logoBoxHeight, 2, 2, 'S');
          }
        }
      });
    } else {
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(col1X, logoImgTopY, 14, 14, 2, 2, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(col1X, logoImgTopY, 14, 14, 2, 2, 'S');
    }

    // ==========================================
    // 5. Logo Details Box (Properly offset below images)
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
    const logoDetailsText = order.logoDetails || '';
    if (logoDetailsText.trim()) {
      const splitLines = doc.splitTextToSize(sanitizePdfString(logoDetailsText), contentWidth - 6);
      doc.text(splitLines, col1X + 3, boxY + 4.5);
    }

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
