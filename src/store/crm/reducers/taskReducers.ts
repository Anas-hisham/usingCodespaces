/** Tasks assigned by managers. */
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Task } from '@/domain/types';
import { notifyUser } from '@/store/crm/helpers/notify';
import type { AppState } from '@/store/state/AppState';

export const taskReducers = {
  createTask(state: AppState, a: PayloadAction<Task>) {
    const task = { ...a.payload, completedBy: [], seenBy: [a.payload.authorId] };
    state.tasks.unshift(task);
    for (const id of task.assignedTo) {
      notifyUser(state, id, task.authorId, { type: 'task', title: 'New task', message: `${task.authorName} assigned you: ${task.title}` });
    }
  },
  toggleTaskCompletion(state: AppState, a: PayloadAction<{ taskId: string; userId: string }>) {
    const t = state.tasks.find(x => x.id === a.payload.taskId); if (!t) return;
    t.completedBy = t.completedBy.includes(a.payload.userId)
      ? t.completedBy.filter(id => id !== a.payload.userId)
      : [...t.completedBy, a.payload.userId];
  },
  /** The person opened the Tasks page: the number next to it goes away. */
  markTasksSeen(state: AppState, a: PayloadAction<string>) {
    for (const t of state.tasks) if (!t.seenBy.includes(a.payload)) t.seenBy.push(a.payload);
  },
};
