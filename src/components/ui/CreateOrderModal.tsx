'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, User, MapPin, Link2, DollarSign, Loader2, CheckCircle } from 'lucide-react';
import { OrderStatus, ORDER_STATUSES } from '@/lib/types/order';
import ProductSelect from '@/components/ui/ProductSelect';
import { addActivityLog } from '@/lib/store/activityLog';


interface ProductInput {
  name: string;
  productCode: string;
  qty: string;
  size: string;
  colour: string;
  emb: string;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Default initial state
  const generateRandomOrderNo = () => `TWW-${Math.floor(1000 + Math.random() * 9000)}`;

  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [status, setStatus] = useState<OrderStatus>('Pending');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [total, setTotal] = useState('');
  const [orderFolder, setOrderFolder] = useState('');
  const [logoDetails, setLogoDetails] = useState('');
  const [orderEmail, setOrderEmail] = useState('');

  const [products, setProducts] = useState<ProductInput[]>([
    { name: '', productCode: '', qty: '1', size: '', colour: '', emb: '' },
  ]);

  useEffect(() => {
    if (isOpen) {
      setOrderNumber(generateRandomOrderNo());
      setOrderDate(new Date().toISOString().split('T')[0]);
      setStatus('Pending');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setShippingAddress('');
      setTotal('');
      setOrderFolder('');
      setLogoDetails('');
      setOrderEmail('');
      setProducts([{ name: '', productCode: '', qty: '1', size: '', colour: '', emb: '' }]);
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddProduct = () => {
    if (products.length >= 10) {
      setError('Maximum 10 products permitted per order in spreadsheet.');
      return;
    }
    setProducts([...products, { name: '', productCode: '', qty: '1', size: '', colour: '', emb: '' }]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length === 1) {
      setProducts([{ name: '', productCode: '', qty: '1', size: '', colour: '', emb: '' }]);
      return;
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof ProductInput, value: string) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Order Number is required');
      return;
    }
    if (!customerName.trim()) {
      setError('Customer Name is required');
      return;
    }

    // Filter out completely empty products
    const validProducts = products.filter(p => p.name.trim() !== '');

    try {
      setLoading(true);
      setError('');

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          orderDate,
          status,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          total,
          orderFolder,
          logoDetails,
          orderEmail,
          products: validProducts,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create order');
      }

      addActivityLog({
        orderNumber,
        action: 'Manual Order Created',
        details: `Created order #${orderNumber} for ${customerName} with ${validProducts.length} item(s)`,
        type: 'created',
      });

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 overflow-y-auto fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">Create Manual Order</h2>
              <p className="text-xs text-slate-500">Enter order details to add to the system</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3.5 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Order #{orderNumber} successfully created!
            </div>
          )}


          {/* Section 1: Order Meta */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-500" /> Order Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order # *</label>
                <input
                  type="text"
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. TWW-1001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Meta */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" /> Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+44 7123 456789"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Address</label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="123 Commercial Rd, London, UK"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (£)</label>

                <input
                  type="text"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder="£150.00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Folders & Links */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-500" /> Google Drive & Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Order Folder URL</label>
                <input
                  type="url"
                  value={orderFolder}
                  onChange={(e) => setOrderFolder(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Logo Details</label>
                <input
                  type="text"
                  value={logoDetails}
                  onChange={(e) => setLogoDetails(e.target.value)}
                  placeholder="e.g. Left breast embroidery..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic Products */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-500" /> Order Products ({products.length})
              </h3>
              <button
                type="button"
                onClick={handleAddProduct}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="space-y-3">
              {products.map((product, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Item #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(idx)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                      title="Remove Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <ProductSelect
                    name={product.name}
                    code={product.productCode}
                    onNameChange={(newName) => handleProductChange(idx, 'name', newName)}
                    onCodeChange={(newCode) => handleProductChange(idx, 'productCode', newCode)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Quantity</label>
                      <input
                        type="text"
                        placeholder="Qty"
                        value={product.qty}
                        onChange={(e) => handleProductChange(idx, 'qty', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Size</label>
                      <input
                        type="text"
                        placeholder="Size (e.g. L, XL)"
                        value={product.size}
                        onChange={(e) => handleProductChange(idx, 'size', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Colour / EMB</label>
                      <input
                        type="text"
                        placeholder="Colour / EMB"
                        value={product.colour}
                        onChange={(e) => handleProductChange(idx, 'colour', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving Order...' : 'Create & Save Order'}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}
