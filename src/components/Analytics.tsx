import { useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useStore } from '@/store';
import { campaignLabel } from '@/lib/workflow';
import { AGENT_SALES_TARGET, currentMonthKey, monthLabel } from '@/lib/sales';
import {
  byAgent, byCampaign, byHour, callStats, dataQuality, funnel, pct, reasonCounts, REASON_LABEL, type GroupRow,
} from '@/lib/analytics';

const card = 'bg-white rounded-xl border border-slate-200 p-5';

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={card}>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600 mt-0.5">{label}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

function Bar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

function GroupTable({ rows, first }: { rows: GroupRow[]; first: string }) {
  const th = 'px-3 py-2 text-left text-xs font-medium text-slate-500 whitespace-nowrap';
  const td = 'px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap';
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-100">
          <tr>
            <th className={th}>{first}</th><th className={th}>Leads</th><th className={th}>Calls</th>
            <th className={th}>Answer rate</th><th className={th}>Reach rate</th><th className={th}>Reached leads</th>
            <th className={th}>Sold leads</th><th className={th}>Conversion</th><th className={th}>Reached → sale</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-slate-50 last:border-0">
              <td className={`${td} font-medium text-slate-900`}>{r.label}</td>
              <td className={td}>{r.leads}</td><td className={td}>{r.calls}</td>
              <td className={td}>{r.answerRate}%</td><td className={td}>{r.reachRate}%</td><td className={td}>{r.reached}</td>
              <td className={td}>{r.sold}</td><td className={td}>{r.conversion}%</td><td className={td}>{r.reachToSale}%</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className={td} colSpan={9}>No data for this selection.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Analytics() {
  const { state } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId);
  const [campaign, setCampaign] = useState('all');

  // Scope: a Team Leader sees their team, the Operation Manager sees every team they manage
  const scope = useMemo(() => {
    if (!me) return { agents: [], teamIds: [] as string[] };
    const teams = me.role === 'team_leader'
      ? state.teams.filter(t => t.leaderId === me.id)
      : state.teams.filter(t => t.managerId === me.id);
    const ids = new Set(teams.flatMap(t => t.agentIds));
    return { agents: state.users.filter(u => ids.has(u.id)), teamIds: teams.map(t => t.id) };
  }, [me, state.teams, state.users]);

  const agentIds = useMemo(() => new Set(scope.agents.map(a => a.id)), [scope.agents]);
  const campaigns = useMemo(() => state.workflows.map(w => w.campaignCode), [state.workflows]);

  const leads = useMemo(
    () => state.leads.filter(l => agentIds.has(l.agentId) && (campaign === 'all' || l.campaignCode === campaign)),
    [state.leads, agentIds, campaign],
  );
  const leadIds = useMemo(() => new Set(leads.map(l => l.id)), [leads]);
  const sales = useMemo(() => state.sales.filter(s => leadIds.has(s.leadId)), [state.sales, leadIds]);

  const calls = callStats(leads);
  const f = funnel(leads, state.meetings, sales);
  const label = (c: string) => campaignLabel(state.workflows, c);
  const campaignRows = byCampaign(leads, sales, label);
  const agentRows = byAgent(leads, sales, scope.agents);
  const hours = byHour(leads);
  const reasons = reasonCounts(leads);
  const issues = dataQuality(state.leads.filter(l => agentIds.has(l.agentId)), state.sales.filter(s => agentIds.has(s.agentId)));

  const month = currentMonthKey();
  const monthSales = sales.filter(s => s.date.startsWith(month)).length;
  const target = scope.agents.length * AGENT_SALES_TARGET;
  const bestHour = [...hours].filter(h => h.calls >= 2).sort((a, b) => b.reachRate - a.reachRate || b.calls - a.calls)[0];

  const funnelSteps: [string, number][] = [
    ['Leads', f.leads], ['Contacted (at least one call)', f.contacted], ['Reached the right person', f.reached],
    ['Meeting arranged', f.meetings], ['Sold', f.sold],
  ];

  if (!me) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">
            {me.role === 'team_leader' ? 'Your team' : 'All your teams'} · {scope.agents.length} agents · {leads.length} leads
          </p>
        </div>
        <select
          value={campaign} onChange={e => setCampaign(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>{c} · {label(c)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Answer rate" value={`${calls.answerRate}%`} hint={`${calls.lvm + calls.discovery} of ${calls.calls} calls got a reply`} />
        <Kpi label="Reach rate" value={`${calls.reachRate}%`} hint="Right person on the line (Discovery)" />
        <Kpi label="Lead conversion" value={`${pct(f.sold, f.leads)}%`} hint={`${f.sold} of ${f.leads} leads sold`} />
        <Kpi label={`Sales in ${monthLabel(month)}`} value={`${monthSales} / ${target}`} hint={`${pct(monthSales, target)}% of target`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={card}>
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Lead funnel</h2>
          <div className="space-y-3">
            {funnelSteps.map(([name, n], i) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{name}</span>
                  <span className="text-slate-500">
                    {n}{i > 0 && funnelSteps[i - 1][1] > 0 && <span className="text-slate-400"> · {pct(n, funnelSteps[i - 1][1])}% of previous step</span>}
                  </span>
                </div>
                <Bar value={n} max={f.leads} color={i === funnelSteps.length - 1 ? 'bg-green-500' : 'bg-blue-500'} />
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Best time to call</h2>
          <p className="text-xs text-slate-500 mb-4">
            {bestHour ? `Highest reach rate: around ${bestHour.hour}:00 (${bestHour.reachRate}% of ${bestHour.calls} calls).` : 'Needs at least 2 calls in the same hour.'}
          </p>
          <div className="space-y-2.5">
            {hours.map(h => (
              <div key={h.hour} className="flex items-center gap-3">
                <div className="w-12 text-xs text-slate-500">{String(h.hour).padStart(2, '0')}:00</div>
                <div className="flex-1"><Bar value={h.reachRate} max={100} color="bg-teal-500" /></div>
                <div className="w-28 text-xs text-slate-500 text-right">{h.reachRate}% of {h.calls} calls</div>
              </div>
            ))}
            {hours.length === 0 && <div className="text-sm text-slate-400">No calls logged yet.</div>}
          </div>
        </div>
      </div>

      <div className={card}>
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Campaigns</h2>
        <GroupTable rows={campaignRows} first="Campaign" />
      </div>

      <div className={card}>
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Agents</h2>
        <GroupTable rows={agentRows} first="Agent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={card}>
          <h2 className="text-sm font-semibold text-slate-900 mb-1">What agents report on calls</h2>
          <p className="text-xs text-slate-500 mb-4">Taken from the call reason, or read from the comment when no reason was chosen.</p>
          <div className="space-y-3">
            {reasons.map(r => (
              <div key={r.reason}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{REASON_LABEL[r.reason]}</span>
                  <span className="text-slate-500">{r.count} · {r.share}%</span>
                </div>
                <Bar value={r.count} max={reasons[0]?.count ?? 1} color="bg-violet-500" />
              </div>
            ))}
            {reasons.length === 0 && <div className="text-sm text-slate-400">No calls logged yet.</div>}
          </div>
        </div>

        <div className={card}>
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Data quality</h2>
          <div className="space-y-2.5">
            {issues.map(i => (
              <div key={i.id} className={`flex gap-2.5 text-sm rounded-lg px-3 py-2.5 ${i.level === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
                {i.level === 'warn' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
                <span>{i.text}</span>
              </div>
            ))}
            {issues.length === 0 && <div className="text-sm text-slate-500">No problems found in the data.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
