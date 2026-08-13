// ============================================
// Dispatch Date Calculator Utility
// Calculates 10 working days (Mon-Fri only, excluding weekends)
// ============================================

export interface DispatchInfo {
  orderDate: Date | null;
  dispatchDate: Date | null;
  formattedDispatchDate: string; // e.g. "28 Aug 2026"
  formattedFull: string;         // e.g. "28 Aug 2026 (Friday)"
  dayOfWeek: string;             // e.g. "Friday"
  workingDaysCount: number;      // 10
  daysRemaining: number | null;  // Calendar days from today
  workingDaysRemaining: number | null; // Business days from today
  status: 'overdue' | 'due-today' | 'upcoming' | 'invalid';
}

/**
 * Parses various date formats commonly used in Google Sheets & order system
 */
export function parseOrderDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) return null;
  const str = dateStr.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const d = new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Standard ISO or string parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  return null;
}

/**
 * Calculates dispatch date by adding `workingDaysToAdd` working days (Mon-Fri)
 * Saturdays (6) and Sundays (0) are excluded from counting.
 */
export function calculateDispatchDate(orderDateStr: string, workingDaysToAdd = 10): DispatchInfo {
  const orderDate = parseOrderDate(orderDateStr);
  if (!orderDate) {
    return {
      orderDate: null,
      dispatchDate: null,
      formattedDispatchDate: '—',
      formattedFull: '—',
      dayOfWeek: '',
      workingDaysCount: workingDaysToAdd,
      daysRemaining: null,
      workingDaysRemaining: null,
      status: 'invalid',
    };
  }

  // Step 1: If order date is on a weekend (Saturday or Sunday), 
  // advance to the next business day (Monday) before starting the 10 business days count.
  const current = new Date(orderDate.getTime());
  while (current.getDay() === 0 || current.getDay() === 6) {
    current.setDate(current.getDate() + 1);
  }

  // Step 2: Add `workingDaysToAdd` business days (Monday-Friday) from the first working day
  let count = 0;
  while (count < workingDaysToAdd) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday -> Skip weekends!
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayOfWeek = dayNames[current.getDay()];
  const dayNum = current.getDate();
  const monthStr = monthNames[current.getMonth()];
  const yearNum = current.getFullYear();

  const formattedDispatchDate = `${dayNum} ${monthStr} ${yearNum}`;
  const formattedFull = `${formattedDispatchDate} (${dayOfWeek})`;

  // Calculate days remaining from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(current.getTime());
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Count working days remaining
  let workingDaysRemaining = 0;
  if (daysRemaining > 0) {
    const temp = new Date(today.getTime());
    while (temp < target) {
      temp.setDate(temp.getDate() + 1);
      const d = temp.getDay();
      if (d !== 0 && d !== 6) {
        workingDaysRemaining++;
      }
    }
  } else if (daysRemaining < 0) {
    const temp = new Date(target.getTime());
    while (temp < today) {
      temp.setDate(temp.getDate() + 1);
      const d = temp.getDay();
      if (d !== 0 && d !== 6) {
        workingDaysRemaining--;
      }
    }
  }

  let status: 'overdue' | 'due-today' | 'upcoming' | 'invalid' = 'upcoming';
  if (daysRemaining < 0) {
    status = 'overdue';
  } else if (daysRemaining === 0) {
    status = 'due-today';
  }

  return {
    orderDate,
    dispatchDate: current,
    formattedDispatchDate,
    formattedFull,
    dayOfWeek,
    workingDaysCount: workingDaysToAdd,
    daysRemaining,
    workingDaysRemaining,
    status,
  };
}
