/** Creating and updating meetings. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Meeting } from '@/domain/types';
import { findLeadById } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import { returnLeadToQueueWhenMeetingEnds } from '@/store/crm/helpers/meetingState';
import type { AppState } from '@/store/state/AppState';

export const meetingReducers = {
  createMeeting(state: AppState, a: PayloadAction<Meeting>) {
    state.meetings.push(a.payload);
    const l = a.payload.leadId ? findLeadById(state, a.payload.leadId) : undefined;
    if (l) {
      l.status = 'arranged_meeting';
      l.discoveryReached = true;   // arranging a meeting means the person was reached
      l.history.push(createUserHistoryEntry(state, l, 'meeting_arranged', `${a.payload.date} at ${a.payload.time}`, undefined, { meetingId: a.payload.id }));
    }
  },
  updateMeeting(state: AppState, a: PayloadAction<{ meetingId: string; updates: Partial<Meeting> }>) {
    const m = state.meetings.find(x => x.id === a.payload.meetingId);
    if (!m) return;
    // Only the person who created the meeting can change it. Invited people can see it but not update it.
    if (m.createdBy !== state.currentUserId) return;
    // A meeting with a lead can only be completed together with a description of what happened
    const completingLeadMeeting = a.payload.updates.status === 'completed' && !!m.leadId;
    if (completingLeadMeeting && !(a.payload.updates.outcome ?? m.outcome ?? '').trim()) return;
    Object.assign(m, a.payload.updates);

    const status = a.payload.updates.status;
    const l = m.leadId ? findLeadById(state, m.leadId) : undefined;
    if (l && status && status !== 'arranged') {
      l.history.push(createUserHistoryEntry(state, l, `meeting_${status}`, status === 'completed' && m.outcome ? `${m.date} at ${m.time} - ${m.outcome}` : `${m.date} at ${m.time}`, undefined, { meetingId: m.id }));
      returnLeadToQueueWhenMeetingEnds(state, l, `Meeting ${status.replace('_', ' ')}`, true);
    }
  },
};
