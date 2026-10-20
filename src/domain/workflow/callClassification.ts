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
 * Category used by the work queue (each one is its own section). There is NO "meeting" category:
 * a lead with an arranged meeting is a Discovery lead like any other.
 *   no calls yet                -> new
 *   best result = discovery     -> discovery   (even if there is also an LVM, or a meeting was arranged)
 *   best result = lvm           -> lvm
 *   only NVM calls              -> nvm
 */
export type QueueCategory = 'new' | 'discovery' | 'lvm' | 'nvm';

export function queueCategory(lead: Lead): QueueCategory {
  return effectiveCallType(lead) ?? 'new';
}

/** The status stored on the lead after a call. */
export function statusFromCalls(lead: Lead): Lead['status'] {
  return effectiveCallType(lead) ?? 'new';
}
