/** Transferring a lead to another agent (starts a new round). */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { LeadAssignment } from '@/domain/types';
import { findCurrentUser, findLeadById } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import type { AppState } from '@/store/state/AppState';

export const leadTransferReducers = {
  transferLeadToAgent(state: AppState, a: PayloadAction<{ leadId: string; newAgentId: string }>) {
    const l = findLeadById(state, a.payload.leadId);
    if (!l || l.removedFromQueue || l.agentId === a.payload.newAgentId) return;   // a removed lead stays archived, it is never brought back
    const actor = findCurrentUser(state);
    const newAgent = state.users.find(u => u.id === a.payload.newAgentId);
    if (!actor || !newAgent || newAgent.role !== 'agent') return;     // a lead can only go to an agent
    // only the Operation Manager, or the Team Leader of the agent who holds the lead, may reassign it
    const allowed = actor.role === 'operation_manager'
      || (actor.role === 'team_leader' && state.teams.some(t => t.leaderId === actor.id && t.agentIds.includes(l.agentId)));
    if (!allowed) return;
    const wf = state.workflows.find(w => w.campaignCode === l.campaignCode);
    const oldAgent = state.users.find(u => u.id === l.agentId);
    const now = new Date().toISOString();
    const round = l.round ?? 1;

    // 1) Freeze the old agent's touch points - they are NEVER deleted.
    const archived: LeadAssignment = {
      round, agentId: l.agentId, agentName: oldAgent?.name || '',
      assignedAt: l.assignedAt, endedAt: now,
      endedBy: state.currentUserId, endedByName: actor?.name || '',
      touchPoints: JSON.parse(JSON.stringify(l.touchPoints)),
    };

    // 2) The new agent starts a fresh copy of the workflow.
    const template = wf ? wf.touchPoints : l.touchPoints;
    const doneCount = l.touchPoints.filter(tp => tp.status === 'completed').length;
    const total = l.touchPoints.length;
    const fromAgentId = l.agentId;
    l.touchPoints = template.map(tp => ({
      order: tp.order, type: tp.type, label: tp.label, dayOffset: tp.dayOffset,
      status: 'pending' as const, completedAt: null,
      dueDate: tp.order === 0 ? now : new Date(Date.now() + tp.dayOffset * 86400000).toISOString(),
    }));
    l.agentId = a.payload.newAgentId;
    l.assignedAt = now;
    l.currentTouchPoint = 0;
    l.status = 'new';
    l.stopped = false;
    l.removedFromQueue = false;
    l.removedAt = null;
    l.round = round + 1;
    l.expiredAt = null;
    l.discoveryReached = false;
    l.lastActivityAt = now;
    l.previousAssignments = [...(l.previousAssignments ?? []), archived];
    l.history.push(createUserHistoryEntry(
      state, l, 'transfer',
      `Transferred from ${oldAgent?.name} to ${newAgent?.name} (round ${round}: ${doneCount}/${total} touch points were completed)`,
      undefined,
      { fromAgentId, toAgentId: a.payload.newAgentId, fromRound: round, toRound: round + 1, completedTouchPoints: doneCount, totalTouchPoints: total },
    ));
  },
};
