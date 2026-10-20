/** Teams and who follows whom (all Admin only): moving agents, the Admin moving a team between managers, the Admin changing an agent's Quality. */
import type { PayloadAction } from '@reduxjs/toolkit';
import { lobOf, qualityChoicesFor } from '@/domain/org/orgRules';
import type { User } from '@/domain/types';
import { findCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import type { AppState } from '@/store/state/AppState';

const addNote = (state: AppState, userId: string, title: string, message: string) => {
  if (!userId) return;
  state.notifications.unshift({ id: crypto.randomUUID(), type: 'update', title, message, timestamp: new Date().toISOString(), read: false, userId });
};

/** An agent's Quality must be of the agent's own LOB. After a team / manager change, a Quality of another LOB is dropped. */
function dropQualityOfOtherLob(state: AppState, agents: User[]) {
  for (const agent of agents) {
    const q = state.users.find(u => u.id === agent.qualityId);
    const lob = lobOf(state.users, state.teams, agent);
    if (!q || !lob || q.lob === lob) continue;
    agent.qualityId = undefined;
    addNote(state, agent.id, 'Your Quality changed', `${q.name} is in another line of business (${q.lob ?? '—'}). The Admin will give you a new Quality.`);
    addNote(state, q.id, 'An agent left your agents', `${agent.name} moved to the ${lob} line of business.`);
  }
}

export const teamReducers = {
  /**
   * Admin only: the agent changes team (and so Team Leader). ONLY the team membership changes:
   * the agent's leads, call logs, touch points, meetings, emails and sales are not touched, so nothing is lost
   * and the agent simply continues with the same work under the new Team Leader.
   */
  moveAgentToTeam(state: AppState, a: PayloadAction<{ agentId: string; toTeamId: string }>) {
    if (findCurrentUser(state)?.role !== 'admin') return;                      // Admin only: an Operation Manager can no longer move agents
    const agent = state.users.find(u => u.id === a.payload.agentId && u.role === 'agent');
    const to = state.teams.find(t => t.id === a.payload.toTeamId);
    if (!agent || !to) return;
    const from = state.teams.find(t => t.agentIds.includes(agent.id));
    if (from?.id === to.id) return;

    state.teams.forEach(t => { t.agentIds = t.agentIds.filter(id => id !== agent.id); });
    to.agentIds.push(agent.id);
    agent.teamId = to.id;

    const now = new Date().toISOString();
    const note = (userId: string, title: string, message: string) =>
      state.notifications.unshift({ id: crypto.randomUUID(), type: 'update', title, message, timestamp: now, read: false, userId });
    note(agent.id, 'You moved to a new team', `You are now in ${to.name}${from ? ` (was ${from.name})` : ''}. Your leads and history stay with you.`);
    note(to.leaderId, 'New agent in your team', `${agent.name} joined ${to.name}${from ? ` from ${from.name}` : ''}.`);
    if (from) note(from.leaderId, 'An agent left your team', `${agent.name} moved from ${from.name} to ${to.name}.`);
    dropQualityOfOtherLob(state, [agent]);
  },

  /** Admin only: give a team to another Operation Manager (managerId = his id), or take it away from its manager (managerId = ''). */
  assignTeamToManager(state: AppState, a: PayloadAction<{ teamId: string; managerId: string }>) {
    if (findCurrentUser(state)?.role !== 'admin') return;
    const team = state.teams.find(t => t.id === a.payload.teamId);
    if (!team || team.managerId === a.payload.managerId) return;
    const newManager = a.payload.managerId ? state.users.find(u => u.id === a.payload.managerId && u.role === 'operation_manager') : undefined;
    if (a.payload.managerId && !newManager) return;
    const old = team.managerId;
    team.managerId = newManager?.id ?? '';
    if (old) addNote(state, old, 'A team left your management', `${team.name} is no longer one of your teams.`);
    if (newManager) addNote(state, newManager.id, 'A team joined your management', `${team.name} is now one of your teams (${newManager.lob ?? 'no LOB'}).`);
    addNote(state, team.leaderId, 'Your team has a new manager', newManager ? `${team.name} now reports to ${newManager.name}.` : `${team.name} has no Operation Manager for now.`);
    dropQualityOfOtherLob(state, state.users.filter(u => team.agentIds.includes(u.id)));
  },

  /** Admin only: give an agent another Quality (always one of the agent's own LOB), or none (qualityId = ''). */
  setAgentQuality(state: AppState, a: PayloadAction<{ agentId: string; qualityId: string }>) {
    if (findCurrentUser(state)?.role !== 'admin') return;
    const agent = state.users.find(u => u.id === a.payload.agentId && u.role === 'agent');
    if (!agent) return;
    const q = a.payload.qualityId ? qualityChoicesFor(state.users, state.teams, agent).find(u => u.id === a.payload.qualityId) : undefined;
    if (a.payload.qualityId && !q) return;                                     // other LOB (or not a Quality): refused
    const before = state.users.find(u => u.id === agent.qualityId);
    if ((before?.id ?? '') === (q?.id ?? '')) return;
    agent.qualityId = q?.id;
    addNote(state, agent.id, 'Your Quality changed', q ? `${q.name} follows you now${before ? ` (was ${before.name})` : ''}.` : 'You have no Quality for now.');
    if (q) addNote(state, q.id, 'New agent to follow', `${agent.name} is one of your agents now.`);
    if (before) addNote(state, before.id, 'An agent left your agents', `${agent.name} is now followed by ${q?.name ?? 'nobody'}.`);
  },
};
