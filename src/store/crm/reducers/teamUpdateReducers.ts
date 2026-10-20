/** Team updates (announcements): posting, acknowledging, and clearing the number next to the page. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TeamUpdate } from '@/domain/types';
import { updateRecipients } from '@/domain/updates/updateRecipients';
import { notifyUser } from '@/store/crm/helpers/notify';
import type { AppState } from '@/store/state/AppState';

export const teamUpdateReducers = {
  postTeamUpdate(state: AppState, a: PayloadAction<TeamUpdate>) {
    const update = { ...a.payload, acknowledgedBy: [], seenBy: [a.payload.authorId] };
    state.updates.unshift(update);
    // each recipient gets his own notification; the author gets none (he wrote it, he knows)
    for (const r of updateRecipients(update, state.users, state.teams)) {
      notifyUser(state, r.id, update.authorId, { type: 'update', title: 'New update', message: `${update.authorName} posted: ${update.title}` });
    }
  },
  acknowledgeTeamUpdate(state: AppState, a: PayloadAction<{ updateId: string; userId: string }>) {
    const u = state.updates.find(x => x.id === a.payload.updateId);
    if (u && !u.acknowledgedBy.includes(a.payload.userId)) u.acknowledgedBy.push(a.payload.userId);
  },
  /** The person opened the Updates page: the number next to it goes away (the bell notifications stay until "Mark read"). */
  markUpdatesSeen(state: AppState, a: PayloadAction<string>) {
    for (const u of state.updates) if (!u.seenBy.includes(a.payload)) u.seenBy.push(a.payload);
  },
};
