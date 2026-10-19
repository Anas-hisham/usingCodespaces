/** Which work-queue bucket a lead belongs to: today / next / stop / finished. */
import type { Lead, TouchPoint } from '@/domain/types';
import { findCurrentTouchPoint, isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { endOfDay, startOfDay } from '@/shared/lib/dates';

// ---------------------------------------------------------------------------
// Work queue buckets:  today  /  next  /  stop
// ---------------------------------------------------------------------------
export type QueueBucket = 'today' | 'next' | 'stop' | 'finished';

/**
 *   stopped lead                                -> stop
 *   no open touch point left                    -> finished
 *   due today (or already overdue)              -> today
 *   due tomorrow or later                       -> next
 */
export function queueBucket(lead: Lead, now: number = Date.now()): QueueBucket {
  if (lead.stopped) return 'stop';
  const tp = findCurrentTouchPoint(lead);
  if (!tp || !isOpenTouchPoint(tp)) return 'finished';
  if (!tp.dueDate) return 'today';
  return new Date(tp.dueDate).getTime() <= endOfDay(now).getTime() ? 'today' : 'next';
}

/** The moment a "next" lead moves into Today = the start of the day its touch point is due. */
export function becomesTodayAt(tp: TouchPoint | undefined): number | null {
  if (!tp?.dueDate) return null;
  return startOfDay(new Date(tp.dueDate)).getTime();
}
