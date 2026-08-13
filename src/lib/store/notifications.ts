// ============================================
// Notification Store
// Manages in-app notifications for order events
// ============================================

import fs from 'fs';
import path from 'path';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  orderNumber: string;
  createdAt: string;
  read: boolean;
  type: 'digitized' | 'status_change' | 'system';
  byUser?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Memory fallback store
let memoryNotifications: AppNotification[] = [
  {
    id: 'notif-demo-1',
    title: 'Order Digitized',
    message: 'Order #486579 has been marked as Digitized by Digitizer.',
    orderNumber: '486579',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    read: false,
    type: 'digitized',
    byUser: 'digitizer@theworkwear.com',
  },
];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to create data dir:', e);
  }
}

export function getNotifications(): AppNotification[] {
  try {
    ensureDataDir();
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8');
      return JSON.parse(data);
    }
    // Save initial demo notifications if file doesn't exist
    saveNotifications(memoryNotifications);
    return memoryNotifications;
  } catch (e) {
    console.error('Error reading notifications file:', e);
    return memoryNotifications;
  }
}

export function saveNotifications(notifications: AppNotification[]): void {
  memoryNotifications = notifications;
  try {
    ensureDataDir();
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving notifications file:', e);
  }
}

export function addNotification(params: {
  title: string;
  message: string;
  orderNumber: string;
  type?: 'digitized' | 'status_change' | 'system';
  byUser?: string;
}): AppNotification {
  const notifications = getNotifications();
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: params.title,
    message: params.message,
    orderNumber: params.orderNumber,
    createdAt: new Date().toISOString(),
    read: false,
    type: params.type || 'digitized',
    byUser: params.byUser,
  };

  const updated = [newNotif, ...notifications].slice(0, 100); // keep last 100
  saveNotifications(updated);
  return newNotif;
}

export function markAsRead(id: string): AppNotification[] {
  const notifications = getNotifications();
  const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(updated);
  return updated;
}

export function markAllAsRead(): AppNotification[] {
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  saveNotifications(updated);
  return updated;
}
