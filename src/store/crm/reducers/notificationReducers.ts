/** Notifications. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

export const notificationReducers = {
  markNotificationRead(state: AppState, a: PayloadAction<string>) {
    const n = state.notifications.find(x => x.id === a.payload);
    if (n) n.read = true;
  },
  markAllNotificationsRead(state: AppState) { state.notifications.forEach(n => { n.read = true; }); },
  addNotification(state: AppState, a: PayloadAction<Notification>) { state.notifications.unshift(a.payload); },
};
