export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: InvoiceItem[];
  total: string;
  invoiceDate: string;
  createdAt: string;
  pdfPath: string;
}

export interface InvoiceItem {
  product: string;
  productCode: string;
  qty: string;
  size: string;
  colour: string;
  emb: string;
}

export interface CompanySettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyLogo: string;
  invoicePrefix: string;
  invoiceFooter: string;
  invoiceCounter: number;
}
