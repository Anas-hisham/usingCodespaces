/** Advice from Quality to agents (not tasks: the agent only reads it and presses "Got it"). */
import type { PayloadAction } from '@reduxjs/toolkit';
import { findCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { notifyUser } from '@/store/crm/helpers/notify';
import type { AppState } from '@/store/state/AppState';

export const tipReducers = {
  /** One tip per selected agent, so each agent can acknowledge his own copy. Quality only. */
  sendTips(state: AppState, a: PayloadAction<{ agentIds: string[]; title: string; content: string }>) {
    const actor = findCurrentUser(state);
    if (!actor || actor.role !== 'quality') return;
    const title = a.payload.title.trim(); const content = a.payload.content.trim();
    if (!title || !content) return;
    const now = new Date().toISOString();
    for (const agentId of new Set(a.payload.agentIds)) {
      if (!state.users.some(u => u.id === agentId && u.role === 'agent' && u.qualityId === actor.id)) continue;   // only the agents it follows
      state.tips.unshift({ id: crypto.randomUUID(), authorId: actor.id, authorName: actor.name, agentId, title, content, createdAt: now, acknowledgedAt: null, seenBy: [actor.id] });
      notifyUser(state, agentId, actor.id, { type: 'tip', title: 'New tip from Quality', message: title });
    }
  },
  acknowledgeTip(state: AppState, a: PayloadAction<string>) {
    const t = state.tips.find(x => x.id === a.payload);
    if (t && t.agentId === state.currentUserId && !t.acknowledgedAt) t.acknowledgedAt = new Date().toISOString();
  },
  markTipsSeen(state: AppState, a: PayloadAction<string>) {
    for (const t of state.tips) if (!t.seenBy.includes(a.payload)) t.seenBy.push(a.payload);
  },
};
