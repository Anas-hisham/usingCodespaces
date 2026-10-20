/** Puts a notification in somebody's bell. Never call it for the person who did the action himself. */
import type { Notification } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

export function notifyUser(
  state: AppState, userId: string, actorId: string,
  n: Pick<Notification, 'type' | 'title' | 'message'> & Partial<Pick<Notification, 'leadId' | 'meetingId'>>,
) {
  if (!userId || userId === actorId) return;
  state.notifications.unshift({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false, ...n, userId });
}
