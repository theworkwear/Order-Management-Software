// ============================================
// Dashboard Stats API
// ============================================
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fetchAllOrders } from '@/lib/google/sheets';
import { MonthlySales } from '@/lib/types/order';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = (session as any)?.accessToken;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

    if (!spreadsheetId) {
      return NextResponse.json({
        total: 0, pending: 0, beingMade: 0, digitized: 0, done: 0, cancelled: 0,
        monthlySales: [], recentOrders: [],
      });
    }

    const orders = await fetchAllOrders(accessToken, spreadsheetId, sheetName);

    // Status counts
    const pending = orders.filter(o => o.status === 'Pending').length;
    const beingMade = orders.filter(o => o.status === 'Being Made').length;
    const digitized = orders.filter(o => o.status === 'Digitized').length;
    const done = orders.filter(o => o.status === 'Done').length;
    const cancelled = orders.filter(o => o.status === 'Cancelled').length;

    // Monthly sales calculation
    const monthlyMap = new Map<string, { totalSales: number; orderCount: number }>();

    for (const order of orders) {
      const dateStr = order.orderDate;
      if (!dateStr) continue;
      
      const date = parseOrderDate(dateStr);
      if (!date) continue;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const totalValue = parseFloat(order.total.replace(/[^0-9.-]/g, '')) || 0;

      const existing = monthlyMap.get(monthKey) || { totalSales: 0, orderCount: 0 };
      existing.totalSales += totalValue;
      existing.orderCount += 1;
      monthlyMap.set(monthKey, existing);
    }

    const monthlySales: MonthlySales[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => {
        const [year, m] = month.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        return {
          month,
          monthLabel: `${monthNames[parseInt(m) - 1]} ${year}`,
          totalSales: Math.round(data.totalSales * 100) / 100,
          orderCount: data.orderCount,
        };
      })
      .sort((a, b) => b.month.localeCompare(a.month)); // Most recent first

    // Recent orders (last 10 by date)
    const recentOrders = [...orders]
      .sort((a, b) => {
        const dateA = parseOrderDate(a.orderDate)?.getTime() || 0;
        const dateB = parseOrderDate(b.orderDate)?.getTime() || 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    return NextResponse.json({
      total: orders.length,
      pending,
      beingMade,
      digitized,
      done,
      cancelled,
      monthlySales,
      recentOrders,
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

function parseOrderDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try various common date formats
  // DD/MM/YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try ISO / standard parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  return null;
}
