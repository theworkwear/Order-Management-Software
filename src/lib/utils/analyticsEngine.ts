// ============================================
// AI Intelligence & Business Analytics Engine
// 100% Native - Zero External API Cost
// ============================================

import { Order } from '@/lib/types/order';

export interface ProductStat {
  name: string;
  code: string;
  totalQty: number;
  orderCount: number;
}

export interface CustomerStat {
  name: string;
  email: string;
  orderCount: number;
  totalSpend: number;
}

export interface MonthSummary {
  monthKey: string; // "2026-08"
  label: string;    // "August 2026"
  orderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export interface SmartInsight {
  id: string;
  title: string;
  description: string;
  type: 'growth' | 'product' | 'speed' | 'customer' | 'alert';
}

export function parseTotalAmount(totalStr: string): number {
  if (!totalStr) return 0;
  const num = parseFloat(totalStr.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

export function getMonthKey(dateStr: string): string {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unknown';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  } catch {
    return 'Unknown';
  }
}

export function getMonthLabel(monthKey: string): string {
  if (monthKey === 'Unknown') return 'Unknown Date';
  try {
    const [year, month] = monthKey.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  } catch {
    return monthKey;
  }
}

export function computeAnalytics(orders: Order[], selectedMonthKey: string = 'all') {
  // Filter orders by selected month key if not 'all'
  const filteredOrders = selectedMonthKey === 'all'
    ? orders
    : orders.filter((o) => getMonthKey(o.orderDate) === selectedMonthKey);

  // 1. Sales & Revenue
  let totalRevenue = 0;
  filteredOrders.forEach((o) => {
    totalRevenue += parseTotalAmount(o.total);
  });
  const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  // 2. Product Ranking
  const productMap = new Map<string, ProductStat>();
  filteredOrders.forEach((o) => {
    o.products.forEach((p) => {
      if (!p.name) return;
      const key = p.productCode ? `${p.name.trim()} (${p.productCode.trim()})` : p.name.trim();
      const qty = parseInt(p.qty) || 1;

      const existing = productMap.get(key) || {
        name: p.name.trim(),
        code: p.productCode?.trim() || '—',
        totalQty: 0,
        orderCount: 0,
      };

      existing.totalQty += qty;
      existing.orderCount += 1;
      productMap.set(key, existing);
    });
  });

  const topProducts = Array.from(productMap.values()).sort((a, b) => b.totalQty - a.totalQty);

  // 3. Customer Ranking
  const customerMap = new Map<string, CustomerStat>();
  filteredOrders.forEach((o) => {
    const name = o.customerName || 'Anonymous Customer';
    const email = o.customerEmail || '—';
    const key = email !== '—' ? email : name;
    const spend = parseTotalAmount(o.total);

    const existing = customerMap.get(key) || {
      name,
      email,
      orderCount: 0,
      totalSpend: 0,
    };

    existing.orderCount += 1;
    existing.totalSpend += spend;
    customerMap.set(key, existing);
  });

  const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.totalSpend - a.totalSpend);

  // 4. Monthly Summaries (All months breakdown)
  const monthMap = new Map<string, { count: number; rev: number }>();
  orders.forEach((o) => {
    const mk = getMonthKey(o.orderDate);
    if (mk === 'Unknown') return;
    const spend = parseTotalAmount(o.total);
    const existing = monthMap.get(mk) || { count: 0, rev: 0 };
    existing.count += 1;
    existing.rev += spend;
    monthMap.set(mk, existing);
  });

  const availableMonths: MonthSummary[] = Array.from(monthMap.entries())
    .map(([mk, val]) => ({
      monthKey: mk,
      label: getMonthLabel(mk),
      orderCount: val.count,
      totalRevenue: val.rev,
      avgOrderValue: val.count > 0 ? val.rev / val.count : 0,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // 5. Smart Insights Generation
  const insights: SmartInsight[] = [];

  if (topProducts.length > 0) {
    const bestSeller = topProducts[0];
    insights.push({
      id: 'insight-bestseller',
      title: 'Top Performing Garment',
      description: `"${bestSeller.name}" (${bestSeller.code}) is your #1 best-seller with ${bestSeller.totalQty} units ordered.`,
      type: 'product',
    });
  }

  if (topCustomers.length > 0) {
    const vip = topCustomers[0];
    insights.push({
      id: 'insight-vip',
      title: 'Top VIP Business Client',
      description: `${vip.name} has placed ${vip.orderCount} orders totaling £${vip.totalSpend.toFixed(2)}.`,
      type: 'customer',
    });
  }

  const pendingCount = filteredOrders.filter((o) => o.status === 'Pending').length;
  if (pendingCount > 0) {
    insights.push({
      id: 'insight-queue',
      title: 'Pending Orders Velocity',
      description: `${pendingCount} order(s) currently awaiting production/digitization processing.`,
      type: 'alert',
    });
  } else {
    insights.push({
      id: 'insight-clean-queue',
      title: 'Zero Backlog',
      description: 'All orders in this view are processed or digitized!',
      type: 'speed',
    });
  }

  return {
    filteredOrders,
    totalRevenue,
    avgOrderValue,
    topProducts,
    topCustomers,
    availableMonths,
    insights,
  };
}
