/** The numbers next to the menu items. A number means "new since you last opened that page", nothing else. */
import { updateRecipients } from '@/domain/updates/updateRecipients';
import type { PageId } from '@/app/navigation';
import type { User } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

export function navBadges(state: AppState, me: User): Partial<Record<PageId, number>> {
  // only updates addressed to ME count (the author, and a manager who merely follows an update, get no number)
  const updates = state.updates.filter(u => !u.seenBy.includes(me.id) && updateRecipients(u, state.users, state.teams).some(r => r.id === me.id)).length;
  const tasks = state.tasks.filter(t => t.authorId !== me.id && t.assignedTo.includes(me.id) && !t.seenBy.includes(me.id)).length;
  const tips = me.role === 'agent' ? state.tips.filter(t => t.agentId === me.id && !t.seenBy.includes(me.id)).length : 0;
  // escalations waiting for ME to act on
  const escalations = state.escalations.filter(e => e.status === 'open' && e.handlerId === me.id).length;
  return { updates, tasks, tips, escalations };
}
