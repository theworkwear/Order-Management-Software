'use client';

import { useState, useEffect } from 'react';
import { Order } from '@/lib/types/order';
import { computeAnalytics } from '@/lib/utils/analyticsEngine';
import { exportOrdersToCsv } from '@/lib/utils/csvExport';
import {
  Sparkles,
  TrendingUp,
  Package,
  Users,
  Download,
  Calendar,
  DollarSign,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/orders?page=1&limit=500');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const analytics = computeAnalytics(orders, selectedMonth);

  const handleExportCsv = () => {
    const monthLabel = selectedMonth === 'all' ? 'All-Time' : selectedMonth;
    const filename = `WorkWear-Orders-${monthLabel}.csv`;
    exportOrdersToCsv(analytics.filteredOrders, filename);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-10 bg-slate-200 rounded-xl w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto fade-in">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30">
              In-Software Business Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Analytics & Business Intelligence</h1>
          <p className="text-xs text-slate-300">
            Real-time sales insights, garment popularity metrics, and VIP client analytics
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 backdrop-blur-md">
            <Calendar className="w-3.5 h-3.5 text-purple-300" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="text-slate-900">All Months Overview</option>
              {analytics.availableMonths.map((m) => (
                <option key={m.monthKey} value={m.monthKey} className="text-slate-900">
                  {m.label} ({m.orderCount} orders)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Monthly Sheet (.csv)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">£{analytics.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">
              Avg Order Value: <span className="font-semibold text-slate-700">£{analytics.avgOrderValue.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders Count</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900">{analytics.filteredOrders.length}</p>
            <p className="text-xs text-slate-400 mt-1">
              Selected Period Orders
            </p>
          </div>
        </div>

        {/* Top Product */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Garment</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-base font-extrabold text-slate-900 truncate">
              {analytics.topProducts[0]?.name || 'N/A'}
            </p>
            <p className="text-xs text-purple-600 font-semibold mt-1">
              {analytics.topProducts[0] ? `${analytics.topProducts[0].totalQty} units ordered` : '—'}
            </p>
          </div>
        </div>

        {/* Top Client */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Business Client</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-base font-extrabold text-slate-900 truncate">
              {analytics.topCustomers[0]?.name || 'N/A'}
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-1">
              {analytics.topCustomers[0] ? `£${analytics.topCustomers[0].totalSpend.toFixed(2)} total spend` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Smart Insight Badges Row */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" /> Dynamic Business Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {analytics.insights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 rounded-xl bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border border-purple-100 flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900">{insight.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Top Garment & Product Popularity */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Garment Popularity Ranking</h3>
              <p className="text-xs text-slate-400">Most requested workwear items by total units</p>
            </div>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {analytics.topProducts.slice(0, 7).map((prod, idx) => {
              const maxQty = analytics.topProducts[0]?.totalQty || 1;
              const pct = Math.round((prod.totalQty / maxQty) * 100);

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {idx + 1}. {prod.name} <span className="font-mono text-slate-400 font-normal">[{prod.code}]</span>
                    </span>
                    <span className="font-semibold text-purple-700">{prod.totalQty} units ({prod.orderCount} orders)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {analytics.topProducts.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No product metrics available for this period</p>
            )}
          </div>
        </div>

        {/* Right: VIP Business Accounts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">VIP Business Clients</h3>
              <p className="text-xs text-slate-400">Highest revenue customers for selected period</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {analytics.topCustomers.slice(0, 6).map((cust, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 font-bold text-xs text-slate-700 flex items-center justify-center">
                    #{idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{cust.name}</p>
                    <p className="text-[11px] text-slate-400">{cust.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-extrabold text-slate-900">£{cust.totalSpend.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400">{cust.orderCount} order{cust.orderCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}

            {analytics.topCustomers.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No customer records available for this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
