/** Team updates (announcements) and their acknowledgement. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TeamUpdate } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

export const teamUpdateReducers = {
  postTeamUpdate(state: AppState, a: PayloadAction<TeamUpdate>) { state.updates.unshift(a.payload); },
  acknowledgeTeamUpdate(state: AppState, a: PayloadAction<{ updateId: string; userId: string }>) {
    const u = state.updates.find(x => x.id === a.payload.updateId);
    if (u && !u.acknowledgedBy.includes(a.payload.userId)) u.acknowledgedBy.push(a.payload.userId);
  },
};
