/** Tasks assigned by managers. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

export const taskReducers = {
  createTask(state: AppState, a: PayloadAction<Task>) { state.tasks.unshift(a.payload); },
  toggleTaskCompletion(state: AppState, a: PayloadAction<{ taskId: string; userId: string }>) {
    const t = state.tasks.find(x => x.id === a.payload.taskId); if (!t) return;
    t.completedBy = t.completedBy.includes(a.payload.userId)
      ? t.completedBy.filter(id => id !== a.payload.userId)
      : [...t.completedBy, a.payload.userId];
  },
};
