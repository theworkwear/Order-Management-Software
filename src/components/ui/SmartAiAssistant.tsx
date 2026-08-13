'use client';

import { useState } from 'react';
import { Order } from '@/lib/types/order';
import { Sparkles, Calendar, DollarSign, Package, CheckCircle2, Clock, Scan, RefreshCw } from 'lucide-react';

interface SmartAiAssistantProps {
  orders: Order[];
}

export default function SmartAiAssistant({ orders }: SmartAiAssistantProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  const [queryResult, setQueryResult] = useState<{
    monthLabel: string;
    totalOrders: number;
    totalRevenue: number;
    pendingCount: number;
    beingMadeCount: number;
    digitizedCount: number;
    doneCount: number;
    topProduct: string;
  } | null>(null);
  const [querying, setQuerying] = useState(false);

  // Generate unique available months from orders data
  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    orders.forEach((o) => {
      if (o.orderDate) {
        // Expected format "August 11, 2026" or "2026-08-11" or "11/08/2026"
        try {
          const date = new Date(o.orderDate);
          if (!isNaN(date.getTime())) {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthsSet.add(key);
          }
        } catch {
          // Ignore
        }
      }
    });

    const monthsArr = Array.from(monthsSet).sort().reverse();
    return monthsArr;
  };

  const availableMonths = getAvailableMonths();

  const handleRunAiQuery = () => {
    setQuerying(true);

    setTimeout(() => {
      let filtered = orders;
      let label = 'All Time';

      if (selectedMonth !== 'all') {
        filtered = orders.filter((o) => {
          if (!o.orderDate) return false;
          try {
            const date = new Date(o.orderDate);
            if (isNaN(date.getTime())) return true;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return key === selectedMonth || selectedMonth === 'current';
          } catch {
            return true;
          }
        });

        if (selectedMonth === 'current' || availableMonths.length > 0) {
          const now = new Date();
          label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        }
      }

      // Calculate totals
      let revenue = 0;
      const productCounts: Record<string, number> = {};

      filtered.forEach((o) => {
        // Parse numerical total
        if (o.total) {
          const num = parseFloat(o.total.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) revenue += num;
        }
        // Count products
        o.products.forEach((p) => {
          if (p.name) {
            productCounts[p.name] = (productCounts[p.name] || 0) + (parseInt(p.qty) || 1);
          }
        });
      });

      // Find top product
      let topProd = 'T-Shirt';
      let maxQty = 0;
      Object.entries(productCounts).forEach(([name, qty]) => {
        if (qty > maxQty) {
          maxQty = qty;
          topProd = name;
        }
      });

      setQueryResult({
        monthLabel: label,
        totalOrders: filtered.length,
        totalRevenue: revenue,
        pendingCount: filtered.filter((o) => o.status === 'Pending').length,
        beingMadeCount: filtered.filter((o) => o.status === 'Being Made').length,
        digitizedCount: filtered.filter((o) => o.status === 'Digitized').length,
        doneCount: filtered.filter((o) => o.status === 'Done').length,
        topProduct: topProd,
      });

      setQuerying(false);
    }, 400);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with AI Tag */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base tracking-wide text-white">Smart Analytics</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm">
                AI Tag
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated sales & order intelligence engine
            </p>

          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          >
            <option value="current">Current Month (August 2026)</option>
            <option value="all">All Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunAiQuery}
            disabled={querying}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${querying ? 'animate-spin' : ''}`} />
            {querying ? 'Querying...' : 'Run Query'}
          </button>
        </div>
      </div>

      {/* Query Results Cards */}
      {queryResult ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 fade-in mt-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-blue-400" /> Total Orders
            </p>
            <p className="text-xl font-bold text-white mt-1">{queryResult.totalOrders}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{queryResult.monthLabel}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Revenue
            </p>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              £{queryResult.totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Calculated total</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Scan className="w-3.5 h-3.5 text-purple-400" /> Digitized Orders
            </p>
            <p className="text-xl font-bold text-purple-300 mt-1">{queryResult.digitizedCount}</p>
            <p className="text-[10px] text-purple-400 mt-0.5">{queryResult.pendingCount} still pending</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Top Product
            </p>
            <p className="text-sm font-bold text-white mt-1.5 truncate" title={queryResult.topProduct}>
              {queryResult.topProduct}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Highest volume</p>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center text-slate-300 text-xs">
          Click <span className="font-semibold text-purple-300">"Run Query"</span> to automatically fetch order count, status breakdown, and total revenue for the selected month!
        </div>
      )}
    </div>
  );
}
