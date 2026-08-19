'use client';

import { useState, useEffect } from 'react';
import { Invoice } from '@/lib/types/invoice';
import {
  FileText, Download, Eye, RefreshCw, AlertCircle, X, Printer
} from 'lucide-react';
import { generateInvoicePdf } from '@/lib/utils/invoicePdf';

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

  const handleDownloadPdf = (invoice: Invoice) => {
    // Map invoice to order shape for landscape export
    const fakeOrder: any = {
      orderNumber: invoice.orderNumber,
      orderDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      shippingAddress: invoice.shippingAddress,
      total: invoice.total,
      products: invoice.items.map((item, idx) => ({
        index: idx + 1,
        name: item.product,
        productCode: item.productCode || '',
        qty: item.qty || '1',
        size: item.size || '',
        colour: item.colour || '',
        emb: item.emb || 'LB / B',
      })),
    };

    generateInvoicePdf(fakeOrder, {
      profession: '-',
      source: 'Theworkwear Website',
      logoDetails: '',
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Generated invoices and landscape order detail exports
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
                      {invoice.total ? `£${invoice.total}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 flex items-center gap-2">
                      <button
                        onClick={() => setPreviewInvoice(invoice)}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>

                      <button
                        onClick={() => handleDownloadPdf(invoice)}
                        className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Landscape Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setPreviewInvoice(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in" onClick={(e) => e.stopPropagation()}>
            {/* Modal Top Bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="font-semibold text-sm">Landscape Order Detail Sheet — #{previewInvoice.orderNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print (Landscape)
                </button>
                <button
                  onClick={() => handleDownloadPdf(previewInvoice)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button onClick={() => setPreviewInvoice(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview Content */}
            <div className="p-6 bg-slate-100 overflow-auto flex justify-center print:p-0 print:bg-white">
              <div id="order-landscape-print-area" className="w-full max-w-[950px] bg-white text-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 text-xs space-y-3 print:border-none print:shadow-none">
                <h1 className="text-xl font-semibold text-slate-700 pb-0.5">Order Detail</h1>

                {/* Metadata Grid */}
                <div className="border border-slate-200 rounded-xs overflow-hidden text-[11px]">
                  <div className="grid grid-cols-12 border-b border-slate-200">
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Date order taken:</div>
                    <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium border-r border-slate-200">{previewInvoice.invoiceDate}</div>
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Contact Name:</div>
                    <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium">{previewInvoice.customerName}</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-slate-200">
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Dispatch Date</div>
                    <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium border-r border-slate-200">—</div>
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Reference Number</div>
                    <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium">{previewInvoice.orderNumber}</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-slate-200">
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Contact Number:</div>
                    <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium border-r border-slate-200">{previewInvoice.customerPhone || '—'}</div>
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Email:</div>
                    <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium truncate">{previewInvoice.customerEmail || '—'}</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-slate-200">
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Delivery Address:</div>
                    <div className="col-span-10 px-3 py-1.5 text-slate-900 font-medium">{previewInvoice.shippingAddress || '—'}</div>
                  </div>

                  <div className="grid grid-cols-12 border-b border-slate-200">
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200">Profession:</div>
                    <div className="col-span-10 px-3 py-1.5 text-slate-900 font-medium">-</div>
                  </div>

                  <div className="grid grid-cols-12">
                    <div className="col-span-2 px-3 py-1.5 text-slate-500 border-r border-slate-200 flex items-center">Source:</div>
                    <div className="col-span-10 px-3 py-1.5">
                      <span className="inline-block border border-slate-300 rounded px-2 py-0.5 text-slate-800 text-[11px]">Theworkwear Website</span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="border border-slate-200 rounded-xs overflow-hidden text-[11px] mt-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-normal bg-white">
                        <th className="px-3 py-2 font-normal">Product</th>
                        <th className="px-3 py-2 font-normal">Product Code</th>
                        <th className="px-3 py-2 font-normal">QTY</th>
                        <th className="px-3 py-2 font-normal">Size</th>
                        <th className="px-3 py-2 font-normal">Colour</th>
                        <th className="px-3 py-2 font-normal">EMB(F/B)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900 font-medium">
                      {previewInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-slate-800">{item.product}</td>
                          <td className="px-3 py-2 text-slate-700">{item.productCode || '—'}</td>
                          <td className="px-3 py-2 text-slate-900">{item.qty || '1'}</td>
                          <td className="px-3 py-2 text-slate-700">{item.size || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{item.colour || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{item.emb || 'LB / B'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pictures of Logo (All on Left Side) */}
                <div className="pt-2">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] mb-1">PICTURE OF LOGO</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-slate-200 rounded bg-slate-50 flex items-center justify-center text-slate-300">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Logo Details */}
                <div className="pt-2">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] mb-1">LOGO DETAILS</p>
                  <div className="border border-slate-200 rounded-sm px-3 py-2 text-slate-800 text-xs min-h-[30px]">
                    {/* Empty */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
