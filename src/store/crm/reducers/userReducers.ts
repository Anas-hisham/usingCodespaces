/** Accounts: only the Admin creates people (Operation Manager, Quality, Team Leader with a new team, or an agent in a team). */
import type { PayloadAction } from '@reduxjs/toolkit';
import { lobOfTeam } from '@/domain/org/orgRules';
import { avatarColorFor, initialsOfName, qualityChoicesForTeam, usernameFromEmail, validateNewUser, type NewUserInput } from '@/domain/user/newUser';
import type { Team, User } from '@/domain/types';
import { findCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { notifyUser } from '@/store/crm/helpers/notify';
import type { AppState } from '@/store/state/AppState';

export const userReducers = {
  /** Admin only. Refused (nothing changes) when the same rules the form shows are not met. */
  createUser(state: AppState, a: PayloadAction<NewUserInput>) {
    const admin = findCurrentUser(state);
    if (admin?.role !== 'admin') return;
    const input = a.payload;
    if (validateNewUser(state.users, state.teams, input)) return;

    const id = `u-${crypto.randomUUID().slice(0, 8)}`;
    const name = input.name.trim().replace(/\s+/g, ' ');
    const user: User = {
      id, name, role: input.role,
      email: input.email.trim(),
      username: usernameFromEmail(state.users, input.email),
      password: input.password,
      initials: initialsOfName(name),
      color: avatarColorFor(state.users.length),
      dailyCallTarget: input.role === 'agent' ? input.dailyCallTarget : 0,
    };

    if (input.role === 'operation_manager' || input.role === 'quality') {
      user.lob = input.lob;
    } else if (input.role === 'team_leader') {
      const team: Team = { id: `t-${crypto.randomUUID().slice(0, 8)}`, name: input.teamName.trim(), leaderId: id, agentIds: [], managerId: input.managerId };
      user.teamId = team.id;
      state.teams.push(team);
      notifyUser(state, input.managerId, admin.id, { type: 'update', title: 'A team joined your management', message: `${team.name} (Team Leader: ${name}) is now one of your teams.` });
    } else {
      const team = state.teams.find(t => t.id === input.teamId)!;
      user.teamId = team.id;
      team.agentIds.push(id);
      // only a Quality of the team's own LOB is accepted (the validation above checked it)
      const quality = qualityChoicesForTeam(state.users, state.teams, team.id).find(q => q.id === input.qualityId);
      if (quality) user.qualityId = quality.id;
      notifyUser(state, team.leaderId, admin.id, { type: 'update', title: 'New agent in your team', message: `${name} joined ${team.name}${lobOfTeam(state.users, team) ? ` (${lobOfTeam(state.users, team)})` : ''}.` });
      if (quality) notifyUser(state, quality.id, admin.id, { type: 'update', title: 'New agent to follow', message: `${name} is one of your agents now.` });
    }
    state.users.push(user);
  },
};
