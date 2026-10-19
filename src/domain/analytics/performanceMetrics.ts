/** Call, funnel and group metrics (pure functions of the store data). */
import type { Lead, Meeting, Sale, User } from '@/domain/types';

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

function buildGroupRow(key: string, label: string, leads: Lead[], sales: Sale[]): GroupRow {
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
    .map(code => buildGroupRow(code, label(code), leads.filter(l => l.campaignCode === code), sales));

export const byAgent = (leads: Lead[], sales: Sale[], agents: User[]) =>
  agents.map(a => buildGroupRow(a.id, a.name, leads.filter(l => l.agentId === a.id), sales));

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
