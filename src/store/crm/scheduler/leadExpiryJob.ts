/** Job: the 15-day rule. */
import { meetingStartMs } from '@/domain/meeting/meetingTime';
import { expiryReferenceMs } from '@/domain/workflow/leadExpiry';
import { isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { LEAD_EXPIRY_DAYS } from '@/domain/workflow/workflowRules';
import { localDay } from '@/shared/lib/dates';
import { createSystemHistoryEntry } from '@/store/crm/helpers/leadHistory';
import type { AppState } from '@/store/state/AppState';

/** 15-day rule: no progress (same touch point or stopped) for 15 calendar days -> out of the queue, TL reassigns. */
export function runLeadExpiryJob(state: AppState, now: number) {
  const today = localDay(now);
  for (const l of state.leads) {
    if (l.expiredAt || l.removedFromQueue) continue;
    if (!l.stopped && !l.touchPoints.some(isOpenTouchPoint)) continue;                    // finished workflow
    if (state.meetings.some(m => m.leadId === l.id && m.status === 'arranged' && m.date >= today)) continue; // paused by a meeting
    // a meeting day counts as activity, so the clock never expires a lead right after its meeting
    const lastMeetingMs = Math.max(0, ...state.meetings.filter(m => m.leadId === l.id).map(meetingStartMs).filter(n => !isNaN(n)));
    if (now - Math.max(expiryReferenceMs(l), lastMeetingMs) < LEAD_EXPIRY_DAYS * 86400000) continue;
    l.expiredAt = new Date(now).toISOString();
    const agent = state.users.find(u => u.id === l.agentId);
    l.history.push(createSystemHistoryEntry(l, 'expired_15_days', `No progress for ${LEAD_EXPIRY_DAYS} days - removed from ${agent?.name ?? 'the agent'}'s queue, waiting for the Team Leader to reassign`));
  }
}
