// ============================================
// Local JSON Config Store
// ============================================
import fs from 'fs';
import path from 'path';
import { CompanySettings } from '@/lib/types/invoice';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filename: string, data: T): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// ============================================
// Settings
// ============================================

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'The Work Wear',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  companyLogo: '',
  invoicePrefix: 'INV',
  invoiceFooter: 'Thank you for your business!',
  invoiceCounter: 1,
};

export function getSettings(): CompanySettings {
  return readJson<CompanySettings>('settings.json', DEFAULT_SETTINGS);
}

export function updateSettings(updates: Partial<CompanySettings>): CompanySettings {
  const current = getSettings();
  const updated = { ...current, ...updates };
  writeJson('settings.json', updated);
  return updated;
}

// ============================================
// Invoices
// ============================================

import { Invoice } from '@/lib/types/invoice';

export function getInvoices(): Invoice[] {
  return readJson<Invoice[]>('invoices.json', []);
}

export function addInvoice(invoice: Invoice): void {
  const invoices = getInvoices();
  invoices.push(invoice);
  writeJson('invoices.json', invoices);
}

export function getInvoiceById(id: string): Invoice | undefined {
  return getInvoices().find(inv => inv.id === id);
}

export function getNextInvoiceNumber(): string {
  const settings = getSettings();
  const num = settings.invoiceCounter;
  const year = new Date().getFullYear();
  const number = `${settings.invoicePrefix}-${year}-${String(num).padStart(5, '0')}`;
  updateSettings({ invoiceCounter: num + 1 });
  return number;
}

// ============================================
// Google Connection State
// ============================================

interface GoogleConnection {
  connected: boolean;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  spreadsheetId?: string;
  sheetName?: string;
}

export function getGoogleConnection(): GoogleConnection {
  return readJson<GoogleConnection>('google-connection.json', { connected: false });
}

export function updateGoogleConnection(updates: Partial<GoogleConnection>): GoogleConnection {
  const current = getGoogleConnection();
  const updated = { ...current, ...updates };
  writeJson('google-connection.json', updated);
  return updated;
}
