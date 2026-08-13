'use client';

import { useState, useEffect } from 'react';
import { Invoice } from '@/lib/types/invoice';
import {
  FileText, Download, Eye, RefreshCw, AlertCircle
} from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Generated invoices from orders
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Invoice #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Order #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 skeleton rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No invoices yet</p>
                    <p className="text-slate-400 text-sm mt-1">Generate invoices from order details pages</p>
                  </td>
                </tr>
              ) : (
                invoices.map(invoice => (
                  <tr key={invoice.id} className="table-row-hover">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-blue-700">{invoice.invoiceNumber}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-800">#{invoice.orderNumber}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{invoice.customerName}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{invoice.invoiceDate}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">
                      {invoice.total ? `$${invoice.total}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setPreviewInvoice(invoice)}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreviewInvoice(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Invoice Header */}
            <div className="px-8 pt-8 pb-6 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">INVOICE</h2>
                  <p className="text-blue-600 font-semibold mt-1">{previewInvoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="text-sm font-medium text-slate-800">{previewInvoice.invoiceDate}</p>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="px-8 py-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Bill To</p>
                <p className="text-sm font-semibold text-slate-800">{previewInvoice.customerName}</p>
                {previewInvoice.customerEmail && <p className="text-sm text-slate-500">{previewInvoice.customerEmail}</p>}
                {previewInvoice.customerPhone && <p className="text-sm text-slate-500">{previewInvoice.customerPhone}</p>}
                {previewInvoice.shippingAddress && <p className="text-sm text-slate-500">{previewInvoice.shippingAddress}</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Order</p>
                <p className="text-sm text-slate-800">Order #{previewInvoice.orderNumber}</p>
              </div>
            </div>

            {/* Items */}
            <div className="px-8 pb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500">Product</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500">Code</th>
                    <th className="pb-2 text-center text-xs font-semibold text-slate-500">QTY</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500">Size</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500">Colour</th>
                  </tr>
                </thead>
                <tbody>
                  {previewInvoice.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2.5 text-sm text-slate-800">{item.product}</td>
                      <td className="py-2.5 text-sm text-slate-500 font-mono">{item.productCode || '—'}</td>
                      <td className="py-2.5 text-sm text-center font-medium text-slate-800">{item.qty || '—'}</td>
                      <td className="py-2.5 text-sm text-slate-500">{item.size || '—'}</td>
                      <td className="py-2.5 text-sm text-slate-500">{item.colour || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase">Total</p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${previewInvoice.total || '0.00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">Thank you for your business!</p>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="btn-secondary px-4 py-2 rounded-xl text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
