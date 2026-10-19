/** A lead leaves the Meeting section when its meeting is over. */
import type { Lead } from '@/domain/types';
import { highestCallType } from '@/domain/workflow/callClassification';
import { localDay } from '@/shared/lib/dates';
import { createSystemHistoryEntry, createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import type { AppState } from '@/store/state/AppState';

/**
 * A lead only stays in the "Meeting" section while it has an arranged meeting that is today or later.
 * When the meeting day is over (or the meeting was completed / cancelled / no-show / rescheduled and there is no
 * other one) the lead goes back to the Discovery queue. Safe to call repeatedly.
 */
export function returnLeadToQueueWhenMeetingEnds(state: AppState, lead: Lead, reason: string, byUser: boolean) {
  if (lead.status !== 'arranged_meeting') return;
  const today = localDay();
  const stillActive = state.meetings.some(m => m.leadId === lead.id && m.status === 'arranged' && m.date >= today);
  if (stillActive) return;
  lead.status = lead.discoveryReached ? 'discovery' : (highestCallType(lead) ?? 'new');
  lead.lastActivityAt = new Date().toISOString();   // the 15-day count starts again from here
  const detail = `${reason} - back in the Discovery queue`;
  lead.history.push(byUser ? createUserHistoryEntry(state, lead, 'meeting_ended', detail) : createSystemHistoryEntry(lead, 'meeting_ended', detail));
}
