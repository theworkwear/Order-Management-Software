'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { OrderStatus, ORDER_STATUSES, Order } from '@/lib/types/order';
import {
  Search, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Package, ArrowUpDown, X, RefreshCw, Loader2, CheckCircle, AlertCircle, Plus, Trash2
} from 'lucide-react';
import CreateOrderModal from '@/components/ui/CreateOrderModal';
import DispatchDateCard from '@/components/ui/DispatchDateCard';


export default function OrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session as any)?.role || (session?.user as any)?.role || 'admin';
  const isDigitizer = role === 'digitizer';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusUpdatingRow, setStatusUpdatingRow] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const perPage = 20;

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: page.toString(),
        perPage: perPage.toString(),
      });

      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch orders');
      }
      const data = await res.json();
      setOrders(data.orders);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    const timeout = setTimeout(fetchOrders, 300); // Debounce search
    return () => clearTimeout(timeout);
  }, [fetchOrders]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleStatusChange = async (order: Order, newStatus: OrderStatus, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation(); // Prevent row navigation click
    if (newStatus === order.status) return;

    setStatusUpdatingRow(order.orderNumber);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }

      // Optimistically update local state
      setOrders(prev =>
        prev.map(o => o.orderNumber === order.orderNumber ? { ...o, status: newStatus } : o)
      );
      setSuccessMsg(`Order #${order.orderNumber} status updated to "${newStatus}" ✓`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStatusUpdatingRow(null);
    }
  };

  const handleRowClick = (orderNumber: string) => {
    router.push(`/orders/${encodeURIComponent(orderNumber)}`);
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setDeleting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderToDelete.orderNumber)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete order');
      }
      setOrders(prev => prev.filter(o => o.orderNumber !== orderToDelete.orderNumber));
      setTotalCount(prev => Math.max(0, prev - 1));
      setSuccessMsg(`Order #${orderToDelete.orderNumber} deleted successfully ✓`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setOrderToDelete(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatTotal = (totalStr: string) => {
    if (!totalStr) return '—';
    const trimmed = totalStr.trim();
    if (trimmed.startsWith('£') || trimmed.startsWith('$') || trimmed.startsWith('€')) {
      return trimmed;
    }
    return `£${trimmed}`;
  };


  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  return (
    <div className="p-4 md:p-8 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} total order{totalCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
          <button
            onClick={() => { setPage(1); fetchOrders(); }}
            className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>


      {/* Messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm flex items-center gap-2 fade-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2 fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders, customers, products..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            >
              <option value="all">All Statuses</option>
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Orders Card View (Visible on < md) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
              <div className="h-5 w-32 skeleton rounded" />
              <div className="h-4 w-48 skeleton rounded" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-500 font-medium text-sm">No orders found</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.orderNumber + order.rowIndex}
              onClick={() => handleRowClick(order.orderNumber)}
              className="bg-white rounded-xl border border-slate-100 shadow-xs p-4 space-y-3 cursor-pointer hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">#{order.orderNumber}</span>
                <span className="text-sm font-bold text-slate-900">{formatTotal(order.total)}</span>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800">{order.customerName}</p>
                {order.customerEmail && <p className="text-xs text-slate-400">{order.customerEmail}</p>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-500">{order.orderDate || '—'}</span>
                  <DispatchDateCard orderDate={order.orderDate} compact />
                </div>
              </div>

              {order.products.length > 0 && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                  {order.products[0].name}
                  {order.products.length > 1 && <span className="text-slate-400 font-medium"> (+{order.products.length - 1} more)</span>}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-50 gap-2" onClick={(e) => e.stopPropagation()}>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus, e)}
                  disabled={statusUpdatingRow === order.orderNumber}
                  className={`pl-3 pr-7 py-1 rounded-full text-xs font-semibold border ${
                    order.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    order.status === 'Being Made' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    order.status === 'Digitized' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-green-50 text-green-700 border-green-200'
                  }`}
                >
                  {ORDER_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </Link>
                  {!isDigitizer && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {[
                  { key: 'orderNumber', label: 'Order #' },
                  { key: 'orderDate', label: 'Date' },
                  { key: '', label: 'Dispatch Date' },
                  { key: 'customerName', label: 'Customer' },
                  { key: '', label: 'Products' },
                  { key: 'total', label: 'Total' },
                  { key: 'status', label: 'Status' },
                  { key: '', label: 'Action' },
                ].map((col) => (
                  <th
                    key={col.label}
                    className={`px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                      col.key ? 'cursor-pointer hover:text-slate-700 select-none' : ''
                    }`}
                    onClick={() => col.key && handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1.5">
                      {col.label}
                      {col.key && <SortIcon column={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No orders found</p>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.orderNumber + order.rowIndex}
                    onClick={() => handleRowClick(order.orderNumber)}
                    className="table-row-hover cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        #{order.orderNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">{order.orderDate || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <DispatchDateCard orderDate={order.orderDate} compact />
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-sm font-medium text-slate-800">{order.customerName || '—'}</span>
                        {order.customerEmail && (
                          <p className="text-xs text-slate-400 mt-0.5">{order.customerEmail}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>
                        <span className="text-sm text-slate-600">
                          {order.products.length > 0 ? order.products[0].name : '—'}
                        </span>
                        {order.products.length > 1 && (
                          <span className="text-xs text-slate-400 ml-1">
                            +{order.products.length - 1} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatTotal(order.total)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      {/* Inline Status Dropdown */}
                      <div className="relative inline-block">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus, e)}
                          disabled={statusUpdatingRow === order.orderNumber}
                          className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            order.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' :
                            order.status === 'Being Made' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                            order.status === 'Digitized' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' :
                            order.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                            'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          }`}
                        >
                          {ORDER_STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {statusUpdatingRow === order.orderNumber && (
                          <Loader2 className="w-3 h-3 text-blue-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/orders/${encodeURIComponent(order.orderNumber)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        {!isDigitizer && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToDelete(order);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Delete</span>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalCount)} of {totalCount}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (page > 3) pageNum = page - 2 + i;
                  if (page > totalPages - 2) pageNum = totalPages - 4 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchOrders}
      />

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Delete Order #{orderToDelete.orderNumber}?</h3>
              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to permanently delete this order for{' '}
                <span className="font-semibold text-slate-700">{orderToDelete.customerName || 'Customer'}</span>? This will remove the row from Google Sheets and cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

