/** The period an Analytics screen looks at: today, this week, this month or any custom from-to. */
import type { Lead } from '@/domain/types';
import { localDateStr } from '@/shared/lib/dates';

export type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

/** Both ends are local days (YYYY-MM-DD) and both are included. */
export interface DateRange { from: string; to: string }

/** The week starts on Saturday (Egypt). Change this to 1 for a Monday week. */
const WEEK_STARTS_ON = 6;

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export function resolveRange(preset: PeriodPreset, custom: DateRange, now = new Date()): DateRange {
  if (preset === 'today') { const t = localDateStr(now); return { from: t, to: t }; }
  if (preset === 'week') {
    const back = (now.getDay() - WEEK_STARTS_ON + 7) % 7;
    const start = addDays(now, -back);
    return { from: localDateStr(start), to: localDateStr(addDays(start, 6)) };
  }
  if (preset === 'month') {
    const y = now.getFullYear(), m = now.getMonth();
    return { from: localDateStr(new Date(y, m, 1)), to: localDateStr(new Date(y, m + 1, 0)) };
  }
  // custom: an empty or reversed range is fixed instead of showing nothing
  const from = custom.from || custom.to || localDateStr(now);
  const to = custom.to || from;
  return from <= to ? { from, to } : { from: to, to: from };
}

export const dayOf = (iso: string) => localDateStr(new Date(iso));
export const isInRange = (day: string, r: DateRange) => day >= r.from && day <= r.to;

/**
 * The leads as they looked during the period: only the calls made in the period are kept, and "reached" means a
 * Discovery call in the period. A lead is included when it had a call in the period, was given to the agent in the
 * period, or is in `keepIds` (leads sold in the period).
 */
export function leadsForPeriod(leads: Lead[], r: DateRange, keepIds: Set<string>): Lead[] {
  const out: Lead[] = [];
  for (const l of leads) {
    const callLogs = l.callLogs.filter(c => isInRange(dayOf(c.timestamp), r));
    const assignedNow = !!l.assignedAt && isInRange(dayOf(l.assignedAt), r);
    if (!callLogs.length && !assignedNow && !keepIds.has(l.id)) continue;
    out.push({ ...l, callLogs, status: 'new', discoveryReached: callLogs.some(c => c.type === 'discovery') });
  }
  return out;
}
