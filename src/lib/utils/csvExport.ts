// ============================================
// CSV Export Utility for Monthly Orders
// ============================================

import { Order } from '@/lib/types/order';

function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportOrdersToCsv(orders: Order[], filename: string = 'Orders-Export.csv') {
  if (!orders || orders.length === 0) {
    alert('No orders available to export');
    return;
  }

  const headers = [
    'Order Number',
    'Order Date',
    'Status',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Shipping Address',
    'Total Amount',
    'Product Count',
    'Products List Summary',
    'Order Folder URL',
    'Logo Details',
    'Processed At',
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(',')];

  orders.forEach((o) => {
    const productSummary = o.products
      .map((p) => `${p.name} [${p.productCode || 'N/A'}] x${p.qty} (${p.size || 'No Size'})`)
      .join('; ');

    const row = [
      o.orderNumber,
      o.orderDate || '',
      o.status,
      o.customerName || '',
      o.customerEmail || '',
      o.customerPhone || '',
      o.shippingAddress || '',
      o.total || '',
      o.products.length,
      productSummary,
      o.orderFolder || '',
      o.logoDetails || '',
      o.processedAt || '',
    ];

    rows.push(row.map(escapeCsvCell).join(','));
  });

  const csvContent = rows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
