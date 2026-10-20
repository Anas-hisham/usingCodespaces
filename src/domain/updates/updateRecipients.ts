/** Who an update is addressed to. The author is never a recipient of his own update. */
import { lobOf } from '@/domain/org/orgRules';
import type { Team, TeamUpdate, User } from '@/domain/types';

export function updateRecipients(update: Pick<TeamUpdate, 'audience' | 'teamId' | 'authorId'>, users: User[], teams: Team[]): User[] {
  // an Operation Manager runs one line of business: his updates reach the people of that LOB only
  const author = users.find(u => u.id === update.authorId);
  const lob = author?.role === 'operation_manager' ? author.lob ?? '' : '';
  const inScope = (u: User) => !lob || lobOf(users, teams, u) === lob;
  const pool = (() => {
    switch (update.audience) {
      case 'all': return users.filter(u => (u.role === 'team_leader' || u.role === 'agent' || u.role === 'quality') && inScope(u));
      case 'team_leaders': return users.filter(u => u.role === 'team_leader' && inScope(u));
      case 'quality': return users.filter(u => u.role === 'quality' && inScope(u));
      case 'specific_team': {
        const team = teams.find(t => t.id === update.teamId);
        return users.filter(u => !!team && team.agentIds.includes(u.id));
      }
    }
  })();
  return pool.filter(u => u.id !== update.authorId);
}

/** Is this update visible to this person (as a recipient or as the author)? */
export function canSeeUpdate(update: TeamUpdate, me: User, users: User[], teams: Team[]): boolean {
  if (update.authorId === me.id) return true;
  if (me.role === 'operation_manager') {                       // the OM follows everything announced in his line of business
    const author = users.find(u => u.id === update.authorId);
    return !me.lob || !author || lobOf(users, teams, author) === me.lob;
  }
  return updateRecipients(update, users, teams).some(u => u.id === me.id);
}
