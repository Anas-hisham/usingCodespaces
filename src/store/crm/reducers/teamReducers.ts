/** Moving an agent from one team to another (Operation Manager only). */
import type { PayloadAction } from '@reduxjs/toolkit';
import { findCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import type { AppState } from '@/store/state/AppState';

export const teamReducers = {
  /**
   * The agent changes team (and so Team Leader). ONLY the team membership changes:
   * the agent's leads, call logs, touch points, meetings, emails and sales are not touched, so nothing is lost
   * and the agent simply continues with the same work under the new Team Leader.
   */
  moveAgentToTeam(state: AppState, a: PayloadAction<{ agentId: string; toTeamId: string }>) {
    const actor = findCurrentUser(state);
    if (!actor || actor.role !== 'operation_manager') return;
    const agent = state.users.find(u => u.id === a.payload.agentId && u.role === 'agent');
    const to = state.teams.find(t => t.id === a.payload.toTeamId);
    if (!agent || !to || to.managerId !== actor.id) return;                    // only into a team this manager runs
    const from = state.teams.find(t => t.agentIds.includes(agent.id));
    if (from && from.managerId !== actor.id) return;                           // and only out of a team this manager runs
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
  },
};
