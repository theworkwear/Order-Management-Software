'use client';

import React from 'react';
import { Calendar, Truck, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { calculateDispatchDate, DispatchInfo } from '@/lib/utils/dispatchCalculator';

interface DispatchDateCardProps {
  orderDate: string;
  workingDays?: number;
  className?: string;
  compact?: boolean;
}

export default function DispatchDateCard({
  orderDate,
  workingDays = 10,
  className = '',
  compact = false,
}: DispatchDateCardProps) {
  const dispatchInfo: DispatchInfo = calculateDispatchDate(orderDate, workingDays);

  if (dispatchInfo.status === 'invalid') {
    return (
      <div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 flex items-center gap-2 ${className}`}>
        <Calendar className="w-4 h-4 text-slate-400" />
        <span>Dispatch Date: Order date not set</span>
      </div>
    );
  }

  // Compact layout (for list items / badges)
  if (compact) {
    return (
      <div 
        suppressHydrationWarning
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
        dispatchInfo.status === 'overdue'
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : dispatchInfo.status === 'due-today'
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-indigo-50/80 border-indigo-100 text-indigo-900'
      } ${className}`}
      >
        <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <div suppressHydrationWarning>
          <span className="font-semibold">{dispatchInfo.formattedDispatchDate}</span>
          <span className="text-[10px] text-slate-500 ml-1.5">({dispatchInfo.dayOfWeek})</span>
        </div>
      </div>
    );
  }

  // Full detailed card view
  return (
    <div 
      suppressHydrationWarning
      className={`bg-gradient-to-br from-white to-slate-50/70 border border-indigo-100 shadow-sm rounded-xl p-5 space-y-4 relative overflow-hidden ${className}`}
    >
      {/* Accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Target Dispatch Date</h3>
            <p className="text-xs text-slate-500">Automated 10 Working-Day Schedule</p>
          </div>
        </div>

        {/* Status Badge */}
        {dispatchInfo.status === 'overdue' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            Overdue
          </span>
        )}
        {dispatchInfo.status === 'due-today' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Due Today
          </span>
        )}
        {dispatchInfo.status === 'upcoming' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            On Schedule
          </span>
        )}
      </div>

      {/* Big Date Highlight */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs">
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {dispatchInfo.formattedDispatchDate}
          </div>
          <div className="text-xs font-medium text-indigo-600 mt-0.5">
            {dispatchInfo.dayOfWeek}
          </div>
        </div>

        {/* Countdown */}
        {dispatchInfo.workingDaysRemaining !== null && (
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Working Days Left</div>
            <div className="text-lg font-semibold text-slate-800">
              {dispatchInfo.workingDaysRemaining > 0
                ? `${dispatchInfo.workingDaysRemaining} days`
                : dispatchInfo.workingDaysRemaining === 0
                ? 'Due Today'
                : `${Math.abs(dispatchInfo.workingDaysRemaining)} days ago`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
