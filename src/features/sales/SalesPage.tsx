import { ChevronDown, ChevronLeft, ChevronRight, Crown, Plus, Target, Trash2, Trophy } from 'lucide-react';
import { lobOfTeam } from '@/domain/org/orgRules';
import { useMemo, useState } from 'react';
import { topAgentsOfMonth } from '@/domain/sales/salesLeaderboard';
import { saleTypeConfig } from '@/domain/sales/saleTypes';
import { AGENT_SALES_TARGET, teamSalesTarget } from '@/domain/sales/salesTargets';
import type { Team } from '@/domain/types';
import { AgentSalesDetails } from '@/features/sales/components/AgentSalesDetails';
import { RecordSaleModal } from '@/features/sales/components/RecordSaleModal';
import { SaleTypeChips } from '@/features/sales/components/SaleTypeChips';
import { SortDirectionButton } from '@/features/sales/components/SortDirectionButton';
import { TargetProgressBar } from '@/features/sales/components/TargetProgressBar';
import { TopAgentsCard } from '@/features/sales/components/TopAgentsCard';
import type { SortDirection, TeamGroup } from '@/features/sales/salesTypes';
import { Collapsible } from '@/shared/components/Collapsible';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { UserAvatar } from '@/shared/components/UserAvatar';
import { usePagination } from '@/shared/hooks/usePagination';
import { currentMonthKey, monthLabel, shiftMonth } from '@/shared/lib/dates';
import { deleteSale, recordSale, useStore } from '@/store';

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------
export function SalesPage() {
  const { state, dispatch } = useStore();
  const { ask, dialog: confirmDialog } = useConfirm();
  const me = state.users.find(u => u.id === state.currentUserId)!;
  const isQuality = me.role === 'quality';
  const isAgent = me.role === 'agent';
  const isTL = me.role === 'team_leader';
  const isOM = me.role === 'operation_manager';

  const [month, setMonth] = useState(currentMonthKey());
  const [rowDir, setRowDir] = useState<SortDirection>('desc');     // order of agents / teams by number of sales
  const [listDir, setListDir] = useState<SortDirection>('desc');   // order of the sales list by date
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());   // agents whose "More details" is open
  const toggleExpanded = (id: string) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Everyone can see every team's sales (it keeps the floor motivated).
  const groups: TeamGroup[] = useMemo(() => {
    const build = (t: Team): TeamGroup => ({
      team: t,
      leader: state.users.find(u => u.id === t.leaderId),
      agents: state.users.filter(u => t.agentIds.includes(u.id)),
    });
    return state.teams.map(build);
  }, [state.teams, state.users]);

  // "My" scope: what the summary card and the sales list below it are about
  const scopeGroups = useMemo(() => {
    if (isAgent) return groups.map(g => ({ ...g, agents: g.agents.filter(a => a.id === me.id) })).filter(g => g.agents.length > 0);
    if (isTL) return groups.filter(g => g.team.leaderId === me.id);
    if (isOM) return groups.filter(g => g.team.managerId === me.id);
    return groups.filter(g => lobOfTeam(state.users, g.team) === me.lob);   // quality: the teams of its line of business
  }, [groups, me, isAgent, isTL, isOM, state.users]);

  const scopeAgentIds = useMemo(() => new Set(scopeGroups.flatMap(g => g.agents.map(a => a.id))), [scopeGroups]);

  const allMonthSales = useMemo(() => state.sales.filter(s => s.date.startsWith(month)), [state.sales, month]);
  const monthSales = useMemo(() => allMonthSales.filter(s => scopeAgentIds.has(s.agentId)), [allMonthSales, scopeAgentIds]);

  const topAgents = useMemo(
    () => topAgentsOfMonth(state.users.filter(u => u.role === 'agent'), state.sales, state.leads, month, 5),
    [state.users, state.sales, state.leads, month],
  );

  // Lead details are private: an agent opens only their own, a team leader only their team's, the OM and Quality everyone's.
  const canSeeDetails = (agentId: string) => {
    if (isAgent) return agentId === me.id;
    if (isTL) return groups.some(g => g.team.leaderId === me.id && g.agents.some(a => a.id === agentId));
    if (isQuality) return state.users.find(u => u.id === agentId)?.qualityId === me.id;   // only the agents it follows
    return true;
  };

  const salesOf = (agentIds: string[]) => allMonthSales.filter(s => agentIds.includes(s.agentId));
  const targetOf = (g: TeamGroup) => teamSalesTarget({ agentIds: g.agents.map(a => a.id) });

  const totalTarget = scopeGroups.reduce((n, g) => n + targetOf(g), 0);
  const totalCount = monthSales.length;

  const dirMul = rowDir === 'desc' ? -1 : 1;
  const sortedGroups = useMemo(() => {
    const countOf = (g: TeamGroup) => allMonthSales.filter(s => g.agents.some(a => a.id === s.agentId)).length;
    return [...groups]
      .map(g => ({
        ...g,
        agents: [...g.agents].sort((a, b) =>
          dirMul * (allMonthSales.filter(s => s.agentId === a.id).length - allMonthSales.filter(s => s.agentId === b.id).length)
          || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => dirMul * (countOf(a) - countOf(b)) || a.team.name.localeCompare(b.team.name));
  }, [groups, allMonthSales, dirMul]);

  const sortedSales = useMemo(
    () => [...monthSales].sort((a, b) => (listDir === 'desc' ? -1 : 1) * (a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))),
    [monthSales, listDir],
  );

  const salesPage = usePagination(sortedSales, 15);

  const title = isAgent ? 'My Sales' : isTL ? `${scopeGroups[0]?.team.name ?? 'Team'} Sales` : isOM ? 'Team Sales' : 'Sales';
  const summaryLabel = isAgent ? 'My monthly target' : isTL ? 'Team monthly target' : isOM ? 'All teams monthly target' : 'Company monthly target';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">
            {isQuality ? 'Record every sale and follow each agent\u2019s progress' : 'Sales recorded by Quality \u00b7 everyone can see everyone\u2019s sales'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-l-lg" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="px-3 text-sm font-medium text-slate-700 min-w-[130px] text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-r-lg" aria-label="Next month">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
          {isQuality && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Sale
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">{summaryLabel}</span>
          </div>
          <span className="text-sm font-bold text-slate-900">{totalCount} / {totalTarget}</span>
        </div>
        <TargetProgressBar count={totalCount} target={totalTarget} />
        <div className="mt-3"><SaleTypeChips sales={monthSales} /></div>
        {!isAgent && (
          <p className="text-xs text-slate-500 mt-3">
            Each agent: {AGENT_SALES_TARGET} sales a month. A team's target is its number of agents × {AGENT_SALES_TARGET}.
          </p>
        )}
      </div>

      {/* Top 5 */}
      <TopAgentsCard ranks={topAgents} teams={state.teams} meId={me.id} monthName={monthLabel(month)} />

      {/* All teams: team leader is clearly marked, agents below can open "More details" */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">All teams</h3>
          <SortDirectionButton dir={rowDir} onToggle={() => setRowDir(d => (d === 'desc' ? 'asc' : 'desc'))} label="Sales" />
        </div>

        {sortedGroups.length === 0 && <p className="text-sm text-slate-500">No teams to show.</p>}

        <div className="space-y-4">
          {sortedGroups.map(g => {
            const gSales = salesOf(g.agents.map(a => a.id));
            return (
              <Collapsible
                key={g.team.id}
                defaultOpen={scopeGroups.some(sg => sg.team.id === g.team.id)}   /* my own team(s) open, the others closed until clicked */
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                headerClassName="p-4 bg-violet-50 hover:bg-violet-100/60 transition-colors border-l-4 border-l-violet-500"
                header={
                  <div>
                  <div className="flex items-center gap-3 mb-3">
                    {g.leader && (
                      <div className="rounded-full ring-2 ring-violet-400 ring-offset-2 ring-offset-violet-50"><UserAvatar user={g.leader} /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{g.leader?.name ?? g.team.name}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" /> Team Leader
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">{g.team.name} • {g.agents.length} agents</div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                      <Trophy className="w-4 h-4 text-amber-500" /> {gSales.length}
                    </div>
                  </div>
                  <TargetProgressBar count={gSales.length} target={targetOf(g)} />
                  <div className="mt-2"><SaleTypeChips sales={gSales} /></div>
                                  </div>
                }
              >
                <div className="divide-y divide-slate-100">
                  {g.agents.map(a => {
                    const aSales = allMonthSales.filter(s => s.agentId === a.id);
                    const canOpen = canSeeDetails(a.id);
                    const open = canOpen && expanded.has(a.id);
                    const isMe = a.id === me.id;
                    return (
                      <div key={a.id} className={`p-4 flex flex-col gap-2 ${isMe ? 'bg-blue-50/40' : ''}`}>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={a} size="w-8 h-8" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900">
                              {a.name}
                              <span className="ml-1.5 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full">Agent</span>
                              {isMe && <span className="ml-1 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">You</span>}
                            </div>
                            <div className="text-xs text-slate-600">@{a.username}</div>
                          </div>
                          {canOpen && <button
                            onClick={() => toggleExpanded(a.id)}
                            aria-expanded={open}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors shrink-0"
                          >
                            More details
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </button>}
                        </div>
                        <TargetProgressBar count={aSales.length} target={AGENT_SALES_TARGET} />
                        <SaleTypeChips sales={aSales} />
                        {open && (
                          <div className="mt-1 pt-3 border-t border-slate-100">
                            <AgentSalesDetails sales={aSales} leads={state.leads} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {g.agents.length === 0 && <div className="p-4 text-sm text-slate-500">No agents in this team.</div>}
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {isAgent ? 'My sales' : isTL ? 'Team sales' : isOM ? 'My teams\u2019 sales' : 'Sales'} <span className="text-slate-500 font-normal">({sortedSales.length})</span>
          </h3>
          <SortDirectionButton dir={listDir} onToggle={() => setListDir(d => (d === 'desc' ? 'asc' : 'desc'))} label="Date" />
        </div>

        {sortedSales.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No sales in {monthLabel(month)}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {salesPage.pageItems.map(s => {
              const agent = state.users.find(u => u.id === s.agentId);
              const cfg = saleTypeConfig(s.saleType);
              const lead = state.leads.find(l => l.id === s.leadId);
              const sameLead = monthSales.filter(x => x.leadId === s.leadId).length;
              return (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/40">
                  <div className="w-20 text-xs text-slate-600 shrink-0">
                    {new Date(`${s.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{s.leadName}</div>
                    <div className="text-xs text-slate-600 truncate">
                      {!isAgent && agent && <>{agent.name} · </>}
                      {lead ? `${lead.leadCode} · ${lead.campaignCode}` : ''}
                    </div>
                  </div>
                  {sameLead > 1 && <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 shrink-0">{sameLead} sales on this lead</span>}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.chip}`}>{cfg.label}</span>
                  {isQuality && state.users.find(u => u.id === s.agentId)?.qualityId === me.id && (
                    <button
                      onClick={() => ask(
                        { title: 'Delete this sale?', message: <>The {s.saleType} sale for <b>{s.leadName}</b> will be deleted. This can’t be undone.</>, confirmLabel: 'Delete', tone: 'danger' },
                        () => dispatch(deleteSale(s.id)),
                      )}
                      className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shrink-0"
                      title="Delete sale"
                      aria-label="Delete sale"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="px-5 pb-4"><Pagination {...salesPage} onPage={salesPage.setPage} /></div>
      </div>

      {confirmDialog}

      {showForm && isQuality && (
        <RecordSaleModal
          state={state}
          me={me}
          onClose={() => setShowForm(false)}
          onSave={sale => {
            dispatch(recordSale(sale));
            // jump to the month of the sale so Quality sees it appear
            setMonth(sale.date.slice(0, 7));
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
