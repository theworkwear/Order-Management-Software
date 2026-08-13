'use client';

import { OrderStatus, STATUS_CONFIG } from '@/lib/types/order';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['Pending'];
  
  const statusClass = {
    'Pending': 'status-pending',
    'Being Made': 'status-being-made',
    'Digitized': 'status-digitized',
    'Done': 'status-done',
  }[status] || 'status-pending';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${statusClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'Pending' ? 'bg-amber-500' :
        status === 'Being Made' ? 'bg-yellow-500' :
        status === 'Digitized' ? 'bg-purple-500' :
        'bg-green-500'
      }`} />
      {config.label}
    </span>
  );
}
