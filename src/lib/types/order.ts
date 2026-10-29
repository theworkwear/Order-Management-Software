// ============================================
// Order Types
// ============================================

export type OrderStatus = 'Pending' | 'Being Made' | 'Digitized' | 'Done' | 'Cancelled';

export const ORDER_STATUSES: OrderStatus[] = ['Pending', 'Being Made', 'Digitized', 'Done', 'Cancelled'];

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  'Pending': {
    label: 'Pending',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  'Being Made': {
    label: 'Being Made',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  'Digitized': {
    label: 'Digitized',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  'Done': {
    label: 'Done',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  'Cancelled': {
    label: 'Cancelled',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

export interface Product {
  index: number; // 1-50
  name: string;
  productCode: string;
  qty: string;
  size: string;
  colour: string;
  emb: string;
}

export interface Order {
  rowIndex: number; // 1-based row in the spreadsheet (header = row 1)
  orderNumber: string;
  orderDate: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  total: string;
  orderFolder: string;
  logoDetails?: string;
  orderEmail: string;
  processedAt: string;
  digitizedFolder?: string;
  products: Product[];
  rawRow: string[]; // full raw row data
}

export interface OrderFilters {
  search: string;
  status: OrderStatus | 'all';
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface MonthlySales {
  month: string; // "2026-08"
  monthLabel: string; // "August 2026"
  totalSales: number;
  orderCount: number;
}

export interface DashboardStats {
  total: number;
  pending: number;
  beingMade: number;
  digitized: number;
  done: number;
  cancelled: number;
  monthlySales: MonthlySales[];
  recentOrders: Order[];
}

// Column indices in the CSV/Sheet (0-based)
export const COLUMN_MAP = {
  orderNumber: 0,
  orderDate: 1,
  status: 2,
  customerName: 3,
  customerEmail: 4,
  customerPhone: 5,
  shippingAddress: 6,
  total: 7,
  orderFolder: 8,
  logoDetails: 9, // Column J (Index 9, directly after Order Folder)
  orderEmail: 10,
  processedAt: 11,
  // Products start at index 12 (Col M)
  // Each product has 6 columns: Product, Product Code, QTY, Size, Colour, EMB
  productsStart: 12,
  fieldsPerProduct: 6,
  maxProducts: 50,
} as const;

export function getProductColumnIndex(productIndex: number, fieldOffset: number): number {
  // productIndex: 1-50, fieldOffset: 0=Product, 1=Code, 2=QTY, 3=Size, 4=Colour, 5=EMB
  return COLUMN_MAP.productsStart + (productIndex - 1) * COLUMN_MAP.fieldsPerProduct + fieldOffset;
}
