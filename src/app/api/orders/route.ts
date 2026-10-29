// ============================================
// Orders API — GET all orders from Google Sheets
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchAllOrders, appendOrderRow } from '@/lib/google/sheets';

export async function GET(request: NextRequest) {

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = (session as any)?.accessToken;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet not configured' }, { status: 500 });
    }

    const orders = await fetchAllOrders(accessToken, spreadsheetId, sheetName);

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'all';
    const sortBy = searchParams.get('sortBy') || 'orderDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');

    let filtered = orders;

    // Search filter
    if (search) {
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerEmail.toLowerCase().includes(search) ||
        o.products.some(p => p.name.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(o => o.status.toLowerCase() === status.toLowerCase());
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortBy) {
        case 'orderDate':
          aVal = parseDate(a.orderDate);
          bVal = parseDate(b.orderDate);
          break;
        case 'orderNumber':
          aVal = a.orderNumber;
          bVal = b.orderNumber;
          break;
        case 'customerName':
          aVal = a.customerName.toLowerCase();
          bVal = b.customerName.toLowerCase();
          break;
        case 'total':
          aVal = parseFloat(a.total.replace(/[^0-9.-]/g, '')) || 0;
          bVal = parseFloat(b.total.replace(/[^0-9.-]/g, '')) || 0;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = a.orderNumber;
          bVal = b.orderNumber;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / perPage);
    const paginatedOrders = filtered.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({
      orders: paginatedOrders,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Orders API error:', error);
    
    if (error?.code === 401 || error?.message?.includes('invalid_grant')) {
      return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch orders. Please check your data connection.' },
      { status: 500 }
    );
  }
}

function parseDate(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session as any)?.role || (session?.user as any)?.role || 'admin';
    if (role === 'digitizer') {
      return NextResponse.json({ error: 'Digitizers are not permitted to create orders' }, { status: 403 });
    }

    const accessToken = (session as any)?.accessToken;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet not configured' }, { status: 500 });
    }

    const body = await request.json();
    if (!body.orderNumber || !body.customerName) {
      return NextResponse.json({ error: 'Order Number and Customer Name are required' }, { status: 400 });
    }

    await appendOrderRow(accessToken, spreadsheetId, sheetName, body);

    return NextResponse.json({
      message: 'Order created successfully',
      orderNumber: body.orderNumber,
    });
  } catch (error: any) {
    console.error('Create Order API error:', error);
    return NextResponse.json(
      { error: 'Failed to create order. ' + (error.message || '') },
      { status: 500 }
    );
  }
}


