'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/ui/StatusBadge';
import { Order, OrderStatus, ORDER_STATUSES } from '@/lib/types/order';
import {
  Scan, RefreshCw, ExternalLink, CheckCircle, Eye, Package,
  AlertCircle, Loader2, Search, Filter, Shield, Sparkles
} from 'lucide-react';
import DispatchDateCard from '@/components/ui/DispatchDateCard';

export default function DigitalizationPage() {
  const { data: session } = useSession();
  const role = (session as any)?.role || (session?.user as any)?.role || 'admin';
  const isDigitizer = role === 'digitizer';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/orders?perPage=200');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleMarkDigitized = async (order: Order) => {
    if (!confirm(`Mark order #${order.orderNumber} as Digitized?\n\nThis will update Status and Processed At.`)) return;


    setActionLoading(order.orderNumber);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Digitized' }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setSuccessMsg(`Order #${order.orderNumber} marked as Digitized ✓`);
      await fetchOrders();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter orders
  let filtered = orders;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(o =>
      o.orderNumber.toLowerCase().includes(s) ||
      o.customerName.toLowerCase().includes(s)
    );
  }

  // Group counts
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const beingMadeCount = orders.filter(o => o.status === 'Being Made').length;
  const digitizedCount = orders.filter(o => o.status === 'Digitized').length;

  return (
    <div className="p-6 md:p-8 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Digitalization</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage the digitalization workflow
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-amber-600 font-medium">Pending</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{beingMadeCount}</p>
          <p className="text-xs text-yellow-600 font-medium">Being Made</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{digitizedCount}</p>
          <p className="text-xs text-purple-600 font-medium">Digitized</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
        >
          <option value="all">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm flex items-center gap-2 fade-in">
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2 fade-in">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Order #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                  {isDigitizer ? 'Order Date' : 'Customer'}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Dispatch Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Products</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Processed At</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 skeleton rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Scan className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No orders found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.orderNumber + order.rowIndex} className="table-row-hover">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-slate-900">#{order.orderNumber}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-700">
                      {isDigitizer ? (order.orderDate || '—') : (order.customerName || '—')}
                    </td>
                    <td className="px-5 py-3.5">
                      <DispatchDateCard orderDate={order.orderDate} compact />
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {order.products.length > 0 ? order.products[0].name : '—'}
                      {order.products.length > 1 && (
                        <span className="text-xs text-slate-400 ml-1">+{order.products.length - 1}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {order.status === 'Digitized' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 border border-purple-300 text-purple-800 rounded-full text-xs font-bold shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                          Digitized ✓
                        </span>
                      ) : (
                        <StatusBadge status={order.status} size="sm" />
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{order.processedAt || '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1" />
                          View
                        </Link>

                        {order.digitizedFolder && (
                          <a
                            href={order.digitizedFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 inline mr-1" />
                            Folder
                          </a>
                        )}

                        {order.status !== 'Digitized' && order.status !== 'Done' && (
                          <button
                            onClick={() => handleMarkDigitized(order)}
                            disabled={actionLoading === order.orderNumber}
                            className="px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === order.orderNumber ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Scan className="w-3.5 h-3.5" />
                            )}
                            Digitize
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
