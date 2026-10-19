/** The 15-day rule: when does a lead without progress leave the agent's queue. */
import type { Lead } from '@/domain/types';
import { LEAD_EXPIRY_DAYS } from '@/domain/workflow/workflowRules';

// ---------------------------------------------------------------------------
// 15-day rule
// ---------------------------------------------------------------------------
/** The moment the 15 days are counted from: the latest of assignment, last completed touch point, stop/resume. */
export function expiryReferenceMs(lead: Lead): number {
  const stamps = [lead.assignedAt, lead.lastActivityAt]
    .filter((x): x is string => !!x).map(x => new Date(x).getTime());
  for (const tp of lead.touchPoints) if (tp.status === 'completed' && tp.completedAt) stamps.push(new Date(tp.completedAt).getTime());
  return Math.max(...stamps.filter(n => !isNaN(n)));
}

/** Whole days left before the lead leaves the queue (0 = today). */
export const daysUntilExpiry = (lead: Lead, now: number = Date.now()) =>
  Math.max(0, Math.ceil((expiryReferenceMs(lead) + LEAD_EXPIRY_DAYS * 86400000 - now) / 86400000));
