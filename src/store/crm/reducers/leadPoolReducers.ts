/** The shared pool: the Admin adds leads, an agent takes them. */
import type { PayloadAction } from '@reduxjs/toolkit';
import { normalizeLeadCode } from '@/domain/lead/leadCode';
import { dropTakenLeadCodes } from '@/domain/lead/leadImport';
import { isInPool } from '@/domain/lead/leadPool';
import type { Lead, LeadAssignment } from '@/domain/types';
import { findCurrentUser, findLeadById, leadsHoldingTheirCode } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import type { AppState } from '@/store/state/AppState';

export const leadPoolReducers = {
  // Only the Admin creates leads. They go to the shared pool (no agent) and wait until an agent takes them.
  // An id that already exists ANYWHERE (an agent's lead, a pool lead, a removed lead that is back in the pool) is ignored.
  addLeadsToPool(state: AppState, a: PayloadAction<Lead[]>) {
    if (findCurrentUser(state)?.role !== 'admin') return;
    const ok = dropTakenLeadCodes(a.payload, state.leads).map(l => ({
      ...l, agentId: '', touchPoints: [], currentTouchPoint: -1, callLogs: [], status: 'new' as const,
      stopped: false, removedFromQueue: false, removedAt: null, expiredAt: null,
    }));
    if (ok.length) state.leads.unshift(...ok);
  },
  /**
   * The Admin deletes leads for good (from the pool or from an agent). Their arranged meetings are cancelled.
   * A lead with a recorded sale is kept: the sale points at it and the reports would be left dangling.
   */
  deleteLeadsAsAdmin(state: AppState, a: PayloadAction<string[]>) {
    if (findCurrentUser(state)?.role !== 'admin') return;
    const sold = new Set(state.sales.map(s => s.leadId));
    const doomed = new Set(a.payload.filter(id => !sold.has(id)));
    if (!doomed.size) return;
    state.leads = state.leads.filter(l => !doomed.has(l.id));
    state.meetings.forEach(m => {
      if (m.leadId && doomed.has(m.leadId) && m.status === 'arranged') m.status = 'cancelled';
    });
  },
  /**
   * An agent takes leads from the pool. Each lead becomes theirs and its workflow starts in their work queue.
   * A lead the previous agent removed comes back as a new round (the old touch points are archived, nothing is lost).
   * Re-checked here: it must still be in the pool, so two agents can never end up with the same id.
   */
  takeLeadsFromPool(state: AppState, a: PayloadAction<string[]>) {
    const actor = findCurrentUser(state);
    if (!actor || actor.role !== 'agent') return;
    const now = new Date().toISOString();
    const taken = new Set(leadsHoldingTheirCode(state).filter(l => l.agentId).map(l => normalizeLeadCode(l.leadCode)));
    for (const id of new Set(a.payload)) {
      const l = findLeadById(state, id);
      if (!l || !isInPool(l)) continue;
      const key = normalizeLeadCode(l.leadCode);
      if (taken.has(key)) continue;                                   // somebody else already holds this id
      const wf = state.workflows.find(w => w.campaignCode === l.campaignCode);
      if (!wf) continue;                                              // no workflow for its campaign: nothing to start

      const firstTime = !l.agentId;
      const previousAgent = state.users.find(u => u.id === l.agentId);
      if (!firstTime) {
        // a returning lead: freeze the old agent's touch points, then start a new round
        const round = l.round ?? 1;
        const archived: LeadAssignment = {
          round, agentId: l.agentId, agentName: previousAgent?.name || '',
          assignedAt: l.assignedAt, endedAt: l.removedAt ?? now,
          endedBy: l.agentId, endedByName: previousAgent?.name || '',
          touchPoints: JSON.parse(JSON.stringify(l.touchPoints)),
        };
        l.previousAssignments = [...(l.previousAssignments ?? []), archived];
        l.round = round + 1;
      } else {
        l.round = l.round ?? 1;
      }

      l.agentId = actor.id;
      l.assignedAt = now;
      l.touchPoints = wf.touchPoints.map(tp => ({
        order: tp.order, type: tp.type, label: tp.label, dayOffset: tp.dayOffset,
        status: 'pending' as const, completedAt: null,
        dueDate: tp.order === 0 ? now : new Date(Date.now() + tp.dayOffset * 86400000).toISOString(),
      }));
      l.currentTouchPoint = 0;
      l.status = 'new';
      l.stopped = false;
      l.removedFromQueue = false;
      l.removedAt = null;
      l.expiredAt = null;
      l.discoveryReached = false;
      l.lastActivityAt = now;
      l.history.push(createUserHistoryEntry(
        state, l, 'taken_from_pool',
        firstTime ? `Taken from the pool by ${actor.name}` : `Taken again from the pool by ${actor.name} (round ${l.round})`,
      ));
      taken.add(key);
    }
  },
};
