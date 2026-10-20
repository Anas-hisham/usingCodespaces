/** Who an update is addressed to. The author is never a recipient of his own update. */
import type { Team, TeamUpdate, User } from '@/domain/types';

export function updateRecipients(update: Pick<TeamUpdate, 'audience' | 'teamId' | 'authorId'>, users: User[], teams: Team[]): User[] {
  const pool = (() => {
    switch (update.audience) {
      case 'all': return users.filter(u => u.role === 'team_leader' || u.role === 'agent' || u.role === 'quality');
      case 'team_leaders': return users.filter(u => u.role === 'team_leader');
      case 'quality': return users.filter(u => u.role === 'quality');
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
  if (me.role === 'operation_manager') return true;          // the OM follows everything that is announced
  return updateRecipients(update, users, teams).some(u => u.id === me.id);
}
