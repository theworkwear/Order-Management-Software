// ============================================
// Invoice Generation API
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchAllOrders } from '@/lib/google/sheets';
import { getSettings, addInvoice, getNextInvoiceNumber, getInvoices } from '@/lib/store/config';
import { Invoice, InvoiceItem } from '@/lib/types/invoice';

// GET — List all invoices
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const invoices = getInvoices();
    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

// POST — Generate invoice for an order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = (session as any)?.accessToken;
    const { orderNumber } = await request.json();
    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    const orders = await fetchAllOrders(accessToken, spreadsheetId, sheetName);
    const order = orders.find(o => o.orderNumber === orderNumber);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const settings = getSettings();
    const invoiceNumber = getNextInvoiceNumber();

    const items: InvoiceItem[] = order.products.map(p => ({
      product: p.name,
      productCode: p.productCode,
      qty: p.qty,
      size: p.size,
      colour: p.colour,
      emb: p.emb,
    }));

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      items,
      total: order.total,
      invoiceDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      pdfPath: '',
    };

    addInvoice(invoice);

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
