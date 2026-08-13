'use client';

import { useState } from 'react';
import { Mail, Maximize2, X } from 'lucide-react';

interface OrderEmailViewerProps {
  orderNumber: string;
  orderEmailText?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface ParsedItem {
  title: string;
  details: string[];
  quantity?: string;
  price?: string;
}

export interface ParsedWooCommerceEmail {
  brandHeader?: string;
  newOrderHeading?: string;
  receivedFrom?: string;
  orderSummaryLine?: string;
  items: ParsedItem[];
  financials: {
    subtotal?: string;
    discount?: string;
    shipping?: string;
    total?: string;
    paymentMethod?: string;
  };
  billingAddress: {
    name?: string;
    lines: string[];
    phone?: string;
    email?: string;
  };
  shippingAddress: {
    name?: string;
    lines: string[];
    phone?: string;
  };
}

export function parseWooCommerceEmail(rawText: string): ParsedWooCommerceEmail {
  if (!rawText) {
    return {
      items: [],
      financials: {},
      billingAddress: { lines: [] },
      shippingAddress: { lines: [] },
    };
  }

  const chunks = rawText
    .split(/[\n|]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  let brandHeader = '';
  let newOrderHeading = '';
  let receivedFrom = '';
  let orderSummaryLine = '';

  const items: ParsedItem[] = [];
  const financials: ParsedWooCommerceEmail['financials'] = {};

  const billingAddress: ParsedWooCommerceEmail['billingAddress'] = { lines: [] };
  const shippingAddress: ParsedWooCommerceEmail['shippingAddress'] = { lines: [] };

  let currentSection: 'header' | 'items' | 'financials' | 'billing' | 'shipping' = 'header';
  let currentItem: ParsedItem | null = null;

  chunks.forEach((chunk) => {
    // Skip promotional / URL noise
    if (
      chunk.startsWith('<http') ||
      chunk.startsWith('[image:') ||
      chunk.startsWith('----------------') ||
      chunk.includes('Congratulations on the sale') ||
      chunk.includes('Process your orders on the go') ||
      chunk.includes('Product Quantity Price') ||
      chunk === '.'
    ) {
      return;
    }

    // Section Markers
    const lower = chunk.toLowerCase();

    if (lower.includes('*billing address*') || lower === 'billing address') {
      if (currentItem) {
        items.push(currentItem);
        currentItem = null;
      }
      currentSection = 'billing';
      const cleanName = chunk.replace(/^\*billing address\*\s*/i, '').replace(/^billing address\s*/i, '').trim();
      if (cleanName) billingAddress.name = cleanName;
      return;
    }

    if (lower.includes('*shipping address*') || lower === 'shipping address') {
      if (currentItem) {
        items.push(currentItem);
        currentItem = null;
      }
      currentSection = 'shipping';
      const cleanName = chunk.replace(/^\*shipping address\*\s*/i, '').replace(/^shipping address\s*/i, '').trim();
      if (cleanName) shippingAddress.name = cleanName;
      return;
    }

    if (lower.startsWith('subtotal:')) {
      if (currentItem) {
        items.push(currentItem);
        currentItem = null;
      }
      currentSection = 'financials';
      financials.subtotal = chunk.replace(/^subtotal:\s*/i, '').trim();
      return;
    }

    if (lower.startsWith('discount:')) {
      financials.discount = chunk.replace(/^discount:\s*/i, '').trim();
      return;
    }

    if (lower.startsWith('shipping:')) {
      let shipVal = chunk.replace(/^shipping:\s*/i, '').trim();
      if (shipVal.toLowerCase().includes('free shipping')) shipVal = 'Free shipping';
      financials.shipping = shipVal;
      return;
    }

    if (lower.startsWith('total:')) {
      financials.total = chunk.replace(/^total:\s*/i, '').trim();
      return;
    }

    if (lower.startsWith('payment method:')) {
      financials.paymentMethod = chunk.replace(/^payment method:\s*/i, '').trim();
      return;
    }

    // Billing Address lines
    if (currentSection === 'billing') {
      if (chunk.includes('@')) {
        billingAddress.email = chunk;
      } else if (/^\+?\d[\d\s-]{8,}\d$/.test(chunk)) {
        billingAddress.phone = chunk;
      } else {
        if (!billingAddress.name && billingAddress.lines.length === 0 && !chunk.includes(' ')) {
          billingAddress.name = chunk;
        } else {
          billingAddress.lines.push(chunk);
        }
      }
      return;
    }

    // Shipping Address lines
    if (currentSection === 'shipping') {
      if (/^\+?\d[\d\s-]{8,}\d$/.test(chunk)) {
        shippingAddress.phone = chunk;
      } else {
        if (!shippingAddress.name && shippingAddress.lines.length === 0 && !chunk.includes(' ')) {
          shippingAddress.name = chunk;
        } else {
          shippingAddress.lines.push(chunk);
        }
      }
      return;
    }

    // Header Lines
    if (lower.includes('workwear') && lower.includes('embroidery') && !brandHeader) {
      brandHeader = chunk;
      return;
    }

    if (lower.startsWith('new order:') && !newOrderHeading) {
      newOrderHeading = chunk;
      return;
    }

    if (lower.includes('received a new order from') && !receivedFrom) {
      receivedFrom = chunk;
      return;
    }

    if ((lower.startsWith('order #') || lower.startsWith('order#')) && lower.includes('(') && !orderSummaryLine) {
      orderSummaryLine = chunk;
      return;
    }

    // Product items parsing
    if (
      chunk.includes('Bundle') ||
      chunk.includes('T-Shirts') ||
      chunk.includes('Polo Shirts') ||
      chunk.includes('Workwear') ||
      chunk.includes('Hoodie')
    ) {
      if (currentItem) {
        items.push(currentItem);
      }
      const cleanTitle = chunk.replace(/^\[image:[^\]]+\]\s*/, '').trim();
      currentItem = { title: cleanTitle, details: [] };
      return;
    }

    // Price / Quantity line (e.g. "×1 £119.99" or "x1 £125.99")
    if (currentItem && (chunk.match(/[x×]\d+/i) || chunk.includes('£') || chunk.includes('$'))) {
      const qtyMatch = chunk.match(/([x×]\d+)/i);
      const priceMatch = chunk.match(/([£$]\d+(?:\.\d{2})?)/);

      if (qtyMatch) currentItem.quantity = qtyMatch[1];
      if (priceMatch) currentItem.price = priceMatch[1];

      if (!qtyMatch && !priceMatch) {
        currentItem.details.push(chunk);
      }
      return;
    }

    // Item sub-specs
    if (currentItem) {
      currentItem.details.push(chunk);
    }
  });

  if (currentItem) {
    items.push(currentItem);
  }

  return {
    brandHeader,
    newOrderHeading,
    receivedFrom,
    orderSummaryLine,
    items,
    financials,
    billingAddress,
    shippingAddress,
  };
}

export default function OrderEmailViewer({
  orderNumber,
  orderEmailText = '',
  customerName = '',
}: OrderEmailViewerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const parsed = parseWooCommerceEmail(orderEmailText);

  const renderCleanWooCommerceEmail = () => (
    <div className="bg-white text-slate-800 font-sans p-4 space-y-4 text-xs leading-relaxed border border-slate-100 rounded-xl shadow-2xs">
      {/* Brand Header */}
      <div className="space-y-1">
        <p className="text-purple-600 font-medium text-[11px]">
          {parsed.brandHeader || 'Workwear – Personalised Workwear – Workwear Bundles with Embroidery'}
        </p>
        <h2 className="text-slate-900 font-extrabold text-xl tracking-tight">
          {parsed.newOrderHeading || `New order: #${orderNumber}`}
        </h2>
        <p className="text-slate-600 text-xs mt-1">
          {parsed.receivedFrom || `You’ve received a new order from ${customerName || 'Customer'}:`}
        </p>
      </div>

      {/* Order Summary Heading */}
      <div className="pt-2 border-t border-slate-100 space-y-0.5">
        <h3 className="font-bold text-slate-900 text-sm">Order summary</h3>
        <p className="text-purple-600 text-xs font-medium">
          {parsed.orderSummaryLine || `Order #${orderNumber}`}
        </p>
      </div>

      {/* Product Table */}
      <div className="space-y-3">
        <div className="grid grid-cols-12 font-bold text-slate-700 pb-1.5 border-b border-slate-200 text-[11px]">
          <div className="col-span-8">Product</div>
          <div className="col-span-2 text-right">Quantity</div>
          <div className="col-span-2 text-right">Price</div>
        </div>

        {parsed.items.length > 0 ? (
          parsed.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 pb-3 border-b border-slate-100">
              <div className="col-span-8 space-y-0.5">
                <p className="font-semibold text-slate-900 text-xs leading-snug">
                  {item.title}
                </p>
                {item.details.map((detail, dIdx) => (
                  <p key={dIdx} className="text-slate-500 text-[11px] leading-tight">
                    {detail}
                  </p>
                ))}
              </div>
              <div className="col-span-2 text-right text-slate-700 font-medium text-xs">
                {item.quantity || 'x1'}
              </div>
              <div className="col-span-2 text-right text-slate-900 font-semibold text-xs">
                {item.price || '—'}
              </div>
            </div>
          ))
        ) : (
          <div className="text-slate-500 py-2">No product items parsed</div>
        )}
      </div>

      {/* Financial Summary */}
      {(parsed.financials.subtotal || parsed.financials.total) && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
          {parsed.financials.subtotal && (
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{parsed.financials.subtotal}</span>
            </div>
          )}

          {parsed.financials.discount && (
            <div className="flex justify-between text-slate-600">
              <span>Discount:</span>
              <span className="font-medium text-slate-800">{parsed.financials.discount}</span>
            </div>
          )}

          {parsed.financials.shipping && (
            <div className="flex justify-between text-slate-600">
              <span>Shipping:</span>
              <span className="font-medium text-slate-800">{parsed.financials.shipping}</span>
            </div>
          )}

          {parsed.financials.total && (
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
              <span>Total:</span>
              <span>{parsed.financials.total}</span>
            </div>
          )}

          {parsed.financials.paymentMethod && (
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Payment method:</span>
              <span className="font-medium text-slate-800">{parsed.financials.paymentMethod}</span>
            </div>
          )}
        </div>
      )}

      {/* Side-by-Side Billing & Shipping Addresses */}
      {(parsed.billingAddress.lines.length > 0 || parsed.shippingAddress.lines.length > 0) && (
        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Billing address */}
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900">
              Billing address <span className="font-normal text-slate-700">{parsed.billingAddress.name}</span>
            </p>
            {parsed.billingAddress.lines.map((l, i) => (
              <p key={i} className="text-slate-600">{l}</p>
            ))}
            {parsed.billingAddress.phone && (
              <p className="text-purple-600 underline pt-0.5">{parsed.billingAddress.phone}</p>
            )}
            {parsed.billingAddress.email && (
              <p className="text-purple-600 underline truncate">{parsed.billingAddress.email}</p>
            )}
          </div>

          {/* Shipping address */}
          <div className="space-y-0.5">
            <p className="font-bold text-slate-900">
              Shipping address <span className="font-normal text-slate-700">{parsed.shippingAddress.name}</span>
            </p>
            {parsed.shippingAddress.lines.map((l, i) => (
              <p key={i} className="text-slate-600">{l}</p>
            ))}
            {parsed.shippingAddress.phone && (
              <p className="text-purple-600 underline pt-0.5">{parsed.shippingAddress.phone}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Right-Sidebar Container Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden fade-in">
        {/* Header with ONLY Full Screen button */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Original Order Email
            </h3>
          </div>

          {/* Full Screen (↗) button ONLY */}
          {orderEmailText && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              title="Open full screen email viewer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Canvas Box */}
        <div className="p-3 max-h-[480px] overflow-y-auto custom-scrollbar">
          {orderEmailText ? (
            renderCleanWooCommerceEmail()
          ) : (
            <div className="py-6 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
              <Mail className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-600">No original order email attached</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Paste email text in Column K ("Order Email") of your Sheet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Modal Reader */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Original Order Confirmation Email — Order #{orderNumber}
                </h3>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto bg-slate-100">
              {renderCleanWooCommerceEmail()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
