import { useMemo, useState } from 'react';
import { BarChart3, Users, Phone, Target, AlertTriangle, CalendarDays, Mail, TrendingUp } from 'lucide-react';
import { useStore } from '@/store';
import type { Lead, User } from '@/types';

const dateKey = (value: string) => value?.slice(0, 10) ?? '';
const pct = (n: number, d: number) => d ? Math.round((n / d) * 100) : 0;
const inRange = (date: string, start: string, end: string) => {
  const key = dateKey(date);
  return !!key && key >= start && key <= end;
};
function Metric({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint: string; icon: typeof Users }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="mb-3 flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Icon className="h-4 w-4" /></span></div>
    <div className="text-2xl font-bold text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-500">{hint}</div>
  </div>;
}
function Bar({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  const width = max > 0 ? Math.max(value > 0 ? 2 : 0, value / max * 100) : 0;
  return <div className="space-y-1.5"><div className="flex justify-between gap-3 text-sm"><span className="truncate text-slate-700">{label}</span><span className="shrink-0 font-semibold text-slate-900">{value}{detail ? ` · ${detail}` : ''}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${width}%` }} /></div></div>;
}

export function Analytics() {
  const { state } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId);
  const today = new Date();
  const defaultStart = new Date(today); defaultStart.setDate(today.getDate() - 29);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [start, setStart] = useState(iso(defaultStart));
  const [end, setEnd] = useState(iso(today));
  const [campaign, setCampaign] = useState('all');

  const visibleUsers = useMemo(() => {
    if (!currentUser) return [] as User[];
    if (currentUser.role === 'operation_manager') {
      const teamIds = state.teams.filter(t => t.managerId === currentUser.id).flatMap(t => t.agentIds);
      const leaderIds = state.teams.filter(t => t.managerId === currentUser.id).map(t => t.leaderId);
      return state.users.filter(u => u.id === currentUser.id || teamIds.includes(u.id) || leaderIds.includes(u.id));
    }
    if (currentUser.role === 'team_leader') {
      const team = state.teams.find(t => t.leaderId === currentUser.id);
      return state.users.filter(u => u.id === currentUser.id || !!team?.agentIds.includes(u.id));
    }
    return state.users;
  }, [currentUser, state.users, state.teams]);
  const visibleIds = new Set(visibleUsers.map(u => u.id));
  const campaignOptions = Array.from(new Set(state.leads.filter(l => visibleIds.has(l.agentId)).map(l => l.campaignCode))).sort();
  const leads = state.leads.filter(l => visibleIds.has(l.agentId) && (campaign === 'all' || l.campaignCode === campaign));
  const filteredCalls = leads.flatMap(l => l.callLogs.filter(c => inRange(c.timestamp, start, end)).map(c => ({ ...c, leadId: l.id, campaignCode: l.campaignCode, agentId: c.agentId || l.agentId })));
  const attemptedLeads = new Set(filteredCalls.map(c => c.leadId));
  const discoveryLeadIds = new Set(filteredCalls.filter(c => c.type === 'discovery').map(c => c.leadId));
  const nvm = filteredCalls.filter(c => c.type === 'nvm').length;
  const lvm = filteredCalls.filter(c => c.type === 'lvm').length;
  const discoveryCalls = filteredCalls.filter(c => c.type === 'discovery').length;
  const dueTouchPoints = leads.flatMap(l => l.touchPoints.map(tp => ({ ...tp, lead: l }))).filter(tp => tp.status === 'completed' || tp.status === 'overdue' || (tp.dueDate && inRange(tp.dueDate, start, end)));
  const completedTouchPoints = dueTouchPoints.filter(tp => tp.status === 'completed').length;
  const overdue = leads.filter(l => !l.stopped && !l.removedFromQueue && !l.expiredAt).flatMap(l => l.touchPoints).filter(tp => tp.status === 'overdue').length;
  const emails = state.emailLogs.filter(e => visibleIds.has(e.sentBy) && inRange(e.sentAt, start, end));
  const meetings = state.meetings.filter(m => (m.agentId ? visibleIds.has(m.agentId) : m.participantIds.some(id => visibleIds.has(id))) && inRange(m.date, start, end));
  const sales = state.sales.filter(s => visibleIds.has(s.agentId) && inRange(s.date, start, end));
  const byCampaign = campaignOptions.map(code => {
    const groupLeads = leads.filter(l => l.campaignCode === code);
    const groupCalls = filteredCalls.filter(c => c.campaignCode === code);
    const attempted = new Set(groupCalls.map(c => c.leadId));
    const reached = new Set(groupCalls.filter(c => c.type === 'discovery').map(c => c.leadId));
    return { code, leads: groupLeads.length, calls: groupCalls.length, discovery: reached.size, rate: pct(reached.size, attempted.size) };
  }).sort((a,b) => b.rate - a.rate);
  const byAgent = visibleUsers.filter(u => u.role === 'agent').map(u => {
    const agentLeads = leads.filter(l => l.agentId === u.id);
    const calls = filteredCalls.filter(c => c.agentId === u.id);
    const reached = new Set(calls.filter(c => c.type === 'discovery').map(c => c.leadId));
    const overdueCount = agentLeads.flatMap(l => l.touchPoints).filter(tp => tp.status === 'overdue').length;
    return { id: u.id, name: u.name, calls: calls.length, discovery: reached.size, rate: pct(reached.size, new Set(calls.map(c => c.leadId)).size), overdue: overdueCount };
  }).sort((a,b) => b.discovery - a.discovery);
  const maxCampaign = Math.max(1, ...byCampaign.map(x => x.discovery));
  const maxAgentCalls = Math.max(1, ...byAgent.map(x => x.calls));

  return <div className="space-y-6 overflow-y-auto p-1 pb-8">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div><div className="flex items-center gap-2"><BarChart3 className="h-6 w-6 text-blue-600"/><h2 className="text-xl font-bold text-slate-900">Data Analytics</h2></div><p className="mt-1 text-sm text-slate-500">Operational insights from leads, calls, meetings and sales.</p></div>
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="text-xs text-slate-500">From<input aria-label="Start date" type="date" value={start} max={end} onChange={e=>setStart(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"/></label>
        <label className="text-xs text-slate-500">To<input aria-label="End date" type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800"/></label>
        <label className="text-xs text-slate-500">Campaign<select value={campaign} onChange={e=>setCampaign(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800"><option value="all">All campaigns</option>{campaignOptions.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Leads in scope" value={leads.length} hint="Currently assigned leads" icon={Users}/>
      <Metric label="Call attempts" value={filteredCalls.length} hint={`${attemptedLeads.size} unique leads attempted`} icon={Phone}/>
      <Metric label="Discovery rate" value={`${pct(discoveryLeadIds.size, attemptedLeads.size)}%`} hint={`${discoveryLeadIds.size} leads reached Discovery / attempted leads`} icon={Target}/>
      <Metric label="Overdue touch points" value={overdue} hint="Open queue steps marked overdue" icon={AlertTriangle}/>
      <Metric label="Emails sent" value={emails.length} hint="Email logs in selected period" icon={Mail}/>
      <Metric label="Meetings" value={meetings.length} hint="Meetings scheduled in selected period" icon={CalendarDays}/>
      <Metric label="Sales recorded" value={sales.length} hint="Sales dated in selected period" icon={TrendingUp}/>
      <Metric label="Touch point completion" value={`${pct(completedTouchPoints, dueTouchPoints.length)}%`} hint={`${completedTouchPoints} completed of ${dueTouchPoints.length} tracked steps`} icon={BarChart3}/>
    </div>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Call outcomes</h3><p className="mb-5 mt-1 text-xs text-slate-500">Counts of call logs in the selected period.</p><div className="space-y-4"><Bar label="Discovery" value={discoveryCalls} max={Math.max(1,filteredCalls.length)}/><Bar label="LVM" value={lvm} max={Math.max(1,filteredCalls.length)}/><Bar label="NVM" value={nvm} max={Math.max(1,filteredCalls.length)}/></div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Discovery rate is calculated using unique leads reached via Discovery divided by unique leads with at least one call in this period.</div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-900">Campaign / Code performance</h3><p className="mb-5 mt-1 text-xs text-slate-500">Compare unique leads reached and discovery rate. Small samples can be misleading.</p>{byCampaign.length ? <div className="space-y-4">{byCampaign.map(c=><div key={c.code} className="space-y-1.5"><Bar label={c.code} value={c.discovery} max={maxCampaign} detail={`${c.rate}% discovery`}/><div className="text-xs text-slate-400">{c.leads} assigned leads · {c.calls} calls</div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">No campaign data for this scope.</p>}</section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-2"><h3 className="font-semibold text-slate-900">Agent activity</h3><p className="mb-4 mt-1 text-xs text-slate-500">Activity indicators—not a standalone measure of quality or performance.</p><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs text-slate-500"><th className="pb-3 font-medium">Agent</th><th className="pb-3 font-medium">Calls</th><th className="pb-3 font-medium">Discovery leads</th><th className="pb-3 font-medium">Discovery rate</th><th className="pb-3 font-medium">Overdue steps</th></tr></thead><tbody>{byAgent.map(a=><tr key={a.id} className="border-b border-slate-50 last:border-0"><td className="py-3 font-medium text-slate-800">{a.name}</td><td className="py-3"><div className="flex items-center gap-2"><span>{a.calls}</span><span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500" style={{width:`${a.calls/maxAgentCalls*100}%`}}/></span></div></td><td className="py-3">{a.discovery}</td><td className="py-3">{a.rate}%</td><td className="py-3"><span className={a.overdue ? 'font-semibold text-amber-700' : 'text-slate-500'}>{a.overdue}</span></td></tr>)}</tbody></table></div></section>
    </div>
    <p className="text-xs leading-5 text-slate-400">Note: these are prototype analytics calculated from the current app state. Historical workflow completion may be incomplete because this demo tracks current touch-point state; production reporting should use immutable event history and agreed KPI definitions. Sales are counts, not revenue, because sale value is not currently stored.</p>
  </div>;
}
