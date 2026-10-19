/** Warnings about data that makes the numbers unreliable. */
import { hasReachedPerson } from '@/domain/analytics/performanceMetrics';
import type { Lead, Sale } from '@/domain/types';

// ---------------------------------------------------------------------------
// Data quality: things that make the numbers unreliable
// ---------------------------------------------------------------------------
export interface QualityIssue { id: string; level: 'warn' | 'info'; text: string }

export function findDataQualityIssues(leads: Lead[], sales: Sale[]): QualityIssue[] {
  const byId = new Map(leads.map(l => [l.id, l]));
  const out: QualityIssue[] = [];
  const noLead = sales.filter(s => !s.leadId || !byId.has(s.leadId));
  if (noLead.length) out.push({ id: 'sale-no-lead', level: 'warn', text: `${noLead.length} sale(s) are not linked to a lead, so they are missing from campaign and agent analysis.` });
  const unreached = sales.filter(s => { const l = byId.get(s.leadId); return l && !hasReachedPerson(l); });
  if (unreached.length) out.push({ id: 'sale-unreached', level: 'warn', text: `${unreached.length} sale(s) belong to leads nobody has reached yet (${unreached.map(s => s.leadName).join(', ')}).` });
  const mismatch = sales.filter(s => { const l = byId.get(s.leadId); return l && l.agentId !== s.agentId; });
  if (mismatch.length) out.push({ id: 'sale-agent', level: 'info', text: `${mismatch.length} sale(s) are credited to a different agent than the lead's current owner (usually after a transfer).` });
  const noReason = leads.reduce((n, l) => n + l.callLogs.filter(c => !c.reason).length, 0);
  const all = leads.reduce((n, l) => n + l.callLogs.length, 0);
  if (noReason) out.push({ id: 'no-reason', level: 'info', text: `${noReason} of ${all} calls have no structured reason; they are classified from the comment text.` });
  const dup = new Set<string>(); const seen = new Set<string>();
  for (const s of sales) { const k = `${s.leadId}|${s.saleType}|${s.date}`; if (seen.has(k)) dup.add(k); seen.add(k); }
  if (dup.size) out.push({ id: 'dup-sale', level: 'warn', text: `${dup.size} possible duplicate sale(s): same lead, type and date.` });
  return out;
}
