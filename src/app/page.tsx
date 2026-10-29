'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { 
  Package, Clock, Hammer, Scan, CheckCircle2, 
  TrendingUp, RefreshCw, ArrowRight, DollarSign,
  CalendarDays, Eye, Plus, XCircle
} from 'lucide-react';
import CreateOrderModal from '@/components/ui/CreateOrderModal';
import DispatchDateCard from '@/components/ui/DispatchDateCard';


import { Order, DashboardStats, MonthlySales, OrderStatus } from '@/lib/types/order';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setError('');
      const res = await fetch('/api/stats');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch');
      }
      const data = await res.json();
      setStats(data);
      setLastSynced(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await fetchStats();
    setSyncing(false);
  };

  const formatTotal = (totalStr: string) => {
    if (!totalStr) return '—';
    const trimmed = totalStr.trim();
    if (trimmed.startsWith('£') || trimmed.startsWith('$') || trimmed.startsWith('€')) {
      return trimmed;
    }
    return `£${trimmed}`;
  };


  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 skeleton rounded-lg" />
            <div className="h-4 w-64 skeleton rounded-lg mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 skeleton rounded-xl" />
          <div className="h-80 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium mb-2">Connection Required</p>
          <p className="text-amber-600 text-sm mb-4">{error}</p>
          <p className="text-amber-600 text-sm">
            Please check your connection settings in{' '}
            <Link href="/settings" className="text-blue-600 underline font-medium">Settings</Link>.
          </p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Orders', value: stats?.total || 0, icon: Package, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600' },
    { label: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'from-amber-500 to-orange-500', textColor: 'text-amber-600' },
    { label: 'Being Made', value: stats?.beingMade || 0, icon: Hammer, color: 'from-yellow-500 to-amber-500', textColor: 'text-yellow-600' },
    { label: 'Digitized', value: stats?.digitized || 0, icon: Scan, color: 'from-purple-500 to-violet-500', textColor: 'text-purple-600' },
    { label: 'Done', value: stats?.done || 0, icon: CheckCircle2, color: 'from-green-500 to-emerald-500', textColor: 'text-green-600' },
    { label: 'Cancelled', value: stats?.cancelled || 0, icon: XCircle, color: 'from-red-500 to-rose-600', textColor: 'text-red-600' },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Overview of your order management
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
              Last synced: {lastSynced.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                <card.icon className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.textColor}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Monthly Sales & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4.5 h-4.5 text-green-600" />
              <h2 className="font-semibold text-slate-900">Monthly Sales</h2>
            </div>
            <span className="text-xs text-slate-400">Revenue by month</span>
          </div>
          <div className="p-4">
            {stats?.monthlySales && stats.monthlySales.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {stats.monthlySales.slice(0, 12).map((ms, idx) => (
                  <div
                    key={ms.month}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      idx === 0 ? 'bg-green-50 border border-green-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays className={`w-4 h-4 ${idx === 0 ? 'text-green-600' : 'text-slate-400'}`} />
                      <div>
                        <span className={`text-sm font-medium ${idx === 0 ? 'text-green-800' : 'text-slate-700'}`}>
                          {ms.monthLabel}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">
                          {ms.orderCount} order{ms.orderCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${idx === 0 ? 'text-green-700' : 'text-slate-700'}`}>
                      £{ms.totalSales.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                No sales data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="font-semibold text-slate-900">Recent Orders</h2>
            </div>
            <Link 
              href="/orders" 
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <Link
                  key={order.orderNumber + order.rowIndex}
                  href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        #{order.orderNumber}
                      </span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {order.customerName} · {order.orderDate}
                      </p>
                      <DispatchDateCard orderDate={order.orderDate} compact />
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatTotal(order.total)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.products.length} item{order.products.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                No orders yet
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchStats}
      />
    </div>
  );
}

