/** Rules about touch points: which one is open, which one is current, when the next one is due. */
import type { Lead, TouchPoint } from '@/domain/types';

/** A touch point still waiting for the agent (not done, not skipped). */
export const isOpenTouchPoint = (tp: TouchPoint) => tp.status === 'pending' || tp.status === 'overdue';

/** The open touch point the lead is currently waiting on (undefined when the workflow is finished). */
export const findCurrentTouchPoint = (lead: Lead) => lead.touchPoints.find(t => t.order === lead.currentTouchPoint);

/**
 * Finds the first open touch point and gives it a fresh due date.
 * Workflow day offsets are cumulative (0, 1, 2, 4 ...), so the wait for a step is the GAP
 * from the previous step, counted forward from the moment the last touch point was done.
 */
export function scheduleNextTouchPoint(touchPoints: TouchPoint[]): { touchPoints: TouchPoint[]; next: TouchPoint | undefined } {
  const idx = touchPoints.findIndex(isOpenTouchPoint);
  if (idx === -1) return { touchPoints, next: undefined };
  const tp = touchPoints[idx];
  const prev = [...touchPoints].filter(t => t.order < tp.order).sort((a, b) => b.order - a.order)[0];
  const gapDays = Math.max(0, tp.dayOffset - (prev?.dayOffset ?? 0));
  const next = { ...tp, dueDate: new Date(Date.now() + gapDays * 86400000).toISOString() };
  return { touchPoints: touchPoints.map((x, i) => (i === idx ? next : x)), next };
}

export function describeDueDate(tp: TouchPoint | undefined): { label: string; tone: 'overdue' | 'today' | 'later' | 'none' } {
  if (!tp || !tp.dueDate) return { label: '', tone: 'none' };
  const due = new Date(tp.dueDate);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  if (due < startOfToday) {
    const d = Math.max(1, Math.round((startOfToday.getTime() - due.getTime()) / 86400000));
    return { label: `Overdue ${d}d`, tone: 'overdue' };
  }
  if (due <= endOfToday) return { label: 'Due today', tone: 'today' };
  const d = Math.ceil((due.getTime() - endOfToday.getTime()) / 86400000);
  return { label: `Due in ${d}d`, tone: 'later' };
}

/** When the agent last touched this lead (latest completed touch point of the current round). */
export function lastTouchTimestamp(lead: Lead): number | null {
  let best: number | null = null;
  for (const tp of lead.touchPoints) {
    if (tp.status !== 'completed' || !tp.completedAt) continue;
    const t = new Date(tp.completedAt).getTime();
    if (best === null || t > best) best = t;
  }
  return best;
}

/** "1: CALL" / "2: EMAIL" */
export const stepLabel = (order: number, type: string) => `${order + 1}: ${type.toUpperCase()}`;
