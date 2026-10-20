/** Escalations: raising one, passing it up, closing it. The store re-checks every rule of escalationRules. */
import type { PayloadAction } from '@reduxjs/toolkit';
import { escalationRecipients, forwardTargets } from '@/domain/escalation/escalationRules';
import type { Escalation, EscalationStep } from '@/domain/types';
import { findCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { notifyUser } from '@/store/crm/helpers/notify';
import type { AppState } from '@/store/state/AppState';

const step = (by: { id: string; name: string }, action: EscalationStep['action'], to?: { id: string; name: string }, note?: string): EscalationStep => ({
  id: crypto.randomUUID(), at: new Date().toISOString(), byId: by.id, byName: by.name, action,
  ...(to ? { toId: to.id, toName: to.name } : {}), ...(note ? { note } : {}),
});

export const escalationReducers = {
  createEscalation(state: AppState, a: PayloadAction<{ aboutId: string; recipientId: string; title: string; details: string }>) {
    const me = findCurrentUser(state);
    if (!me) return;
    const title = a.payload.title.trim(), details = a.payload.details.trim();
    if (!title || !details) return;
    const subject = state.users.find(u => u.id === a.payload.aboutId);
    const to = subject ? escalationRecipients(state.users, state.teams, me, subject).find(r => r.user.id === a.payload.recipientId)?.user : undefined;
    if (!subject || !to) return;                                       // this person may not escalate that one to that one
    const e: Escalation = {
      id: crypto.randomUUID(), createdAt: new Date().toISOString(), authorId: me.id, authorName: me.name,
      aboutId: subject.id, aboutName: subject.name, title, details,
      handlerId: to.id, status: 'open', steps: [step(me, 'created', to)],
    };
    state.escalations.unshift(e);
    notifyUser(state, to.id, me.id, { type: 'escalation', title: 'New escalation for you', message: `${me.name}: ${title}` });
  },

  /** The person who holds it passes it up (Team Leader -> Operation Manager or Admin, Operation Manager -> Admin). */
  forwardEscalation(state: AppState, a: PayloadAction<{ id: string; toId: string; note: string }>) {
    const me = findCurrentUser(state);
    const e = state.escalations.find(x => x.id === a.payload.id);
    if (!me || !e || e.status !== 'open' || e.handlerId !== me.id) return;
    const to = forwardTargets(state.users, state.teams, me, e).find(u => u.id === a.payload.toId);
    if (!to) return;
    e.steps.push(step(me, 'forwarded', to, a.payload.note.trim() || undefined));
    e.handlerId = to.id;
    notifyUser(state, to.id, me.id, { type: 'escalation', title: 'Escalation passed to you', message: `${e.title} (from ${e.authorName})` });
    notifyUser(state, e.authorId, me.id, { type: 'escalation', title: 'Your escalation was passed up', message: `${me.name} sent “${e.title}” to ${to.name}.` });
  },

  resolveEscalation(state: AppState, a: PayloadAction<{ id: string; note: string }>) {
    const me = findCurrentUser(state);
    const e = state.escalations.find(x => x.id === a.payload.id);
    if (!me || !e || e.status !== 'open' || e.handlerId !== me.id) return;
    e.steps.push(step(me, 'resolved', undefined, a.payload.note.trim() || undefined));
    e.status = 'resolved';
    notifyUser(state, e.authorId, me.id, { type: 'escalation', title: 'Your escalation was resolved', message: `${me.name} closed “${e.title}”.` });
  },
};

