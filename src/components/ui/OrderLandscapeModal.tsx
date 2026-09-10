'use client';

import { useRef } from 'react';
import { Order } from '@/lib/types/order';
import { calculateDispatchDate, parseOrderDate } from '@/lib/utils/dispatchCalculator';
import { generateInvoicePdf } from '@/lib/utils/invoicePdf';
import { Download, Printer, X, FileText, Image as ImageIcon } from 'lucide-react';

interface OrderLandscapeModalProps {
  order: Order;
  driveImages?: any[];
  digitizedFiles?: any[];
  isOpen: boolean;
  onClose: () => void;
}

function formatToDDMMYYYY(date: Date | null, fallbackStr: string): string {
  if (!date) {
    if (fallbackStr && fallbackStr.includes('/')) return fallbackStr;
    const parsed = parseOrderDate(fallbackStr);
    if (parsed) {
      const d = String(parsed.getDate()).padStart(2, '0');
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const y = parsed.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return fallbackStr || '—';
  }
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function OrderLandscapeModal({
  order,
  driveImages = [],
  digitizedFiles = [],
  isOpen,
  onClose,
}: OrderLandscapeModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const dispatchInfo = calculateDispatchDate(order.orderDate, 10);
  const orderDateFormatted = formatToDDMMYYYY(dispatchInfo.orderDate, order.orderDate);
  const dispatchDateFormatted = formatToDDMMYYYY(dispatchInfo.dispatchDate, dispatchInfo.formattedDispatchDate);

  const handlePrint = () => {
    window.print();
  };

  const imageItems = driveImages.filter(
    img => !img.mimeType || img.mimeType.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(img.name || '')
  );

  const handleDownloadPdf = async () => {
    const logoImagesBase64: string[] = [];

    // Convert all artwork images to Base64 for the PDF
    for (const img of imageItems) {
      if (img.thumbnailUrl) {
        try {
          const res = await fetch(img.thumbnailUrl);
          if (res.ok) {
            const blob = await res.blob();
            const b64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            if (b64) logoImagesBase64.push(b64);
          }
        } catch (err) {
          console.warn(`Could not load logo ${img.name} for PDF export:`, err);
        }
      }
    }

    generateInvoicePdf(order, {
      profession: '-',
      source: 'Theworkwear Website',
      logoDetails: order.logoDetails || '',
      logoImagesBase64,
    });
  };

  // Products
  const products = (order.products && order.products.length > 0)
    ? order.products
    : [
        { index: 1, name: 'Polos', productCode: 'UC101', qty: '4', size: 'L', colour: 'Black', emb: 'LB / B' },
        { index: 2, name: 'Hoodies', productCode: 'UX4', qty: '1', size: 'L', colour: 'Black', emb: 'LB / B' },
        { index: 3, name: 'Jackets', productCode: 'TRA628', qty: '1', size: 'L', colour: 'Black', emb: 'LB / B' },
      ];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="no-print px-6 py-4 bg-slate-900 text-white flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-semibold text-sm">Landscape Order Detail Sheet</h2>
              <p className="text-xs text-slate-400">Exact layout format for Order #{order.orderNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              Print (Landscape)
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="p-4 sm:p-8 overflow-auto bg-slate-100/70 flex justify-center print:p-0 print:bg-white">
          {/* Printable A4 Landscape Sheet */}
          <div
            ref={printAreaRef}
            id="order-landscape-print-area"
            className="w-full max-w-[1000px] bg-white text-slate-900 p-8 rounded-xl shadow-md print:shadow-none print:p-4 print:rounded-none border border-slate-200 font-sans text-xs space-y-3"
            style={{ minHeight: '600px' }}
          >
            {/* Title */}
            <h1 className="text-xl font-semibold text-slate-700 tracking-tight pb-0.5">
              Order Detail
            </h1>

            {/* Metadata Grid Table */}
            <div className="border border-slate-200 rounded-xs overflow-hidden text-[11px]">
              <div className="grid grid-cols-12 border-b border-slate-200">
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Date order taken:
                </div>
                <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium border-r border-slate-200">
                  {orderDateFormatted}
                </div>
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Contact Name:
                </div>
                <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium">
                  {order.customerName || '—'}
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-200">
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Dispatch Date
                </div>
                <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium border-r border-slate-200">
                  {dispatchDateFormatted}
                </div>
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Reference Number
                </div>
                <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium">
                  {order.orderNumber || '—'}
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-200">
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Contact Number:
                </div>
                <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium border-r border-slate-200">
                  {order.customerPhone || '—'}
                </div>
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Email:
                </div>
                <div className="col-span-4 px-3 py-1.5 text-slate-900 font-medium truncate">
                  {order.customerEmail || '—'}
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-200">
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Delivery Address:
                </div>
                <div className="col-span-10 px-3 py-1.5 text-slate-900 font-medium">
                  {order.shippingAddress || '—'}
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-200">
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200">
                  Profession:
                </div>
                <div className="col-span-10 px-3 py-1.5 text-slate-900 font-medium">
                  -
                </div>
              </div>

              <div className="grid grid-cols-12">
                <div className="col-span-2 px-3 py-1.5 text-slate-500 font-normal border-r border-slate-200 flex items-center">
                  Source:
                </div>
                <div className="col-span-10 px-3 py-1.5">
                  <span className="inline-block border border-slate-300 rounded px-2 py-0.5 text-slate-800 text-[11px]">
                    Theworkwear Website
                  </span>
                </div>
              </div>
            </div>

            {/* Products Table */}
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
                  {products.map((p, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-slate-800">{p.name || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{p.productCode || '—'}</td>
                      <td className="px-3 py-2 text-slate-900">{p.qty || '1'}</td>
                      <td className="px-3 py-2 text-slate-700">{p.size || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{p.colour || '—'}</td>
                      <td className="px-3 py-2 text-slate-700">{p.emb || 'LB / B'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Picture of Logo Section (All Logos on Left Side) */}
            <div className="pt-2">
              <p className="text-slate-400 font-normal uppercase tracking-wider text-[10px] mb-1.5">
                PICTURE OF LOGO
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {imageItems.length > 0 ? (
                  imageItems.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="w-14 h-14 border border-slate-200 rounded p-1 bg-slate-50 flex items-center justify-center overflow-hidden"
                      title={img.name}
                    >
                      <img
                        src={img.thumbnailUrl}
                        alt={img.name || `Logo ${idx + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-14 h-14 border border-slate-200 rounded p-1 bg-slate-50 flex items-center justify-center text-slate-300">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
            </div>

            {/* Logo Details Box */}
            <div className="pt-3">
              <p className="text-slate-400 font-normal uppercase tracking-wider text-[10px] mb-1.5">
                LOGO DETAILS
              </p>
              <div className="border border-slate-200 rounded-sm px-3 py-2 text-slate-800 text-xs min-h-[36px] whitespace-pre-wrap bg-white">
                {order.logoDetails ? (
                  order.logoDetails
                ) : (
                  <span className="text-slate-300 italic">No logo details specified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
