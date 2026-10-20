/** The shared lead pool: who can take which lead, and what would happen to each id typed by an agent. */
import { MAX_ROWS_PER_IMPORT, cleanLeadCode, normalizeLeadCode } from '@/domain/lead/leadCode';
import type { Lead } from '@/domain/types';
import { lastContactTimestamp } from '@/domain/workflow/touchPoints';
import { LEAD_RETOUCH_LOCK_DAYS } from '@/domain/workflow/workflowRules';

interface PoolLeadLike { id: string; leadCode: string; agentId: string; removedFromQueue: boolean }

/**
 * "Recently worked" rule: a free lead that ANOTHER agent called / emailed less than 15 days ago cannot be taken yet.
 * Returns the whole days left until it can be taken (0 = free to take). The agent who worked on it last is not blocked.
 */
export function daysUntilTakeable(lead: Lead, agentId: string, now: number = Date.now()): number {
  if (!lead.agentId || lead.agentId === agentId) return 0;
  const last = lastContactTimestamp(lead);
  if (last === null) return 0;
  return Math.max(0, Math.ceil((last + LEAD_RETOUCH_LOCK_DAYS * 86400000 - now) / 86400000));
}

/** Nobody owns it: it was created by the Admin, or the agent removed it. Any agent can take it. */
export const isInPool = (l: Pick<PoolLeadLike, 'agentId' | 'removedFromQueue'>) => !l.agentId || l.removedFromQueue;

/** Lead ids typed / pasted one under the other. A spreadsheet row (tab separated) counts as its first cell; commas / semicolons also separate ids. */
export function splitLeadIds(text: string): { line: number; code: string }[] {
  const out: { line: number; code: string }[] = [];
  text.split(/\r?\n/).forEach((rawLine, i) => {
    if (!rawLine.trim()) return;
    const cells = rawLine.includes('\t') ? [rawLine.split('\t')[0]] : rawLine.split(/[,;]/);
    for (const c of cells) {
      const code = cleanLeadCode(c);
      if (!code) continue;
      if (out.length === 0 && /^(leads?[\s_-]*)?(code|id)$/i.test(code)) continue;   // copied header
      out.push({ line: i + 1, code });
    }
  });
  return out;
}

export type ClaimStatus = 'ready' | 'mine' | 'taken' | 'recently_worked' | 'not_found' | 'invalid' | 'duplicate' | 'over_limit';

export interface ClaimResult {
  line: number;
  code: string;
  status: ClaimStatus;
  leadId?: string;       // the lead to take (status 'ready') or the lead that was found
  holderName?: string;   // when status is 'taken'
  daysLeft?: number;     // when status is 'recently_worked': days until the lead can be taken
}

/** Looks one id up. The holder (active lead) always wins over an older removed copy with the same id. */
function findLeadHolderByCode<T extends PoolLeadLike>(leads: T[], key: string) {
  let pool: T | undefined;
  for (const l of leads) {
    if (normalizeLeadCode(l.leadCode) !== key) continue;
    if (!isInPool(l)) return { holder: l, pool: undefined };
    pool = l;
  }
  return { holder: undefined, pool };
}

/** What would happen to each id if this agent took it. Pure: the UI shows it live, the reducer re-checks it. */
export function planTakeFromPool<T extends PoolLeadLike & Lead>(
  ids: { line: number; code: string }[], leads: T[], agentId: string, agentNameOf: (id: string) => string, now: number = Date.now(),
): ClaimResult[] {
  const seen = new Set<string>();
  let ready = 0;
  return ids.map(({ line, code }): ClaimResult => {
    const key = normalizeLeadCode(code);
    if (!key) return { line, code, status: 'invalid' };   // lookup is lenient: "LD-013", "ld013" and "LD 013" all find the same lead
    if (seen.has(key)) return { line, code, status: 'duplicate' };
    seen.add(key);
    const { holder, pool } = findLeadHolderByCode(leads, key);
    if (holder) {
      return holder.agentId === agentId
        ? { line, code, status: 'mine', leadId: holder.id }
        : { line, code, status: 'taken', leadId: holder.id, holderName: agentNameOf(holder.agentId) || 'another agent' };
    }
    if (!pool) return { line, code, status: 'not_found' };
    const daysLeft = daysUntilTakeable(pool, agentId, now);
    if (daysLeft > 0) return { line, code, status: 'recently_worked', leadId: pool.id, daysLeft };
    if (ready >= MAX_ROWS_PER_IMPORT) return { line, code, status: 'over_limit', leadId: pool.id };
    ready++;
    return { line, code, status: 'ready', leadId: pool.id };
  });
}

export const CLAIM_STATUS_TEXT: Record<ClaimStatus, string> = {
  ready: 'Ready to add',
  mine: 'Already in your leads',
  taken: 'Held by another agent',
  recently_worked: `Another agent added it in the last ${LEAD_RETOUCH_LOCK_DAYS} days`,
  not_found: 'Not found in the pool',
  invalid: 'Not a valid lead ID',
  duplicate: 'Repeated in this list',
  over_limit: `Over the limit of ${MAX_ROWS_PER_IMPORT} leads at once`,
};
