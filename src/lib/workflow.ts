import type { CallType, Lead, TouchPoint, Workflow, Meeting } from '@/types';

// ---------------------------------------------------------------------------
// Rules agreed with the project owner
// ---------------------------------------------------------------------------
/** A lead that makes no progress (same touch point, or stopped) for this many CALENDAR days leaves the agent's queue. */
export const LEAD_EXPIRY_DAYS = 15;
/** Reminder before an arranged meeting. */
export const MEETING_REMINDER_MINUTES = 15;
/** When an EMAIL touch point comes due the system sends it by itself (Discovery or No Response template). Set false to turn it off. */
export const AUTO_EMAIL_ENABLED = true;


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

/** Best result so far. A lead that got a meeting arranged was reached, so it counts as Discovery. */
export function effectiveCallType(lead: Lead): CallType | null {
  return lead.discoveryReached ? 'discovery' : highestCallType(lead);
}

/**
 * Category used by the work queue (each one is its own section).
 *   no calls yet                -> new
 *   best result = discovery     -> discovery   (even if there is also an LVM)
 *   best result = lvm           -> lvm
 *   only NVM calls              -> nvm
 *   meeting arranged            -> meeting     (until the meeting day ends)
 */
export type QueueCategory = 'new' | 'discovery' | 'lvm' | 'nvm' | 'meeting';

export function queueCategory(lead: Lead): QueueCategory {
  if (lead.status === 'arranged_meeting') return 'meeting';
  return effectiveCallType(lead) ?? 'new';
}

/** The status stored on the lead after a call (never overrides an arranged meeting). */
export function statusFromCalls(lead: Lead): Lead['status'] {
  if (lead.status === 'arranged_meeting') return lead.status;
  return effectiveCallType(lead) ?? 'new';
}

// ---------------------------------------------------------------------------
// 15-day rule
// ---------------------------------------------------------------------------
/** The moment the 15 days are counted from: the latest of assignment, last completed touch point, stop/resume. */
export function expiryReferenceMs(lead: Lead): number {
  const stamps = [lead.assignedAt, lead.lastActivityAt]
    .filter((x): x is string => !!x).map(x => new Date(x).getTime());
  for (const tp of lead.touchPoints) if (tp.status === 'completed' && tp.completedAt) stamps.push(new Date(tp.completedAt).getTime());
  return Math.max(...stamps.filter(n => !isNaN(n)));
}

/** Whole days left before the lead leaves the queue (0 = today). */
export const daysUntilExpiry = (lead: Lead, now: number = Date.now()) =>
  Math.max(0, Math.ceil((expiryReferenceMs(lead) + LEAD_EXPIRY_DAYS * 86400000 - now) / 86400000));

// ---------------------------------------------------------------------------
// Meetings / templates helpers
// ---------------------------------------------------------------------------
/** Local YYYY-MM-DD (matches what the date input stores in Meeting.date). */
export const localDay = (d: Date | number = Date.now()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const meetingStartMs = (m: Pick<Meeting, 'date' | 'time'>) => new Date(`${m.date}T${m.time}:00`).getTime();

/** Fills [Name], [Company Name] and [Agent Name] in an email template. */
export const fillTemplate = (text: string, lead: Lead, agentName: string) => text
  .replace(/\[Name\]/g, lead.contactName || 'there')
  .replace(/\[Company Name\]/g, lead.companyName)
  .replace(/\[Agent Name\]/g, agentName);

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
