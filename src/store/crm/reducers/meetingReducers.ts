/** Creating and updating meetings. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Meeting } from '@/domain/types';
import { findLeadById } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import { notifyUser } from '@/store/crm/helpers/notify';
import type { AppState } from '@/store/state/AppState';

export const meetingReducers = {
  createMeeting(state: AppState, a: PayloadAction<Meeting>) {
    state.meetings.push(a.payload);
    // the people invited are told; the person who scheduled it is not (he knows)
    for (const id of new Set(a.payload.participantIds)) {
      notifyUser(state, id, a.payload.createdBy, {
        type: 'meeting', title: 'Meeting scheduled', message: `${a.payload.title} on ${a.payload.date} at ${a.payload.time}`,
        meetingId: a.payload.id, leadId: a.payload.leadId,
      });
    }
    const l = a.payload.leadId ? findLeadById(state, a.payload.leadId) : undefined;
    if (l) {
      // A meeting does NOT move the lead anywhere: the touch points stay exactly as they are and the lead is simply
      // a Discovery lead (the person was reached). The meeting itself lives in Calendar / "Arranged Meetings - Today".
      l.status = 'discovery';
      l.discoveryReached = true;
      l.lastActivityAt = new Date().toISOString();   // the 15-day count restarts (the expiry job also pauses while a meeting is ahead)
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
      l.lastActivityAt = new Date().toISOString();   // meeting is over: the 15-day count restarts, touch points untouched
    }
  },
};
