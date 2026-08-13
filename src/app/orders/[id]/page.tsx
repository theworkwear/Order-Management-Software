'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import StatusBadge from '@/components/ui/StatusBadge';
import OrderEmailViewer from '@/components/ui/OrderEmailViewer';
import { Order, OrderStatus, ORDER_STATUSES } from '@/lib/types/order';
import { generateInvoicePdf } from '@/lib/utils/invoicePdf';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Package, Hash, Save,
  ExternalLink, FolderOpen, Scan, FileText, CheckCircle,
  AlertCircle, Loader2, ChevronDown, Download, Image, Upload, FileUp, Shield, Plus, Trash2
} from 'lucide-react';
import ProductSelect from '@/components/ui/ProductSelect';
import OrderActivityTimeline from '@/components/ui/OrderActivityTimeline';
import DispatchDateCard from '@/components/ui/DispatchDateCard';
import { calculateDispatchDate } from '@/lib/utils/dispatchCalculator';
import { addActivityLog } from '@/lib/store/activityLog';



export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = decodeURIComponent(params.id as string);

  const { data: session } = useSession();
  const role = (session as any)?.role || (session?.user as any)?.role || 'admin';
  const isDigitizer = role === 'digitizer';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [driveImages, setDriveImages] = useState<any[]>([]);
  const [digitizedDriveFiles, setDigitizedDriveFiles] = useState<any[]>([]);
  const [detectedDigitizedFolderUrl, setDetectedDigitizedFolderUrl] = useState<string | null>(null);
  const [activeDriveTab, setActiveDriveTab] = useState<'artwork' | 'digitized'>('artwork');
  const [driveImagesLoading, setDriveImagesLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  // Editable fields
  const [editFields, setEditFields] = useState({
    orderNumber: '',
    orderDate: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    total: '',
    orderFolder: '',
    digitizedFolder: '',
  });

  const [editProducts, setEditProducts] = useState<{
    index: number;
    name: string;
    productCode: string;
    qty: string;
    size: string;
    colour: string;
    emb: string;
  }[]>([]);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Fetch Drive images when order loads and has a folder URL
  useEffect(() => {
    if (order?.orderFolder) {
      fetchDriveImages(order.orderFolder);
    }
  }, [order?.orderFolder]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch order');
      }
      const data = await res.json();
      setOrder(data.order);
      setEditFields({
        orderNumber: data.order.orderNumber || '',
        orderDate: data.order.orderDate || '',
        customerName: data.order.customerName || '',
        customerEmail: data.order.customerEmail || '',
        customerPhone: data.order.customerPhone || '',
        shippingAddress: data.order.shippingAddress || '',
        total: data.order.total || '',
        orderFolder: data.order.orderFolder || '',
        digitizedFolder: data.order.digitizedFolder || '',
      });
      setEditProducts(data.order.products ? [...data.order.products] : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };



  const fetchDriveImages = async (folderUrl: string) => {
    if (!folderUrl) return;
    try {
      setDriveImagesLoading(true);
      const res = await fetch(`/api/drive/images?folderUrl=${encodeURIComponent(folderUrl)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.images) setDriveImages(data.images);
      if (data.digitizedFiles) setDigitizedDriveFiles(data.digitizedFiles);
      if (data.digitizedFolderUrl) setDetectedDigitizedFolderUrl(data.digitizedFolderUrl);
    } catch {
      // Silently fail
    } finally {
      setDriveImagesLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    const folderUrl = order.digitizedFolder || order.orderFolder;
    if (!folderUrl) {
      setError('No Google Drive folder URL available for this order');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccessMsg('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderUrl', folderUrl);

      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setSuccessMsg(`File "${file.name}" uploaded to Google Drive folder ✓`);

      addActivityLog({
        orderNumber: order.orderNumber,
        action: 'File Uploaded',
        details: `Uploaded artwork file "${file.name}" to Drive`,
        user: session?.user?.email || 'User',
        type: 'file_upload',
      });

      // Refresh images
      if (order.digitizedFolder) fetchDriveImages(order.digitizedFolder);
      if (order.orderFolder) fetchDriveImages(order.orderFolder);

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError('Upload error: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order || newStatus === order.status) return;
    
    setStatusChanging(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      setSuccessMsg(`Status updated to "${newStatus}" ✓`);

      addActivityLog({
        orderNumber: order.orderNumber,
        action: newStatus === 'Digitized' ? 'Order Digitized' : `Status -> ${newStatus}`,
        details: `Order status changed from "${order.status}" to "${newStatus}"`,
        user: session?.user?.email || (isDigitizer ? 'Digitizer' : 'Admin'),
        type: newStatus === 'Digitized' ? 'digitized' : 'status_change',
      });
      
      // Auto-clear success message
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStatusChanging(false);
    }
  };

  const handleAddProductItem = () => {
    if (editProducts.length >= 10) {
      setError('Maximum 10 products permitted per order');
      return;
    }
    setEditProducts([
      ...editProducts,
      {
        index: editProducts.length + 1,
        name: '',
        productCode: '',
        qty: '1',
        size: '',
        colour: '',
        emb: '',
      },
    ]);
  };

  const handleRemoveProductItem = (idx: number) => {
    const updated = editProducts.filter((_, i) => i !== idx).map((p, i) => ({ ...p, index: i + 1 }));
    setEditProducts(updated);
  };

  const handleProductItemChange = (idx: number, field: string, value: string) => {
    const updated = [...editProducts];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditProducts(updated);
  };

  const handleSaveChanges = async () => {
    if (!order) return;
    
    setSaving(true);
    setSuccessMsg('');
    setError('');

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFields,
          products: editProducts,
          replaceAllProducts: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      const data = await res.json();
      setSuccessMsg(`${data.updatedFields} field(s) updated successfully ✓`);

      addActivityLog({
        orderNumber: editFields.orderNumber || order.orderNumber,
        action: 'Order Details & Products Modified',
        details: `Updated ${data.updatedFields} field(s) / product items`,
        user: session?.user?.email || 'Admin',
        type: 'edited',
      });

      if (editFields.orderNumber && editFields.orderNumber !== order.orderNumber) {
        router.push(`/orders/${encodeURIComponent(editFields.orderNumber)}`);
      } else {
        await fetchOrder();
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };


  const handleSaveOrderEmail = async (newEmailText: string) => {
    try {
      setError('');
      setSuccessMsg('');
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderEmail: newEmailText }),
      });
      if (!res.ok) throw new Error('Failed to update email');
      setSuccessMsg('Order email updated successfully ✓');
      await fetchOrder();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };


  const handleDownloadInvoice = () => {
    if (!order) return;
    try {
      setInvoiceLoading(true);
      // Trigger API PDF download endpoint (forces Content-Type: application/pdf and filename="Invoice-XXXX.pdf")
      const downloadUrl = `/api/orders/${encodeURIComponent(order.orderNumber)}/invoice`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg('Invoice PDF downloaded ✓');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setError('Failed to download invoice: ' + err.message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  // Format processedAt ISO timestamp to readable date
  const formatProcessedAt = (isoStr: string): string => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 skeleton rounded-xl" />
            <div className="h-48 skeleton rounded-xl" />
          </div>
          <div className="h-96 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="p-6 md:p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-800 font-medium mb-2">Error loading order</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchOrder} className="btn-primary px-4 py-2 rounded-xl text-sm mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="p-6 md:p-8 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            {!isDigitizer ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold text-slate-900">Order #</span>
                <input
                  type="text"
                  value={editFields.orderNumber}
                  onChange={(e) => setEditFields(prev => ({ ...prev, orderNumber: e.target.value }))}
                  className="text-2xl font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 max-w-[200px] focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">
                Order #{order.orderNumber}
              </h1>
            )}
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              {!isDigitizer ? (
                <input
                  type="text"
                  value={editFields.orderDate}
                  onChange={(e) => setEditFields(prev => ({ ...prev, orderDate: e.target.value }))}
                  placeholder="Order Date"
                  className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none focus:border-blue-500"
                />
              ) : (
                <span>{order.orderDate}</span>
              )}
              <span>· Row {order.rowIndex}</span>
            </div>
          </div>

        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
              disabled={statusChanging}
              className={`appearance-none pl-4 pr-10 py-2.5 rounded-xl text-sm font-medium border-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer ${
                order.status === 'Pending' ? 'border-amber-300 bg-amber-50 text-amber-800' :
                order.status === 'Being Made' ? 'border-yellow-300 bg-yellow-50 text-yellow-800' :
                order.status === 'Digitized' ? 'border-purple-300 bg-purple-50 text-purple-800' :
                'border-green-300 bg-green-50 text-green-800'
              }`}
            >
              {ORDER_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
            {statusChanging && (
              <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
            )}
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info — Hidden / Masked for Digitizer */}
          {isDigitizer ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 text-sm">Digitizer Access Mode</h3>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Customer personal details are hidden for privacy. Product specs & files are available below.
                  </p>
                </div>
              </div>
              <span className="text-xs bg-purple-200 text-purple-800 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Confidential
              </span>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-blue-600" />
                <h2 className="font-semibold text-slate-900">Customer Information</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={editFields.customerName}
                    onChange={(e) => setEditFields(prev => ({ ...prev, customerName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editFields.customerEmail}
                    onChange={(e) => setEditFields(prev => ({ ...prev, customerEmail: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={editFields.customerPhone}
                    onChange={(e) => setEditFields(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Shipping Address</label>
                  <input
                    type="text"
                    value={editFields.shippingAddress}
                    onChange={(e) => setEditFields(prev => ({ ...prev, shippingAddress: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4.5 h-4.5 text-indigo-600" />
                <h2 className="font-semibold text-slate-900">Products</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {editProducts.length} item{editProducts.length !== 1 ? 's' : ''}
                </span>
                {!isDigitizer && (
                  <button
                    type="button"
                    onClick={handleAddProductItem}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Product
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Product</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">QTY</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Size</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Colour</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">EMB</th>
                    {!isDigitizer && <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isDigitizer ? (
                    order.products.length > 0 ? (
                      order.products.map((product) => (
                        <tr key={product.index} className="table-row-hover">
                          <td className="px-4 py-3 text-sm text-slate-400 font-mono">{product.index}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">{product.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 font-mono">{product.productCode || '—'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">{product.qty || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{product.size || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{product.colour || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{product.emb || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                          No products in this order
                        </td>
                      </tr>
                    )
                  ) : editProducts.length > 0 ? (
                    editProducts.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-xs text-slate-400 font-mono">{idx + 1}</td>
                        <td colSpan={2} className="px-2 py-2">
                          <ProductSelect
                            compact
                            name={prod.name}
                            code={prod.productCode}
                            onNameChange={(val) => handleProductItemChange(idx, 'name', val)}
                            onCodeChange={(val) => handleProductItemChange(idx, 'productCode', val)}
                          />
                        </td>

                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={prod.qty}
                            onChange={(e) => handleProductItemChange(idx, 'qty', e.target.value)}
                            placeholder="Qty"
                            className="w-full min-w-[50px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-center focus:bg-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={prod.size}
                            onChange={(e) => handleProductItemChange(idx, 'size', e.target.value)}
                            placeholder="Size"
                            className="w-full min-w-[60px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={prod.colour}
                            onChange={(e) => handleProductItemChange(idx, 'colour', e.target.value)}
                            placeholder="Colour"
                            className="w-full min-w-[70px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={prod.emb}
                            onChange={(e) => handleProductItemChange(idx, 'emb', e.target.value)}
                            placeholder="Embroidery"
                            className="w-full min-w-[80px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveProductItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Delete Product Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400 text-sm">
                        No products added yet. Click "+ Add Product" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>


            {/* Total (Hidden for Digitizer) */}
            {!isDigitizer && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Order Total</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">£</span>

                  <input
                    type="text"
                    value={editFields.total}
                    onChange={(e) => setEditFields(prev => ({ ...prev, total: e.target.value }))}
                    className="w-28 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Logos & Files Explorer from Drive */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4.5 h-4.5 text-blue-600" />
                <h2 className="font-semibold text-slate-900">Google Drive Files</h2>
              </div>

              {/* Action Folder Links & Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {order.orderFolder && (
                  <a
                    href={order.orderFolder}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open Order Folder
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}

                {(order.digitizedFolder || detectedDigitizedFolderUrl) && (
                  <a
                    href={order.digitizedFolder || detectedDigitizedFolderUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open Digitized Folder
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold ml-1">
                  <button
                    onClick={() => setActiveDriveTab('artwork')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeDriveTab === 'artwork'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Artwork ({driveImages.length})
                  </button>
                  <button
                    onClick={() => setActiveDriveTab('digitized')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      activeDriveTab === 'digitized'
                        ? 'bg-white text-purple-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Digitized Files ({digitizedDriveFiles.length})
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4">
              {driveImagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  <span className="ml-2 text-sm text-slate-400">Loading files from Drive...</span>
                </div>
              ) : activeDriveTab === 'artwork' ? (
                driveImages.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <Image className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No customer artwork found in main folder</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {driveImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedImage(img)}
                      >
                        <div className="aspect-square flex items-center justify-center p-2">
                          {img.thumbnailUrl ? (
                            <img
                              src={img.thumbnailUrl}
                              alt={img.name}
                              className="max-w-full max-h-full object-contain rounded-lg"
                            />
                          ) : (
                            <Image className="w-10 h-10 text-slate-300" />
                          )}
                        </div>
                        <div className="px-2.5 pb-2.5">
                          <p className="text-xs text-slate-600 truncate font-medium" title={img.name}>
                            {img.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={img.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-medium hover:bg-blue-100 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </a>
                            <a
                              href={img.viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium hover:bg-slate-200 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                digitizedDriveFiles.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <Scan className="w-10 h-10 mx-auto mb-2 text-purple-300" />
                    <p className="text-sm font-medium text-slate-600 mb-1">No files in Digitized Files subfolder</p>
                    <p className="text-xs text-slate-400">Upload DST/PES or digitized logos in Google Drive</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {digitizedDriveFiles.map((img) => (
                      <div
                        key={img.id}
                        className="group relative bg-purple-50/40 rounded-xl border border-purple-200 overflow-hidden hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setSelectedImage(img)}
                      >
                        <div className="aspect-square flex items-center justify-center p-2">
                          {img.thumbnailUrl ? (
                            <img
                              src={img.thumbnailUrl}
                              alt={img.name}
                              className="max-w-full max-h-full object-contain rounded-lg"
                            />
                          ) : (
                            <Scan className="w-10 h-10 text-purple-400" />
                          )}
                        </div>
                        <div className="px-2.5 pb-2.5">
                          <p className="text-xs text-purple-900 truncate font-medium" title={img.name}>
                            {img.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={img.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-md text-[10px] font-medium hover:bg-purple-200 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </a>
                            <a
                              href={img.viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium hover:bg-slate-200 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-5">
          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">Actions</h3>
            
            {!isDigitizer && (
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="w-full btn-primary px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving Changes...' : 'Save Changes'}

              </button>
            )}

            {/* Mark as Digitized */}
            {order.status !== 'Digitized' && order.status !== 'Done' && (
              <button
                onClick={() => handleStatusChange('Digitized')}
                disabled={statusChanging}
                className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-md shadow-purple-600/20"
              >
                {statusChanging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4" />
                )}
                Mark as Digitized
              </button>
            )}

            {!isDigitizer && (
              <a
                href={`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice`}
                download={`Invoice-${order.orderNumber}.pdf`}
                className="w-full btn-secondary px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors hover:bg-slate-100"
              >
                <Download className="w-4 h-4" />
                Download Invoice
              </a>
            )}
          </div>

          {/* Dispatch Date Feature (+10 Working Days Automation) */}
          <DispatchDateCard orderDate={order.orderDate} workingDays={10} />

          {/* Order Details (Meta) */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">Order Details</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={order.status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Date</span>
                <span className="text-slate-800 font-medium">{order.orderDate || '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Dispatch Date</span>
                <span className="text-indigo-700 font-semibold text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {calculateDispatchDate(order.orderDate, 10).formattedFull}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Processed At</span>
                <span className="text-slate-800 font-medium">{formatProcessedAt(order.processedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sheet Row</span>
                <span className="text-slate-400 font-mono text-xs">{order.rowIndex}</span>
              </div>
            </div>
          </div>

          {/* Activity Audit Trail */}
          <OrderActivityTimeline orderNumber={order.orderNumber} order={order} />

          {/* Original Order Email Viewer (Owner Only — Right Sidebar Scrollable Canvas) */}
          {!isDigitizer && (
            <OrderEmailViewer
              orderNumber={order.orderNumber}
              orderEmailText={order.orderEmail}
              customerName={order.customerName}
              customerEmail={order.customerEmail}
            />
          )}
        </div>
      </div>


      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 truncate">{selectedImage.name}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={selectedImage.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <span className="text-slate-400 text-lg leading-none">&times;</span>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center p-6 bg-slate-50 min-h-[300px] max-h-[70vh] overflow-auto">
              <img
                src={selectedImage.thumbnailUrl}
                alt={selectedImage.name}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
