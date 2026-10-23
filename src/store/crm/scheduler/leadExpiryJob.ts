/** Jobs that take a lead out of the agent's workflow and free it: the 15-day rule, and a finished workflow. */
import { meetingStartMs } from '@/domain/meeting/meetingTime';
import { expiryReferenceMs } from '@/domain/workflow/leadExpiry';
import { isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { LEAD_EXPIRY_DAYS } from '@/domain/workflow/workflowRules';
import { localDay } from '@/shared/lib/dates';
import { hasRecordedSale, releaseLeadToPool } from '@/store/crm/helpers/releaseLead';
import type { AppState } from '@/store/state/AppState';

/** An arranged meeting that has not happened yet keeps the lead with its agent. */
const hasUpcomingMeeting = (state: AppState, leadId: string, today: string) =>
  state.meetings.some(m => m.leadId === leadId && m.status === 'arranged' && m.date >= today);

/**
 * 15-day rule: no progress (same touch point, or stopped) for 15 calendar days -> the lead leaves the agent's workflow
 * and is FREE: it goes back to the shared pool and any agent can take it.
 */
export function runLeadExpiryJob(state: AppState, now: number) {
  const today = localDay(now);
  for (const l of state.leads) {
    if (l.expiredAt || l.removedFromQueue || !l.agentId) continue;                         // already out of a queue (or never in one)
    if (!l.stopped && !l.touchPoints.some(isOpenTouchPoint)) continue;                    // finished workflow: the other job frees it
    if (hasUpcomingMeeting(state, l.id, today)) continue;                                  // paused by a meeting
    if (hasRecordedSale(state, l)) continue;
    // a meeting day counts as activity, so the clock never expires a lead right after its meeting
    const lastMeetingMs = Math.max(0, ...state.meetings.filter(m => m.leadId === l.id).map(meetingStartMs).filter(n => !isNaN(n)));
    if (now - Math.max(expiryReferenceMs(l), lastMeetingMs) < LEAD_EXPIRY_DAYS * 86400000) continue;
    const agent = state.users.find(u => u.id === l.agentId);
    releaseLeadToPool(state, l, now, 'expired_15_days',
      `No progress for ${LEAD_EXPIRY_DAYS} days - removed from ${agent?.name ?? 'the agent'}'s workflow, the lead is free in the pool`);
  }
}

/** All touch points are done (or skipped): the lead leaves the agent's workflow and is free in the pool. */
export function runWorkflowFinishedJob(state: AppState, now: number) {
  const today = localDay(now);
  for (const l of state.leads) {
    if (l.expiredAt || l.removedFromQueue || l.stopped || !l.agentId) continue;
    if (l.touchPoints.length === 0 || l.touchPoints.some(isOpenTouchPoint)) continue;     // not finished
    if (hasUpcomingMeeting(state, l.id, today)) continue;                                  // the meeting is still ahead: keep the lead
    if (hasRecordedSale(state, l)) continue;
    const agent = state.users.find(u => u.id === l.agentId);
    releaseLeadToPool(state, l, now, 'workflow_finished',
      `All ${l.touchPoints.length} touch points are finished - removed from ${agent?.name ?? 'the agent'}'s workflow, the lead is free in the pool`);
  }
}
