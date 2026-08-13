'use client';

import { useEffect, useState } from 'react';
import { ActivityItem, getActivityLogs } from '@/lib/store/activityLog';
import { Order } from '@/lib/types/order';
import { Clock, CheckCircle2, Edit3, UploadCloud, Scan, Package, User } from 'lucide-react';

interface OrderActivityTimelineProps {
  orderNumber: string;
  order?: Order;
}

export default function OrderActivityTimeline({ orderNumber, order }: OrderActivityTimelineProps) {
  const [logs, setLogs] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (orderNumber) {
      const items = getActivityLogs(orderNumber, order);
      setLogs(items);
    }
  }, [orderNumber, order]);

  const getEventIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'created':
        return <Package className="w-3.5 h-3.5 text-green-600" />;
      case 'digitized':
        return <Scan className="w-3.5 h-3.5 text-purple-600" />;
      case 'file_upload':
        return <UploadCloud className="w-3.5 h-3.5 text-blue-600" />;
      case 'edited':
        return <Edit3 className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getEventBg = (type: ActivityItem['type']) => {
    switch (type) {
      case 'created':
        return 'bg-green-100 border-green-200';
      case 'digitized':
        return 'bg-purple-100 border-purple-200';
      case 'file_upload':
        return 'bg-blue-100 border-blue-200';
      case 'edited':
        return 'bg-amber-100 border-amber-200';
      default:
        return 'bg-slate-100 border-slate-200';
    }
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Activity Audit Trail</h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {logs.length} events
        </span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {logs.map((log) => (
          <div key={log.id} className="relative group">
            {/* Timeline Node Icon */}
            <div
              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center shadow-2xs ${getEventBg(
                log.type
              )}`}
            >
              {getEventIcon(log.type)}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">{log.action}</span>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {formatTime(log.timestamp)}
                </span>
              </div>
              {log.details && (
                <p className="text-xs text-slate-500 leading-snug">{log.details}</p>
              )}
              {log.user && (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium pt-0.5">
                  <User className="w-2.5 h-2.5" /> {log.user}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
