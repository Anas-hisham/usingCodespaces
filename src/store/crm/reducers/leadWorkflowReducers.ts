/** Stopping, resuming, removing and deleting a lead. */
import type { PayloadAction } from '@reduxjs/toolkit';
import { findLeadById, isOwnedByCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import { pointLeadAtFirstOpenTouchPoint } from '@/store/crm/helpers/touchPointScheduling';
import type { AppState } from '@/store/state/AppState';

export const leadWorkflowReducers = {
  stopLeadWorkflow(state: AppState, a: PayloadAction<string>) {
    const l = findLeadById(state, a.payload); if (!l || !isOwnedByCurrentUser(state, l) || l.stopped || l.removedFromQueue) return;
    l.stopped = true;
    l.lastActivityAt = new Date().toISOString();
    l.history.push(createUserHistoryEntry(state, l, 'workflow_stopped'));
  },
  resumeLeadWorkflow(state: AppState, a: PayloadAction<string>) {
    const l = findLeadById(state, a.payload);
    if (!l || !isOwnedByCurrentUser(state, l) || !l.stopped || l.expiredAt || l.removedFromQueue) return;   // an expired lead is brought back only by a transfer
    l.stopped = false;
    l.lastActivityAt = new Date().toISOString();
    pointLeadAtFirstOpenTouchPoint(l);
    l.history.push(createUserHistoryEntry(state, l, 'workflow_resumed'));
  },
  removeLeadFromAgentQueue(state: AppState, a: PayloadAction<string>) {
    const l = findLeadById(state, a.payload); if (!l || !isOwnedByCurrentUser(state, l) || l.removedFromQueue) return;
    l.removedFromQueue = true;
    l.removedAt = new Date().toISOString();
    l.stopped = true;   // it will not continue its steps
    l.history.push(createUserHistoryEntry(state, l, 'removed_from_queue', 'Removed from the agent\'s leads - history kept, the lead is back in the shared pool and its id is free'));
  },
  /** Permanently deletes the lead. Its arranged meetings are cancelled so the calendar has no dangling links. */
  deleteLeadPermanently(state: AppState, a: PayloadAction<string>) {
    const target = findLeadById(state, a.payload);
    if (!target || !isOwnedByCurrentUser(state, target)) return;
    // A recorded sale points at its lead: deleting the lead would leave the sale (and the reports) dangling.
    if (state.sales.some(x => x.leadId === a.payload)) return;
    state.leads = state.leads.filter(l => l.id !== a.payload);
    state.meetings.forEach(m => {
      if (m.leadId === a.payload && m.status === 'arranged') m.status = 'cancelled';
    });
  },
};
