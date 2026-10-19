/** Turns the calls an agent logged into a lead status / queue category (discovery > lvm > nvm). */
import type { CallType, Lead } from '@/domain/types';

/** Call logs that belong to the lead's CURRENT round (a transfer starts a new round). */
export function currentRoundCalls(lead: Lead) {
  const round = lead.round ?? 1;
  return lead.callLogs.filter(cl => (cl.round ?? 1) === round);
}

const CALL_RANK: Record<CallType, number> = { discovery: 3, lvm: 2, nvm: 1 };

/** Best call result so far: discovery > lvm > nvm. null when no call was logged yet. */
export function highestCallType(lead: Lead): CallType | null {
  let best: CallType | null = null;
  for (const cl of currentRoundCalls(lead)) {
    if (!best || CALL_RANK[cl.type] > CALL_RANK[best]) best = cl.type;
  }
  return best;
}

/** Best result so far. A lead that got a meeting arranged was reached, so it counts as Discovery. */
export function effectiveCallType(lead: Lead): CallType | null {
  return lead.discoveryReached ? 'discovery' : highestCallType(lead);
}

/**
 * Category used by the work queue (each one is its own section).
 *   no calls yet                -> new
 *   best result = discovery     -> discovery   (even if there is also an LVM)
 *   best result = lvm           -> lvm
 *   only NVM calls              -> nvm
 *   meeting arranged            -> meeting     (until the meeting day ends)
 */
export type QueueCategory = 'new' | 'discovery' | 'lvm' | 'nvm' | 'meeting';

export function queueCategory(lead: Lead): QueueCategory {
  if (lead.status === 'arranged_meeting') return 'meeting';
  return effectiveCallType(lead) ?? 'new';
}

/** The status stored on the lead after a call (never overrides an arranged meeting). */
export function statusFromCalls(lead: Lead): Lead['status'] {
  if (lead.status === 'arranged_meeting') return lead.status;
  return effectiveCallType(lead) ?? 'new';
}
