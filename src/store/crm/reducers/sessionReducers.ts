/** Who is signed in, applying data saved by another browser tab, and resetting to the demo data. */
import type { PayloadAction } from '@reduxjs/toolkit';
import { createInitialState } from '@/store/seed/createInitialState';
import type { AppState } from '@/store/state/AppState';

export const sessionReducers = {
  setCurrentUser(state: AppState, a: PayloadAction<string>) { state.currentUserId = a.payload; },
  /** Another browser tab saved newer data: take it, but keep THIS tab's logged-in user. */
  applyStateFromOtherTab(state: AppState, a: PayloadAction<AppState>) { return { ...a.payload, currentUserId: state.currentUserId }; },
  resetToSeedData() { return createInitialState(); },
};
