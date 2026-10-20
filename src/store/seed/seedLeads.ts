import type { CallLog, CallReason, CallType, Lead, LeadHistoryEntry, TouchPoint, User, Workflow } from '@/domain/types';
import { createRng, type Rng } from '@/store/seed/seedRandom';

const DAY = 86400000;

const PLACES = [
  'Cairo', 'Giza', 'Alex', 'Delta', 'Nile', 'Luxor', 'Aswan', 'Suez', 'Tanta', 'Mansoura', 'Sinai', 'Red Sea', 'Fayoum', 'Minya', 'Assiut',
  'Damietta', 'Port Said', 'Ismailia', 'October', 'Obour', 'Shorouk', 'Rehab', 'Maadi', 'Zamalek', 'Heliopolis', 'Nasr City', 'Hurghada', 'Siwa', 'Sohag', 'Qena',
];
const INDUSTRIES = [
  'Steel Works', 'Textiles', 'Foods', 'Pharma', 'Logistics', 'Plastics', 'Ceramics', 'Packaging', 'Electronics', 'Furniture', 'Dairy', 'Print House',
  'Marine Services', 'Software House', 'Auto Parts', 'Tours', 'Real Estate', 'Catering', 'Cement', 'Cables', 'Olive Oil', 'Poultry', 'Dental Group', 'Trading',
];
const FIRST = ['Karim', 'Dina', 'Adel', 'Salma', 'Hossam', 'Mariam', 'Tarek', 'Heba', 'Wael', 'Nada', 'Sherif', 'Yasmin', 'Amr', 'Lobna', 'Mazen', 'Rawan', 'Ehab', 'Noha', 'Bahaa', 'Ola', 'Samir', 'Hala', 'Fares', 'Marwa'];
const LAST = ['Nabil', 'Fathy', 'Samir', 'Reda', 'Aly', 'Zaki', 'Fawzy', 'Lotfy', 'Saad', 'Emad', 'Mansour', 'Hamdy', 'Shawky', 'Gaber', 'Kamel', 'Soliman', 'Rashad', 'Eid', 'Morsy', 'Badr'];

const CALL_NOTES: Record<CallType, { reason: CallReason; text: string }[]> = {
  nvm: [
    { reason: 'no_answer', text: 'Phone rang out, no answer.' },
    { reason: 'no_answer', text: 'Line was busy, will retry in the afternoon.' },
    { reason: 'no_answer', text: 'Phone switched off.' },
    { reason: 'no_answer', text: 'Reception said the manager is in a meeting.' },
  ],
  lvm: [
    { reason: 'voicemail', text: 'Left a voicemail with my name and number.' },
    { reason: 'voicemail', text: 'Spoke to the assistant and left a message for the owner.' },
    { reason: 'callback', text: 'Assistant asked me to call back after 2 PM.' },
  ],
  discovery: [
    { reason: 'interested', text: 'Interested, asked for more details by email.' },
    { reason: 'price', text: 'Asked about pricing and contract length.' },
    { reason: 'callback', text: 'Decision maker is travelling, call back next week.' },
    { reason: 'timing', text: 'Interested but not before next quarter.' },
    { reason: 'interested', text: 'Wants a demo for the whole team.' },
    { reason: 'not_interested', text: 'Already has a provider, not interested for now.' },
  ],
};

/** How an agent performs in the demo: a number between 0.55 and 1.45 (decides how many calls / discovery leads they have). */
export const agentPerformance = (index: number) => 0.55 + ((index * 37) % 91) / 100;

/** Builds the lead identity for index i (unique company, contact, code, phone, email). */
function leadIdentity(i: number, usedCompanies: Set<string>) {
  let company = `${PLACES[i % PLACES.length]} ${INDUSTRIES[(i * 5 + Math.floor(i / PLACES.length) * 3) % INDUSTRIES.length]}`;
  if (usedCompanies.has(company)) company += ' Group';
  usedCompanies.add(company);
  return {
    id: `l-${i + 1}`,
    leadCode: `LD${String(i + 1).padStart(3, '0')}`,
    campaignCode: i % 2 === 0 ? 'ACT-001' : 'RET-002',
    companyName: company,
    contactName: `${FIRST[i % FIRST.length]} ${LAST[(i * 3 + 1) % LAST.length]}`,
    phone: `+20 1${[0, 1, 2, 5][i % 4]} ${String(100 + ((i * 7) % 900))} ${String(1000 + ((i * 37) % 9000))}`,
    email: `contact${i + 1}@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`,
  };
}

interface Draft { agent: User; ageDays: number; done: number; expired: boolean; stopped: boolean; callsToday: number }

/**
 * Demo leads: every agent holds 8-10 leads at different workflow stages with real call history
 * (including calls made today, so the dashboards are alive), a few stopped / expired ones, plus 70 leads waiting in the pool.
 */
export function createSeedLeads(users: User[], workflows: Workflow[]): Lead[] {
  const rng = createRng(20260520);
  const now = Date.now();
  const used = new Set<string>();
  const agents = users.filter(u => u.role === 'agent');
  const leads: Lead[] = [];
  let n = 0;

  const atDay = (daysAgo: number, hour: number) => {
    const d = new Date(now - daysAgo * DAY); d.setHours(hour, rng.int(0, 59), 0, 0);
    return Math.min(d.getTime(), now - 5 * 60000);
  };
  /** a moment earlier TODAY (never before the UTC date change, because the dashboards group calls by that date) */
  const earlierToday = () => {
    const utcMidnight = Date.parse(new Date(now).toISOString().slice(0, 10));
    return now - Math.floor(rng.next() * Math.max(0, now - utcMidnight - 120000)) - 60000;
  };

  agents.forEach((agent, ai) => {
    const perf = agentPerformance(ai);
    const count = 8 + (ai % 3);
    for (let k = 0; k < count; k++) {
      const draft: Draft = {
        agent,
        ageDays: rng.int(1, 12),
        done: 0,
        expired: ai % 7 === 3 && k === count - 1,          // a few leads that stalled for 15+ days (the team leader must reassign them)
        stopped: !(ai % 7 === 3 && k === count - 1) && rng.chance(0.07),
        callsToday: Math.round(rng.int(2, 7) * perf),
      };
      leads.push(buildLead(n++, draft, rng, workflows, now, used, atDay, earlierToday, perf));
    }
  });

  // The shared pool: created by the Admin, nobody owns them yet
  for (let i = 0; i < 70; i++) {
    const id = leadIdentity(n++, used);
    leads.push({
      ...id, status: 'new', stopped: false, removedFromQueue: false, removedAt: null,
      agentId: '', assignedAt: new Date(now - DAY).toISOString(), touchPoints: [], currentTouchPoint: -1, callLogs: [],
      history: [{ id: `h-pool-${i + 1}`, action: 'created', timestamp: new Date(now - DAY).toISOString(), userId: 'u-admin', userName: 'System Admin', detail: 'Lead created by the Admin (in the pool)' }],
    });
  }
  return leads;
}

function buildLead(
  index: number, d: Draft, rng: Rng, workflows: Workflow[], now: number, used: Set<string>,
  atDay: (daysAgo: number, hour: number) => number, earlierToday: () => number, perf: number,
): Lead {
  const id = leadIdentity(index, used);
  const wf = workflows.find(w => w.campaignCode === id.campaignCode)!;
  const ageDays = d.expired ? 19 : d.ageDays;
  const assignedMs = atDay(ageDays, 9);
  const iso = (ms: number) => new Date(ms).toISOString();

  // how many steps are already done: only steps whose day offset already passed since the lead was taken
  const reachable = wf.touchPoints.filter(t => t.dayOffset <= ageDays).length;
  const done = d.expired ? Math.min(2, reachable) : Math.min(wf.touchPoints.length - 1, rng.int(d.ageDays <= 2 ? 0 : 1, reachable));
  const lastDone = wf.touchPoints[done - 1];
  // some leads had their latest call step done TODAY, so today's numbers on the dashboards are not zero
  const lastToday = !d.expired && !d.stopped && done > 0 && lastDone.type === 'call' && ageDays > lastDone.dayOffset && rng.chance(0.4);

  const callLogs: CallLog[] = [];
  const history: LeadHistoryEntry[] = [{
    id: `h-${index}-0`, action: 'taken_from_pool', timestamp: iso(assignedMs), userId: d.agent.id, userName: d.agent.name,
    detail: `Taken from the pool by ${d.agent.name}`, round: 1, agentId: d.agent.id,
  }];
  const addLog = (ts: number, tp: TouchPoint | { order: number; label: string }, type: CallType) => {
    const note = rng.pick(CALL_NOTES[type]);
    const log: CallLog = {
      id: `cl-${index}-${callLogs.length}`, type, reason: note.reason, description: note.text, timestamp: iso(ts),
      touchPointOrder: tp.order, agentId: d.agent.id, agentName: d.agent.name, touchPointLabel: tp.label, round: 1,
    };
    callLogs.push(log);
    history.push({ id: `h-${index}-${history.length}`, action: 'call_logged', timestamp: iso(ts), userId: d.agent.id, userName: d.agent.name, detail: `${type.toUpperCase()}: ${note.text}`, round: 1, agentId: d.agent.id, touchPointOrder: tp.order, touchPointLabel: tp.label, touchPointType: 'call', meta: { callLogId: log.id, callType: type } });
  };

  // a good agent reaches the right person more often
  const reachChance = 0.18 * perf;
  let reached = false;
  const touchPoints: TouchPoint[] = wf.touchPoints.map(t => {
    if (t.order >= done) return { ...t, status: 'pending' as const, completedAt: null, dueDate: null };
    const isLast = t.order === done - 1;
    const ts = lastToday && isLast ? earlierToday() : Math.min(assignedMs + t.dayOffset * DAY + rng.int(1, 6) * 3600000, now - 600000);
    if (t.type === 'call') {
      const type: CallType = reached ? 'discovery' : rng.chance(reachChance + t.order * 0.04) ? 'discovery' : rng.chance(0.3) ? 'lvm' : 'nvm';
      if (type === 'discovery') reached = true;
      addLog(ts, t, type);
    } else {
      history.push({ id: `h-${index}-${history.length}`, action: 'email_sent', timestamp: iso(ts), userId: d.agent.id, userName: d.agent.name, detail: `Email sent to ${id.email}`, round: 1, agentId: d.agent.id, touchPointOrder: t.order, touchPointLabel: t.label, touchPointType: 'email' });
    }
    return { ...t, status: 'completed' as const, completedAt: iso(ts), dueDate: iso(ts) };
  });

  // extra retries made today on the CURRENT call step (calling again without finishing the step: a normal day for an agent)
  const current = touchPoints.find(t => t.order === done);
  const retryTarget = current ?? touchPoints[done - 1];
  if (!d.expired && !d.stopped && retryTarget) {
    for (let r = 0; r < d.callsToday; r++) {
      const type: CallType = reached ? (rng.chance(0.5) ? 'discovery' : 'lvm') : rng.chance(reachChance * 0.5) ? 'discovery' : rng.chance(0.3) ? 'lvm' : 'nvm';
      if (type === 'discovery') reached = true;
      addLog(earlierToday(), retryTarget, type);
    }
  }
  callLogs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // schedule the open steps the way the app does: the wait counts forward from the last finished step
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  let cursor = done > 0 ? new Date(touchPoints[done - 1].completedAt!).getTime() : assignedMs;
  let prevOffset = done > 0 ? wf.touchPoints[done - 1].dayOffset : 0;
  for (const t of touchPoints) {
    if (t.order < done) continue;
    cursor += Math.max(0, t.dayOffset - prevOffset) * DAY; prevOffset = t.dayOffset;
    t.dueDate = iso(cursor);
    t.status = cursor < startOfToday.getTime() ? 'overdue' : 'pending';
  }

  const rank: Record<CallType, number> = { nvm: 1, lvm: 2, discovery: 3 };
  const best = callLogs.reduce<CallType | null>((b, c) => (!b || rank[c.type] > rank[b] ? c.type : b), null);
  const lead: Lead = {
    ...id, status: best ?? 'new', agentId: d.agent.id, assignedAt: iso(assignedMs),
    touchPoints, currentTouchPoint: touchPoints.find(t => t.status === 'pending' || t.status === 'overdue')?.order ?? -1,
    callLogs, history, stopped: d.stopped, removedFromQueue: false, removedAt: null,
    discoveryReached: best === 'discovery', lastActivityAt: iso(callLogs.length ? new Date(callLogs[callLogs.length - 1].timestamp).getTime() : assignedMs),
  };
  if (d.stopped) {
    lead.history.push({ id: `h-${index}-stop`, action: 'workflow_stopped', timestamp: iso(now - DAY), userId: d.agent.id, userName: d.agent.name, detail: 'Customer asked not to be contacted for now', round: 1, agentId: d.agent.id });
    lead.lastActivityAt = iso(now - DAY);
  }
  if (d.expired) {
    lead.lastActivityAt = iso(now - 17 * DAY);
    lead.expiredAt = iso(now - 2 * DAY);
  }
  return lead;
}
