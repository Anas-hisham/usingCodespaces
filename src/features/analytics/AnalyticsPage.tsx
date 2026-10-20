import { AlertTriangle, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { REASON_LABEL, reasonCounts } from '@/domain/analytics/commentClassifier';
import { findDataQualityIssues } from '@/domain/analytics/dataQuality';
import { isInRange, leadsForPeriod, resolveRange } from '@/domain/analytics/dateRange';
import type { DateRange, PeriodPreset } from '@/domain/analytics/dateRange';
import { byAgent, byCampaign, byHour, callStats, funnel, pct } from '@/domain/analytics/performanceMetrics';
import { AGENT_SALES_TARGET } from '@/domain/sales/salesTargets';
import { campaignLabel } from '@/domain/workflow/campaignLabel';
import { CARD_CLASS } from '@/features/analytics/analyticsStyles';
import { GroupPerformanceTable } from '@/features/analytics/components/GroupPerformanceTable';
import { HorizontalBar } from '@/features/analytics/components/HorizontalBar';
import { KpiCard } from '@/features/analytics/components/KpiCard';
import { PeriodPicker } from '@/features/analytics/components/PeriodPicker';
import { localDateStr } from '@/shared/lib/dates';
import { useStore } from '@/store';

export function AnalyticsPage() {
  const { state } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId);
  const [campaign, setCampaign] = useState('all');
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [custom, setCustom] = useState<DateRange>({ from: localDateStr(), to: localDateStr() });
  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);
  const isAgent = me?.role === 'agent';

  // Scope: a Team Leader sees their team, the Operation Manager sees every team they manage
  const scope = useMemo(() => {
    if (!me) return { agents: [], teamIds: [] as string[] };
    if (me.role === 'agent') return { agents: [me], teamIds: [] as string[] };   // an agent sees only their own numbers
    const teams = me.role === 'team_leader'
      ? state.teams.filter(t => t.leaderId === me.id)
      : state.teams.filter(t => t.managerId === me.id);
    const ids = new Set(teams.flatMap(t => t.agentIds));
    return { agents: state.users.filter(u => ids.has(u.id)), teamIds: teams.map(t => t.id) };
  }, [me, state.teams, state.users]);

  const agentIds = useMemo(() => new Set(scope.agents.map(a => a.id)), [scope.agents]);
  const campaigns = useMemo(() => state.workflows.map(w => w.campaignCode), [state.workflows]);

  // the agent's leads (and campaign), over all time; the period is applied on top of them
  const baseLeads = useMemo(
    () => state.leads.filter(l => agentIds.has(l.agentId) && (campaign === 'all' || l.campaignCode === campaign)),
    [state.leads, agentIds, campaign],
  );
  const baseIds = useMemo(() => new Set(baseLeads.map(l => l.id)), [baseLeads]);
  const sales = useMemo(
    () => state.sales.filter(s => baseIds.has(s.leadId) && isInRange(s.date, range)),
    [state.sales, baseIds, range],
  );
  const meetings = useMemo(() => state.meetings.filter(m => isInRange(m.date, range)), [state.meetings, range]);
  const leads = useMemo(
    () => leadsForPeriod(baseLeads, range, new Set(sales.map(s => s.leadId))),
    [baseLeads, range, sales],
  );

  const calls = callStats(leads);
  const f = funnel(leads, meetings, sales);
  const label = (c: string) => campaignLabel(state.workflows, c);
  const campaignRows = byCampaign(leads, sales, label);
  const agentRows = byAgent(leads, sales, scope.agents);
  const hours = byHour(leads);
  const reasons = reasonCounts(leads);
  const issues = findDataQualityIssues(state.leads.filter(l => agentIds.has(l.agentId)), state.sales.filter(s => agentIds.has(s.agentId)));

  const target = scope.agents.length * AGENT_SALES_TARGET;   // the sales target is monthly
  const periodName = { today: 'today', week: 'this week', month: 'this month', custom: 'the selected period' }[preset];
  const rangeText = range.from === range.to ? range.from : `${range.from} → ${range.to}`;
  const bestHour = [...hours].filter(h => h.calls >= 2).sort((a, b) => b.reachRate - a.reachRate || b.calls - a.calls)[0];

  // What happened on the calls (the number of leads is deliberately not shown: only calls and their results matter)
  const callResults: [string, number, string][] = [
    ['No answer (NVM)', calls.nvm, 'bg-slate-400'],
    ['Answered, wrong person / voicemail (LVM)', calls.lvm, 'bg-amber-500'],
    ['Reached the right person (Discovery)', calls.discovery, 'bg-emerald-500'],
  ];

  if (!me) return null;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{isAgent ? 'My Analytics' : 'Analytics'}</h1>
          <p className="text-sm text-slate-600">
            {isAgent ? 'Your own numbers' : `${me.role === 'team_leader' ? 'Your team' : 'All your teams'} · ${scope.agents.length} agents`} · {calls.calls} calls · {rangeText}
          </p>
        </div>
        <PeriodPicker preset={preset} custom={custom} onPreset={setPreset} onCustom={setCustom} />
        <select
          value={campaign} onChange={e => setCampaign(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>{c} · {label(c)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Calls made" value={String(calls.calls)} hint={`${calls.nvm} NVM · ${calls.lvm} LVM · ${calls.discovery} Discovery`} />
        <KpiCard label="Answered" value={String(calls.lvm + calls.discovery)} hint={`Answer rate ${calls.answerRate}% of calls`} />
        <KpiCard label="Reached (Discovery)" value={String(calls.discovery)} hint={`Reach rate ${calls.reachRate}% of calls`} />
        {preset === 'month'
          ? <KpiCard label="Sales this month" value={`${sales.length} / ${target}`} hint={`${pct(sales.length, target)}% of target`} />
          : <KpiCard label={`Sales ${periodName}`} value={String(sales.length)} hint="Monthly target is shown in 'This month'" />}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Call results</h2>
          <div className="space-y-3">
            {callResults.map(([name, n, color]) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{name}</span>
                  <span className="text-slate-600">{n} · {pct(n, calls.calls)}% of calls</span>
                </div>
                <HorizontalBar value={n} max={calls.calls} color={color} />
              </div>
            ))}
            {calls.calls === 0 && <div className="text-sm text-slate-500">No calls in this period.</div>}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-6 text-sm text-slate-600">
            <span>Meetings arranged: <b className="text-slate-900">{f.meetings}</b></span>
            <span>Sales: <b className="text-slate-900">{sales.length}</b></span>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Best time to call</h2>
          <p className="text-xs text-slate-600 mb-4">
            {bestHour ? `Highest reach rate: around ${bestHour.hour}:00 (${bestHour.reachRate}% of ${bestHour.calls} calls).` : 'Needs at least 2 calls in the same hour.'}
          </p>
          <div className="space-y-2.5">
            {hours.map(h => (
              <div key={h.hour} className="flex items-center gap-3">
                <div className="w-12 text-xs text-slate-600">{String(h.hour).padStart(2, '0')}:00</div>
                <div className="flex-1"><HorizontalBar value={h.reachRate} max={100} color="bg-cyan-500" /></div>
                <div className="w-28 text-xs text-slate-600 text-right">{h.reachRate}% of {h.calls} calls</div>
              </div>
            ))}
            {hours.length === 0 && <div className="text-sm text-slate-500">No calls in this period.</div>}
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Campaigns</h2>
        <GroupPerformanceTable rows={campaignRows} first="Campaign" />
      </div>

      {!isAgent && (
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Agents</h2>
          <GroupPerformanceTable rows={agentRows} first="Agent" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={CARD_CLASS}>
          <h2 className="text-sm font-semibold text-slate-900 mb-1">What agents report on calls</h2>
          <p className="text-xs text-slate-600 mb-4">Taken from the call reason, or read from the comment when no reason was chosen.</p>
          <div className="space-y-3">
            {reasons.map(r => (
              <div key={r.reason}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{REASON_LABEL[r.reason]}</span>
                  <span className="text-slate-600">{r.count} · {r.share}%</span>
                </div>
                <HorizontalBar value={r.count} max={reasons[0]?.count ?? 1} color="bg-cyan-500" />
              </div>
            ))}
            {reasons.length === 0 && <div className="text-sm text-slate-500">No calls in this period.</div>}
          </div>
        </div>

        {!isAgent && (
          <div className={CARD_CLASS}>
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Data quality</h2>
            <div className="space-y-2.5">
              {issues.map(i => (
                <div key={i.id} className={`flex gap-2.5 text-sm rounded-lg px-3 py-2.5 ${i.level === 'warn' ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700'}`}>
                  {i.level === 'warn' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{i.text}</span>
                </div>
              ))}
              {issues.length === 0 && <div className="text-sm text-slate-600">No problems found in the data.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
