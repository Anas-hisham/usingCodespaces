/** Builds the rows of a lead's activity history (by a user, or by the system scheduler). */
import type { Lead, LeadHistoryEntry, TouchPoint } from '@/domain/types';
import type { AppState } from '@/store/state/AppState';

// Builds one history row: WHO, WHEN, which ROUND and (optionally) which touch point.
export function createUserHistoryEntry(
  state: AppState, lead: Lead, action: string, detail?: string,
  tp?: Pick<TouchPoint, 'order' | 'label' | 'type'>, meta?: Record<string, unknown>,
): LeadHistoryEntry {
  return {
    id: crypto.randomUUID(),
    action,
    timestamp: new Date().toISOString(),
    userId: state.currentUserId,
    userName: state.users.find(u => u.id === state.currentUserId)?.name || '',
    detail,
    round: lead.round ?? 1,
    agentId: lead.agentId,
    ...(tp ? { touchPointOrder: tp.order, touchPointLabel: tp.label, touchPointType: tp.type } : {}),
    ...(meta ? { meta } : {}),
  };
}

/** History row written by the scheduler (no logged-in user is acting). */
export function createSystemHistoryEntry(
  lead: Lead, action: string, detail?: string,
  tp?: Pick<TouchPoint, 'order' | 'label' | 'type'>, meta?: Record<string, unknown>,
): LeadHistoryEntry {
  return {
    id: crypto.randomUUID(), action, timestamp: new Date().toISOString(),
    userId: 'system', userName: 'System', detail,
    round: lead.round ?? 1, agentId: lead.agentId,
    ...(tp ? { touchPointOrder: tp.order, touchPointLabel: tp.label, touchPointType: tp.type } : {}),
    ...(meta ? { meta } : {}),
  };
}
