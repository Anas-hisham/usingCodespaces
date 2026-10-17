import type { CallReason, Lead, Meeting, Sale, User } from '@/types';

/**
 * Analytics helpers. Everything here is a pure function of the store data, so the same numbers
 * can later be computed on the server without changing the definitions.
 *
 * Call types (from the business rules):
 *   nvm       = nobody answered
 *   lvm       = someone answered, but not the person we need
 *   discovery = the right person answered
 * So: answer rate = (lvm + discovery) / calls   and   reach rate = discovery / calls.
 */

export const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/** The right person was reached at least once (a discovery call, or a meeting was arranged). */
export const hasReachedPerson = (l: Lead) =>
  !!l.discoveryReached || l.status === 'discovery' || l.status === 'arranged_meeting' ||
  l.callLogs.some(c => c.type === 'discovery');

export interface CallStats { calls: number; nvm: number; lvm: number; discovery: number; answerRate: number; reachRate: number }

export function callStats(leads: Lead[]): CallStats {
  let nvm = 0, lvm = 0, discovery = 0;
  for (const l of leads) for (const c of l.callLogs) {
    if (c.type === 'nvm') nvm++; else if (c.type === 'lvm') lvm++; else discovery++;
  }
  const calls = nvm + lvm + discovery;
  return { calls, nvm, lvm, discovery, answerRate: pct(lvm + discovery, calls), reachRate: pct(discovery, calls) };
}

export interface Funnel { leads: number; contacted: number; reached: number; meetings: number; sold: number }

export function funnel(leads: Lead[], meetings: Meeting[], sales: Sale[]): Funnel {
  const ids = new Set(leads.map(l => l.id));
  const meetingLeads = new Set(meetings.filter(m => m.type === 'lead_meeting' && m.leadId && ids.has(m.leadId)).map(m => m.leadId));
  const soldLeads = new Set(sales.filter(s => ids.has(s.leadId)).map(s => s.leadId));
  return {
    leads: leads.length,
    contacted: leads.filter(l => l.callLogs.length > 0).length,
    reached: leads.filter(hasReachedPerson).length,
    meetings: meetingLeads.size,
    sold: soldLeads.size,
  };
}

export interface GroupRow extends CallStats {
  key: string; label: string; leads: number; reached: number; sold: number; sales: number;
  conversion: number;       // sold leads / leads
  reachToSale: number;      // sold leads / reached leads
  callsPerLead: number;
}

function row(key: string, label: string, leads: Lead[], sales: Sale[]): GroupRow {
  const ids = new Set(leads.map(l => l.id));
  const mine = sales.filter(s => ids.has(s.leadId));
  const sold = new Set(mine.map(s => s.leadId)).size;
  const reached = leads.filter(hasReachedPerson).length;
  const cs = callStats(leads);
  return {
    key, label, ...cs, leads: leads.length, reached, sold, sales: mine.length,
    conversion: pct(sold, leads.length), reachToSale: pct(sold, reached),
    callsPerLead: leads.length ? Math.round((cs.calls / leads.length) * 10) / 10 : 0,
  };
}

export const byCampaign = (leads: Lead[], sales: Sale[], label: (code: string) => string) =>
  [...new Set(leads.map(l => l.campaignCode))].sort()
    .map(code => row(code, label(code), leads.filter(l => l.campaignCode === code), sales));

export const byAgent = (leads: Lead[], sales: Sale[], agents: User[]) =>
  agents.map(a => row(a.id, a.name, leads.filter(l => l.agentId === a.id), sales));

/** Best time to call: answer / reach rate per hour of the day. */
export interface HourBucket { hour: number; calls: number; answered: number; reached: number; reachRate: number }
export function byHour(leads: Lead[]): HourBucket[] {
  const map = new Map<number, HourBucket>();
  for (const l of leads) for (const c of l.callLogs) {
    const h = new Date(c.timestamp).getHours();
    const b = map.get(h) ?? { hour: h, calls: 0, answered: 0, reached: 0, reachRate: 0 };
    b.calls++;
    if (c.type !== 'nvm') b.answered++;
    if (c.type === 'discovery') b.reached++;
    map.set(h, b);
  }
  return [...map.values()].map(b => ({ ...b, reachRate: pct(b.reached, b.calls) })).sort((a, b) => a.hour - b.hour);
}

// ---------------------------------------------------------------------------
// Comment intelligence (light): classify the agent's comment into a reason.
// A structured `reason` on the call always wins; keywords are only the fallback for free text.
// ---------------------------------------------------------------------------
export const REASON_LABEL: Record<CallReason, string> = {
  interested: 'Interested', callback: 'Call back later', price: 'Price', timing: 'Timing',
  not_interested: 'Not interested', wrong_contact: 'Wrong contact', no_answer: 'No answer', voicemail: 'Voicemail / third person', other: 'Other',
};

const RULES: [CallReason, RegExp][] = [
  ['wrong_contact', /wrong (number|contact|person)|left the company|رقم غلط|مش هو|ساب الشركة/i],
  ['not_interested', /not interested|no interest|refus|declin|مش مهتم|مش عايز|رفض/i],
  ['price', /pric|cost|expensive|discount|budget|سعر|غالي|تكلف|خصم/i],
  ['callback', /call ?back|later|ring back|كلمني|بعدين|اتصل تاني/i],
  ['timing', /next (week|month|quarter)|not now|busy|الشهر الجاي|مشغول|مش دلوقتي/i],
  ['interested', /interest|agree|wants|requested|confirm|great|مهتم|موافق|عايز/i],
  ['no_answer', /no answer|nobody|didn.t answer|مفيش رد|محدش رد/i],
  ['voicemail', /voicemail|assistant|secretary|message|سكرتير/i],
];

export function classifyComment(text: string, type: 'nvm' | 'lvm' | 'discovery'): CallReason {
  for (const [reason, re] of RULES) if (re.test(text)) return reason;
  return type === 'nvm' ? 'no_answer' : type === 'lvm' ? 'voicemail' : 'other';
}

export function reasonCounts(leads: Lead[]): { reason: CallReason; count: number; share: number }[] {
  const counts = new Map<CallReason, number>();
  let total = 0;
  for (const l of leads) for (const c of l.callLogs) {
    const r = c.reason ?? classifyComment(c.description, c.type);
    counts.set(r, (counts.get(r) ?? 0) + 1); total++;
  }
  return [...counts.entries()].map(([reason, count]) => ({ reason, count, share: pct(count, total) })).sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Data quality: things that make the numbers unreliable
// ---------------------------------------------------------------------------
export interface QualityIssue { id: string; level: 'warn' | 'info'; text: string }

export function dataQuality(leads: Lead[], sales: Sale[]): QualityIssue[] {
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
