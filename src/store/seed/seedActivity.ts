/** Demo activity around the leads: meetings, sent emails, sales, updates, tasks, Quality tips and the notifications they caused. */
import { fillEmailTemplate } from '@/domain/email/fillEmailTemplate';
import { updateRecipients } from '@/domain/updates/updateRecipients';
import type {
  EmailLog, EmailTemplate, Lead, Meeting, MeetingStatus, Notification, Sale, SaleType, Task, Team, TeamUpdate, Tip, User,
} from '@/domain/types';
import { localDay } from '@/shared/lib/dates';
import { agentPerformance } from '@/store/seed/seedLeads';
import { createRng } from '@/store/seed/seedRandom';

export interface SeedActivity {
  meetings: Meeting[]; emailLogs: EmailLog[]; sales: Sale[]; updates: TeamUpdate[]; tasks: Task[]; tips: Tip[]; notifications: Notification[];
}

const DAY = 86400000;

export function createSeedActivity(users: User[], teams: Team[], leads: Lead[], templates: EmailTemplate[]): SeedActivity {
  const rng = createRng(7714);
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const ago = (days: number, hour = 10, min = 0) => { const d = new Date(now - days * DAY); d.setHours(hour, min, 0, 0); return Math.min(d.getTime(), now - 60000); };
  const byId = (id: string) => users.find(u => u.id === id)!;
  const agents = users.filter(u => u.role === 'agent');
  const quality = users.filter(u => u.role === 'quality');
  const oms = users.filter(u => u.role === 'operation_manager');

  // ---------- emails: every completed email step of every lead was really sent ----------
  const emailLogs: EmailLog[] = [];
  for (const l of leads) {
    const agent = l.agentId ? byId(l.agentId) : undefined;
    if (!agent) continue;
    for (const tp of l.touchPoints) {
      if (tp.type !== 'email' || tp.status !== 'completed' || !tp.completedAt) continue;
      const type = l.discoveryReached ? 'discovery' : 'no_response';
      const tpl = templates.find(t => t.type === type);
      if (!tpl) continue;
      emailLogs.push({
        id: `em-${l.id}-${tp.order}`, leadId: l.id, leadName: l.companyName, to: l.email,
        subject: fillEmailTemplate(tpl.subject, l, agent.name), body: fillEmailTemplate(tpl.body, l, agent.name),
        templateType: type, sentAt: tp.completedAt, sentBy: agent.id, sentByName: agent.name,
        auto: true, idempotencyKey: `auto|${l.id}|1|${tp.order}`,
      });
    }
  }
  emailLogs.sort((a, b) => b.sentAt.localeCompare(a.sentAt));

  // ---------- meetings ----------
  const meetings: Meeting[] = [];
  const startOf = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime();
  const addMeeting = (m: Omit<Meeting, 'id' | 'reminderSentAt'>) => {
    const id = `m-${meetings.length + 1}`;
    // anything starting within 15 minutes (or already started) was already reminded: no burst of reminders on first load
    const reminded = m.status === 'arranged' && startOf(m.date, m.time) - 15 * 60000 <= now;
    meetings.push({ id, ...m, ...(reminded ? { reminderSentAt: iso(now) } : {}) });
  };
  const discoveryLeads = (agentId: string) => leads.filter(l => l.agentId === agentId && l.discoveryReached && !l.stopped && !l.expiredAt);
  const OUTCOMES = [
    'Customer liked the offer and will confirm after the board meeting.', 'Walked through the plan, asked for a revised price.',
    'Decision maker joined; agreed to a trial month.', 'Needs approval from finance, follow-up next week.',
  ];
  const TIMES = ['09:30', '10:00', '11:00', '12:30', '13:00', '14:00', '15:30', '16:30'];

  agents.forEach((agent, ai) => {
    const mine = discoveryLeads(agent.id);
    mine.slice(0, 3).forEach((lead, k) => {
      // k = 0: today, 1: in the next days, 2: already happened
      const offset = k === 0 ? (ai % 3 === 0 ? 1 : 0) : k === 1 ? rng.int(1, 5) : -rng.int(1, 6);
      const status: MeetingStatus = offset >= 0 ? 'arranged' : rng.pick<MeetingStatus>(['completed', 'completed', 'completed', 'no_show', 'cancelled']);
      const date = localDay(now + offset * DAY);
      addMeeting({
        type: 'lead_meeting', leadId: lead.id, leadName: lead.contactName, companyName: lead.companyName, agentId: agent.id,
        participantIds: [agent.id], participantNames: [agent.name], title: `Meeting with ${lead.companyName}`,
        date, time: rng.pick(TIMES), duration: rng.pick([30, 45, 60]), notes: 'Present the activation plan and agree the next step.',
        ...(status === 'completed' ? { outcome: rng.pick(OUTCOMES) } : {}), status, priority: 'high', createdBy: agent.id,
      });
      lead.history.push({ id: `h-m-${lead.id}`, action: 'meeting_arranged', timestamp: iso(ago(Math.max(1, -offset + 1))), userId: agent.id, userName: agent.name, detail: `${date}`, round: 1, agentId: agent.id });
    });
  });
  // team leaders sit with their agents, Quality reviews calls with agents, the OM meets team leaders and Quality
  teams.forEach((t, ti) => {
    const tl = byId(t.leaderId);
    const picked = t.agentIds.slice(0, 2).map(byId);
    addMeeting({ type: 'internal_meeting', participantIds: picked.map(a => a.id), participantNames: picked.map(a => a.name), title: `${t.name} weekly sync`, date: localDay(now + (ti % 2) * DAY), time: '09:00', duration: 30, notes: 'Targets for the week and blockers.', status: 'arranged', priority: 'normal', createdBy: tl.id });
    addMeeting({ type: 'internal_meeting', participantIds: [t.agentIds[0]], participantNames: [byId(t.agentIds[0]).name], title: `1:1 coaching - ${byId(t.agentIds[0]).name}`, date: localDay(now - (ti + 1) * DAY), time: '15:00', duration: 30, notes: 'Call review.', outcome: 'Agreed on a daily plan.', status: 'completed', priority: 'normal', createdBy: tl.id });
  });
  quality.forEach(q => {
    const picked = agents.filter(a => a.qualityId === q.id).slice(0, 3);
    addMeeting({ type: 'internal_meeting', participantIds: picked.map(a => a.id), participantNames: picked.map(a => a.name), title: 'Call quality review', date: localDay(now + DAY), time: '11:30', duration: 45, notes: 'Listen to recorded calls together.', status: 'arranged', priority: 'normal', createdBy: q.id });
  });
  oms.forEach(om => {
    const tls = teams.filter(t => t.managerId === om.id).map(t => byId(t.leaderId));
    const omQuality = quality.find(q => q.lob === om.lob) ?? quality[0];
    addMeeting({ type: 'internal_meeting', participantIds: [...tls.map(t => t.id), omQuality.id], participantNames: [...tls.map(t => t.name), omQuality.name], title: 'Operations review', date: localDay(now + 2 * DAY), time: '10:00', duration: 60, notes: 'Month-to-date numbers and quality findings.', status: 'arranged', priority: 'high', createdBy: om.id });
  });

  // ---------- sales: this month and last month, recorded by Quality ----------
  const sales: Sale[] = [];
  const today = new Date(now);
  const SALE_TYPES: SaleType[] = ['BP', 'PPI', 'MUA', 'ATEP', 'Activation', 'Retention', 'Transition'];
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).getTime();
  const lastMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const seen = new Set<string>();
  agents.forEach((agent, ai) => {
    const mine = discoveryLeads(agent.id);
    if (mine.length === 0) return;
    const daysSoFar = Math.max(1, today.getDate());
    const thisMonth = Math.round(agentPerformance(ai) * 14 * Math.min(1, daysSoFar / 20 + 0.25));
    const lastMonth = Math.round(agentPerformance(ai + 5) * 17);
    const make = (k: number, dateMs: number) => {
      const lead = mine[k % mine.length];
      const saleType = SALE_TYPES[(k + ai) % SALE_TYPES.length];
      const date = localDay(dateMs);
      const key = `${lead.id}|${saleType}|${date}`;
      if (seen.has(key)) return;
      seen.add(key);
      const q = (agent.qualityId && byId(agent.qualityId)) || quality[(k + ai) % quality.length];
      sales.push({ id: `s-${sales.length + 1}`, agentId: agent.id, leadId: lead.id, leadName: lead.companyName, saleType, date, createdBy: q.id, createdAt: iso(Math.min(dateMs + 5 * 3600000, now)) });
    };
    for (let k = 0; k < thisMonth; k++) make(k, monthStart + Math.floor(rng.next() * daysSoFar) * DAY);
    for (let k = 0; k < lastMonth; k++) make(k + 40, lastMonthStart + Math.floor(rng.next() * lastMonthDays) * DAY);
  });
  sales.sort((a, b) => b.date.localeCompare(a.date));

  // ---------- updates (the newest two are still unseen by their recipients, so the menu shows real numbers) ----------
  const om = oms[0]; const om2 = oms[1];
  const raw: Omit<TeamUpdate, 'id' | 'acknowledgedBy' | 'seenBy'>[] = [
    { audience: 'all', teamId: null, authorId: om.id, authorName: om.name, title: 'New call script is live', content: 'Please use the updated opening line from today. It mentions the activation offer in the first 20 seconds.', createdAt: iso(ago(6, 9)) },
    { audience: 'team_leaders', teamId: null, authorId: om.id, authorName: om.name, title: 'Weekly numbers review', content: 'Send me your team numbers before Thursday noon: calls, discovery, meetings, sales.', createdAt: iso(ago(4, 13)) },
    { audience: 'specific_team', teamId: 't-1', authorId: 'u-tl1', authorName: byId('u-tl1').name, title: 'Team Alpha: focus on follow-up emails', content: 'Every touch point email must go out the same day it is due. Check your queue each morning.', createdAt: iso(ago(3, 11)) },
    { audience: 'quality', teamId: null, authorId: om.id, authorName: om.name, title: 'Quality scorecard changes', content: 'We add a "customer name used" line to the call scorecard starting next week.', createdAt: iso(ago(2, 15)) },
    { audience: 'all', teamId: null, authorId: om2.id, authorName: om2.name, title: 'Month-end push', content: 'Month end is close. Every sale recorded by Quality before the last day counts for this month.', createdAt: iso(ago(1, 10)) },
    { audience: 'specific_team', teamId: 't-4', authorId: 'u-tl4', authorName: byId('u-tl4').name, title: 'Team Delta: coaching slots', content: 'Coaching slots are open on Wednesday. Book yours with me before Tuesday evening.', createdAt: iso(ago(0, 8, 30)) },
  ];
  const updates: TeamUpdate[] = raw.map((u, i) => {
    const id = `up-${i + 1}`;
    const recipients = updateRecipients({ ...u }, users, teams);
    const newest = i >= raw.length - 2;
    const acknowledgedBy = recipients.filter(() => rng.chance(newest ? 0.15 : 0.75)).map(r => r.id);
    // older updates were opened by everybody; the newest ones only by the author and by whoever already acknowledged
    const seenBy = newest ? [u.authorId, ...acknowledgedBy] : [u.authorId, ...recipients.map(r => r.id), ...oms.map(o => o.id)];
    return { id, ...u, acknowledgedBy, seenBy: [...new Set(seenBy)] };
  }).reverse();   // newest first, like the app keeps them

  // ---------- tasks ----------
  const tls = users.filter(u => u.role === 'team_leader');
  const deadline = (days: number) => iso(now + days * DAY);
  const tasks: Task[] = [];
  const addTask = (authorId: string, title: string, description: string, createdAgo: number, deadlineIn: number, assignedTo: string[], doneShare: number, unseen: boolean) => {
    const a = byId(authorId);
    const completedBy = assignedTo.filter(() => rng.chance(doneShare));
    tasks.push({
      id: `tk-${tasks.length + 1}`, authorId, authorName: a.name, title, description, createdAt: iso(ago(createdAgo, 9)), deadline: deadline(deadlineIn),
      assignedTo, completedBy, seenBy: unseen ? [authorId, ...completedBy] : [...new Set([authorId, ...assignedTo])],
    });
  };
  const teamOfLeader = (tlId: string) => teams.find(t => t.leaderId === tlId)!;
  addTask(om.id, 'Submit the weekly performance sheet', 'Calls, discovery, meetings and sales per agent, as a short summary.', 5, 2, tls.filter(t => teamOfLeader(t.id).managerId === om.id).map(t => t.id), 0.5, false);
  addTask(om.id, 'Review 10 recorded calls per team', 'Quality will send the list of calls; give feedback to every agent in the call.', 2, 5, quality.map(q => q.id), 0.5, true);
  addTask(om2.id, 'Plan the month-end sales push', 'Send me a plan with daily targets per agent.', 3, 3, tls.filter(t => teamOfLeader(t.id).managerId === om2.id).map(t => t.id), 0, true);
  addTask(om.id, 'Prepare the new campaign script feedback', 'Collect feedback from your agents on the new script and send me the top 5 points.', 9, -2, tls.filter(t => teamOfLeader(t.id).managerId === om.id).map(t => t.id), 1, false);
  teams.forEach((t, ti) => {
    addTask(t.leaderId, 'Clean up your overdue touch points', 'Finish or skip every overdue touch point in your queue.', 4 + (ti % 3), 1 + (ti % 3), t.agentIds, 0.5, false);
    if (ti % 2 === 0) addTask(t.leaderId, 'Update contact details on your leads', 'Add the missing emails and direct phone numbers.', 1, 4, t.agentIds, 0, true);
  });

  // ---------- tips from Quality ----------
  const TIPS: [string, string][] = [
    ['Use the customer name in the first sentence', 'Calls that start with the name of the contact are answered more often. Say it clearly right after the greeting.'],
    ['Do not rush the pricing answer', 'When a customer asks about price, first ask what they pay today, then compare. It avoids the "too expensive" answer.'],
    ['Always confirm the next step before you hang up', 'End every discovery call with a date and a time for the next contact, and write it in the call comment.'],
    ['Leave a short voicemail', 'Keep voicemails under 20 seconds: name, company, one reason to call back, and your number twice.'],
  ];
  const tips: Tip[] = [];
  agents.forEach((agent, ai) => {
    if (ai % 2 !== 0) return;
    const q = (agent.qualityId && byId(agent.qualityId)) || quality[ai % quality.length];
    const [title, content] = TIPS[ai % TIPS.length];
    const newest = ai >= agents.length - 6;
    const read = !newest && rng.chance(0.6);
    tips.push({
      id: `tp-${tips.length + 1}`, authorId: q.id, authorName: q.name, agentId: agent.id, title, content,
      createdAt: iso(ago(newest ? 0 : rng.int(1, 8), 14)), acknowledgedAt: read ? iso(ago(0, 8)) : null,
      seenBy: newest ? [q.id] : [q.id, agent.id],
    });
  });
  tips.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // ---------- notifications: one per person, only for what that person did not do himself and has not handled ----------
  const notifications: Notification[] = [];
  const push = (userId: string, type: Notification['type'], title: string, message: string, at: string, read: boolean, extra: Partial<Notification> = {}) =>
    notifications.push({ id: `n-${notifications.length + 1}`, userId, type, title, message, timestamp: at, read, ...extra });
  for (const u of updates) for (const r of updateRecipients(u, users, teams)) {
    push(r.id, 'update', 'New update', `${u.authorName} posted: ${u.title}`, u.createdAt, u.acknowledgedBy.includes(r.id) || u.seenBy.includes(r.id) && rng.chance(0.7));
  }
  for (const t of tasks) for (const id of t.assignedTo) {
    push(id, 'task', 'New task', `${t.authorName} assigned you: ${t.title}`, t.createdAt, t.completedBy.includes(id) || t.seenBy.includes(id) && rng.chance(0.7));
  }
  for (const t of tips) push(t.agentId, 'tip', 'New tip from Quality', t.title, t.createdAt, !!t.acknowledgedAt || t.seenBy.includes(t.agentId));
  for (const m of meetings) {
    if (m.status !== 'arranged') continue;
    for (const id of m.participantIds) if (id !== m.createdBy) push(id, 'meeting', 'Meeting scheduled', `${m.title} on ${m.date} at ${m.time}`, iso(ago(1, 16)), rng.chance(0.5), { meetingId: m.id, leadId: m.leadId });
  }
  notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return { meetings, emailLogs, sales, updates, tasks, tips, notifications };
}
