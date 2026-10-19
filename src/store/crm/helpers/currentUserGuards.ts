/** Who is acting, and who may touch which lead (the UI hides buttons, but the store enforces it too). */
import type { Lead } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

// ----- who may do what (the UI hides buttons, but the store must enforce it too) -----
export const findCurrentUser = (state: AppState) => state.users.find(u => u.id === state.currentUserId);

/** Workflow actions on a lead (calls, emails, skip, stop...) belong to the agent who owns the lead. */
export const isOwnedByCurrentUser = (state: AppState, lead: Lead) => !!state.currentUserId && lead.agentId === state.currentUserId;

/** Leads that still HOLD their lead id. A removed lead keeps its history but frees the id, so anyone can take it again. */
export const leadsHoldingTheirCode = (state: AppState) => state.leads.filter(l => !l.removedFromQueue);

/** A lead the agent can still work on. */
export const isLeadWorkable = (lead: Lead) => !lead.stopped && !lead.removedFromQueue && !lead.expiredAt;

export const findLeadById = (state: AppState, id: string) => state.leads.find(l => l.id === id);
