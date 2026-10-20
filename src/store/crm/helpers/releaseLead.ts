/** Sending a lead back to the shared pool (its id is free again, its history stays). */
import type { Lead } from '@/domain/types';
import { createSystemHistoryEntry } from '@/store/crm/helpers/leadHistory';
import type { AppState } from '@/store/state/AppState';

/**
 * The lead leaves its agent's workflow and goes back to the shared pool - the same state as when the agent removes it:
 * `removedFromQueue` = true frees the id. The touch points, calls and history stay on the lead (the next agent who takes
 * it archives them as the previous round), and `agentId` keeps pointing at the last agent so the pool knows who worked on it.
 */
export function releaseLeadToPool(state: AppState, lead: Lead, now: number, action: 'workflow_finished' | 'expired_15_days', detail: string) {
  const iso = new Date(now).toISOString();
  lead.removedFromQueue = true;
  lead.removedAt = iso;
  lead.stopped = true;
  lead.history.push(createSystemHistoryEntry(lead, action, detail));
  if (lead.agentId) {
    state.notifications.unshift({
      id: crypto.randomUUID(), type: 'overdue', title: 'Lead left your queue',
      message: `${lead.companyName}: ${detail}`, timestamp: iso, read: false, leadId: lead.id, userId: lead.agentId,
    });
  }
}

/** A lead with a recorded sale is never released: the sale and the reports point at it. */
export const hasRecordedSale = (state: AppState, lead: Lead) => state.sales.some(s => s.leadId === lead.id);
