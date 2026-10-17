import type { CallType, Lead, TouchPoint, Workflow } from '@/types';

/** A touch point still waiting for the agent (not done, not skipped). */
export const isOpenTouchPoint = (tp: TouchPoint) => tp.status === 'pending' || tp.status === 'overdue';

/** Call logs that belong to the lead's CURRENT round (a transfer starts a new round). */
export function currentRoundCalls(lead: Lead) {
  const round = lead.round ?? 1;
  return lead.callLogs.filter(cl => (cl.round ?? 1) === round);
}

const CALL_RANK: Record<CallType, number> = { discovery: 3, lvm: 2, nvm: 1 };

/** Best call result so far: discovery > lvm > nvm. null when no call was logged yet. */
export function highestCallType(lead: Lead): CallType | null {
  let best: CallType | null = null;
  for (const cl of currentRoundCalls(lead)) {
    if (!best || CALL_RANK[cl.type] > CALL_RANK[best]) best = cl.type;
  }
  return best;
}

/**
 * Category used by the work queue.
 *   no calls yet                -> new
 *   highest call = discovery    -> discovery   (even if there is also an LVM)
 *   highest call = lvm          -> lvm
 *   only NVM calls              -> lvm         (NVM is shown inside the LVM category)
 *   meeting arranged            -> meeting
 */
export type QueueCategory = 'new' | 'discovery' | 'lvm' | 'meeting';

export function queueCategory(lead: Lead): QueueCategory {
  if (lead.status === 'arranged_meeting') return 'meeting';
  const best = highestCallType(lead);
  if (!best) return 'new';
  return best === 'discovery' ? 'discovery' : 'lvm';
}

/** The status stored on the lead after a call (never overrides an arranged meeting). */
export function statusFromCalls(lead: Lead): Lead['status'] {
  if (lead.status === 'arranged_meeting') return lead.status;
  return highestCallType(lead) ?? 'new';
}

/**
 * Finds the first open touch point and gives it a fresh due date.
 * Workflow day offsets are cumulative (0, 1, 2, 4 ...), so the wait for a step is the GAP
 * from the previous step, counted forward from the moment the last touch point was done.
 */
export function scheduleNext(touchPoints: TouchPoint[]): { touchPoints: TouchPoint[]; next: TouchPoint | undefined } {
  const idx = touchPoints.findIndex(isOpenTouchPoint);
  if (idx === -1) return { touchPoints, next: undefined };
  const tp = touchPoints[idx];
  const prev = [...touchPoints].filter(t => t.order < tp.order).sort((a, b) => b.order - a.order)[0];
  const gapDays = Math.max(0, tp.dayOffset - (prev?.dayOffset ?? 0));
  const next = { ...tp, dueDate: new Date(Date.now() + gapDays * 86400000).toISOString() };
  return { touchPoints: touchPoints.map((x, i) => (i === idx ? next : x)), next };
}

export function dueInfo(tp: TouchPoint | undefined): { label: string; tone: 'overdue' | 'today' | 'later' | 'none' } {
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

// ---------------------------------------------------------------------------
// Work queue buckets:  today  /  next  /  stop
// ---------------------------------------------------------------------------
export type QueueBucket = 'today' | 'next' | 'stop' | 'finished';

export const startOfDay = (d: Date | number) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const endOfDay = (d: Date | number) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

/** The open touch point the lead is currently waiting on (undefined when the workflow is finished). */
export const currentTouchPoint = (lead: Lead) => lead.touchPoints.find(t => t.order === lead.currentTouchPoint);

/**
 *   stopped lead                                -> stop
 *   no open touch point left                    -> finished
 *   due today (or already overdue)              -> today
 *   due tomorrow or later                       -> next
 */
export function queueBucket(lead: Lead, now: number = Date.now()): QueueBucket {
  if (lead.stopped) return 'stop';
  const tp = currentTouchPoint(lead);
  if (!tp || !isOpenTouchPoint(tp)) return 'finished';
  if (!tp.dueDate) return 'today';
  return new Date(tp.dueDate).getTime() <= endOfDay(now).getTime() ? 'today' : 'next';
}

/** The moment a "next" lead moves into Today = the start of the day its touch point is due. */
export function becomesTodayAt(tp: TouchPoint | undefined): number | null {
  if (!tp?.dueDate) return null;
  return startOfDay(new Date(tp.dueDate)).getTime();
}

/** 15 min / 5h 20m / 2d 5h  -  short, human duration. */
export function formatSpan(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) { const m = mins % 60; return m ? `${hours}h ${m}m` : `${hours}h`; }
  const days = Math.floor(hours / 24); const h = hours % 24;
  return h ? `${days}d ${h}h` : `${days}d`;
}

/** When the agent last touched this lead (latest completed touch point of the current round). */
export function lastTouchAt(lead: Lead): number | null {
  let best: number | null = null;
  for (const tp of lead.touchPoints) {
    if (tp.status !== 'completed' || !tp.completedAt) continue;
    const t = new Date(tp.completedAt).getTime();
    if (best === null || t > best) best = t;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Display names  ("Activation" instead of ACT-001, "1: CALL" instead of 1-call-ACT-001)
// ---------------------------------------------------------------------------
/** "Activation Campaign" -> "Activation". Falls back to the code when there is no workflow. */
export function campaignLabel(workflows: Workflow[], code: string): string {
  const wf = workflows.find(w => w.campaignCode === code);
  return (wf?.name ?? code).replace(/\s+campaign$/i, '').trim();
}

/** "1: CALL" / "2: EMAIL" */
export const stepLabel = (order: number, type: string) => `${order + 1}: ${type.toUpperCase()}`;
