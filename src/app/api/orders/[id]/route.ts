// ============================================
// Single Order API — GET/PATCH/DELETE
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchAllOrders, updateOrderStatus, updateOrderFields, batchUpdateCells, deleteOrderRow } from '@/lib/google/sheets';
import { OrderStatus, COLUMN_MAP, getProductColumnIndex } from '@/lib/types/order';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = (session as any)?.accessToken;
    const { id } = await params;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    const orders = await fetchAllOrders(accessToken, spreadsheetId, sheetName);
    const order = orders.find(o => o.orderNumber === id || o.rowIndex.toString() === id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Order GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = (session as any)?.accessToken;
    const { id } = await params;
    const body = await request.json();
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    // First find the order to get its row number
    const orders = await fetchAllOrders(accessToken, spreadsheetId, sheetName);
    const order = orders.find(o => o.orderNumber === id || o.rowIndex.toString() === id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const userRole = (session as any)?.role || (session?.user as any)?.role || 'admin';
    const isDigitizerRole = userRole === 'digitizer';

    const updates: { row: number; col: number; value: string }[] = [];
    let isDigitizedEvent = false;

    // Handle status change
    if (body.status && body.status !== order.status) {
      let cleanStatus = body.status;
      if (/^cancelled$/i.test(body.status)) cleanStatus = 'Cancelled';
      else if (/^digitized$/i.test(body.status)) cleanStatus = 'Digitized';
      else if (/^being made$/i.test(body.status)) cleanStatus = 'Being Made';
      else if (/^done$/i.test(body.status)) cleanStatus = 'Done';
      else if (/^pending$/i.test(body.status)) cleanStatus = 'Pending';

      updates.push({ row: order.rowIndex, col: COLUMN_MAP.status, value: cleanStatus });
      
      // If status is "Digitized", update Processed At
      if (cleanStatus === 'Digitized') {
        isDigitizedEvent = true;
        const now = new Date().toLocaleString('en-AU', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false,
        });
        updates.push({ row: order.rowIndex, col: COLUMN_MAP.processedAt, value: now });
      }
    }

    // Handle core field updates (Blocked for digitizers)
    if (!isDigitizerRole) {
      const fieldMap: Record<string, number> = {
        orderNumber: COLUMN_MAP.orderNumber,
        orderDate: COLUMN_MAP.orderDate,
        customerName: COLUMN_MAP.customerName,
        customerEmail: COLUMN_MAP.customerEmail,
        customerPhone: COLUMN_MAP.customerPhone,
        shippingAddress: COLUMN_MAP.shippingAddress,
        total: COLUMN_MAP.total,
        orderFolder: COLUMN_MAP.orderFolder,
        logoDetails: COLUMN_MAP.logoDetails,
        orderEmail: COLUMN_MAP.orderEmail,
        processedAt: COLUMN_MAP.processedAt,
      };

      for (const [field, colIdx] of Object.entries(fieldMap)) {
        if (body[field] !== undefined && body[field] !== (order as any)[field]) {
          updates.push({ row: order.rowIndex, col: colIdx, value: body[field] });
        }
      }

      // Handle product updates (Blocked for digitizers)
      if (body.products && Array.isArray(body.products)) {
        if (body.replaceAllProducts) {
          // Replace all 10 product slots with updated list (clearing unused slots)
          for (let pIdx = 1; pIdx <= COLUMN_MAP.maxProducts; pIdx++) {
            const prod = body.products[pIdx - 1];
            const values = prod ? [
              prod.name || '',
              prod.productCode || '',
              prod.qty || '',
              prod.size || '',
              prod.colour || '',
              prod.emb || ''
            ] : ['', '', '', '', '', ''];

            [0, 1, 2, 3, 4, 5].forEach((offset, idx) => {
              updates.push({
                row: order.rowIndex,
                col: getProductColumnIndex(pIdx, offset),
                value: values[idx],
              });
            });
          }
        } else {
          // Patch specific products by index
          for (const product of body.products) {
            if (product.index >= 1 && product.index <= COLUMN_MAP.maxProducts) {
              const fields = ['name', 'productCode', 'qty', 'size', 'colour', 'emb'];
              const offsets = [0, 1, 2, 3, 4, 5];
              
              fields.forEach((field, offsetIdx) => {
                if (product[field] !== undefined) {
                  updates.push({
                    row: order.rowIndex,
                    col: getProductColumnIndex(product.index, offsets[offsetIdx]),
                    value: product[field],
                  });
                }
              });
            }
          }
        }
      }
    }


    if (updates.length === 0) {
      return NextResponse.json({ message: 'No changes to save' });
    }

    // Batch update Google Sheets
    await batchUpdateCells(accessToken, spreadsheetId, sheetName, updates);

    // Trigger notification if order was marked Digitized
    if (isDigitizedEvent) {
      const { addNotification } = await import('@/lib/store/notifications');
      addNotification({
        title: `Order #${order.orderNumber} Digitized`,
        message: `Order #${order.orderNumber} was marked as Digitized by ${session.user?.email || 'Digitizer'}.`,
        orderNumber: order.orderNumber,
        type: 'digitized',
        byUser: session.user?.email || undefined,
      });
    }

    return NextResponse.json({ 
      message: 'Order updated successfully',
      updatedFields: updates.length,
    });
  } catch (error: any) {
    console.error('Order PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update order. Changes could not be saved.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session as any)?.role || (session?.user as any)?.role || 'admin';
    if (userRole === 'digitizer') {
      return NextResponse.json({ error: 'Forbidden: Digitizers cannot delete orders' }, { status: 403 });
    }

    const accessToken = (session as any)?.accessToken;
    const { id } = await params;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    // First find the order to locate its spreadsheet row
    const orders = await fetchAllOrders(accessToken, spreadsheetId, sheetName);
    const order = orders.find(o => o.orderNumber === id || o.rowIndex.toString() === id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Delete row from Google Sheets
    await deleteOrderRow(accessToken, spreadsheetId, sheetName, order.rowIndex);

    return NextResponse.json({
      message: `Order #${order.orderNumber} deleted successfully`,
      orderNumber: order.orderNumber,
    });
  } catch (error: any) {
    console.error('Order DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete order from Google Sheets' },
      { status: 500 }
    );
  }
}
