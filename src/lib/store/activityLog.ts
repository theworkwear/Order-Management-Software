// ============================================
// Activity Log & Audit Trail Store
// Zero modifications to Google Sheets schema required
// ============================================

import { Order } from '@/lib/types/order';

export interface ActivityItem {
  id: string;
  orderNumber: string;
  action: string;
  details?: string;
  user?: string;
  timestamp: string;
  type: 'created' | 'status_change' | 'edited' | 'file_upload' | 'digitized' | 'deleted';
}

const STORAGE_KEY = 'tww_activity_logs';

function safeIsoDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return new Date().toISOString();
  }
  try {
    const d = new Date(dateStr.trim());
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {
    // fallback
  }
  return new Date().toISOString();
}

function getStoredLogs(): ActivityItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredLogs(logs: ActivityItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save activity logs:', e);
  }
}

export function addActivityLog(entry: {
  orderNumber: string;
  action: string;
  details?: string;
  user?: string;
  type: 'created' | 'status_change' | 'edited' | 'file_upload' | 'digitized' | 'deleted';
}): ActivityItem {
  const logs = getStoredLogs();
  const newItem: ActivityItem = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    orderNumber: entry.orderNumber,
    action: entry.action,
    details: entry.details,
    user: entry.user || 'System',
    timestamp: new Date().toISOString(),
    type: entry.type,
  };

  logs.unshift(newItem);
  saveStoredLogs(logs);
  return newItem;
}

export function getActivityLogs(orderNumber: string, order?: Order): ActivityItem[] {
  const allLogs = getStoredLogs();
  const matched = allLogs.filter((l) => l.orderNumber === orderNumber);

  if (matched.length > 0) {
    return matched;
  }

  // Generate synthetic default timeline events if no explicit activity log exists yet
  const defaults: ActivityItem[] = [];

  if (order) {
    // 1. Created event
    defaults.push({
      id: `syn-created-${order.orderNumber}`,
      orderNumber: order.orderNumber,
      action: 'Order Received & Logged',
      details: `Order #${order.orderNumber} for ${order.customerName || 'Customer'} with ${order.products?.length || 0} product item(s)`,
      user: 'System Import',
      timestamp: safeIsoDate(order.orderDate),
      type: 'created',
    });

    // 2. Status event if Digitized / Done
    if (order.status === 'Digitized' || order.status === 'Done') {
      defaults.push({
        id: `syn-dig-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        action: 'Marked as Digitized',
        details: 'Embroidery digitization completed & files prepared',
        user: 'Digitizer Team',
        timestamp: safeIsoDate(order.processedAt),
        type: 'digitized',
      });
    }

    if (order.status === 'Being Made') {
      defaults.push({
        id: `syn-making-${order.orderNumber}`,
        orderNumber: order.orderNumber,
        action: 'Production Started',
        details: 'Order status changed to Being Made',
        user: 'Production Manager',
        timestamp: new Date().toISOString(),
        type: 'status_change',
      });
    }
  }

  return defaults;
}
