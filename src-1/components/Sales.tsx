import { useMemo, useState } from 'react';
import {
  Plus, X, Trash2, ChevronLeft, ChevronRight, Target, Trophy,
  ArrowDownWideNarrow, ArrowUpNarrowWide,
} from 'lucide-react';
import { useStore, addSale, deleteSale } from '@/store';
import type { AppState } from '@/store';
import { LeadPicker } from '@/components/LeadPicker';
import {
  AGENT_SALES_TARGET, SALE_TYPES, saleTypeConfig, countByType, teamSalesTarget,
  currentMonthKey, localDateStr, shiftMonth, monthLabel,
} from '@/lib/sales';
import type { Sale, SaleType, Team, User } from '@/types';

type Dir = 'desc' | 'asc';

interface Group { team: Team; leader?: User; agents: User[] }

// ---------------------------------------------------------------------------
// small building blocks
// ---------------------------------------------------------------------------
function Progress({ count, target }: { count: number; target: number }) {
  const pct = target > 0 ? Math.min((count / target) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
          style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-700 shrink-0 w-24 text-right">
        {count}/{target} ({Math.round(pct)}%)
      </span>
    </div>
  );
}

function TypeChips({ sales }: { sales: Sale[] }) {
  const counts = countByType(sales);
  return (
    <div className="flex flex-wrap gap-1.5">
      {SALE_TYPES.map(t => (
        <span
          key={t.value}
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${counts[t.value] > 0 ? t.chip : 'bg-slate-50 text-slate-400'}`}
        >
          {t.label} {counts[t.value]}
        </span>
      ))}
    </div>
  );
}

function Avatar({ user, size = 'w-9 h-9' }: { user: User; size?: string }) {
  return (
    <div className={`${size} rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0`} style={{ backgroundColor: user.color }}>
      {user.initials}
    </div>
  );
}

function SortButton({ dir, onToggle, label }: { dir: Dir; onToggle: () => void; label: string }) {
  const Icon = dir === 'desc' ? ArrowDownWideNarrow : ArrowUpNarrowWide;
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
      title="Switch between descending and ascending"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}: {dir === 'desc' ? 'Descending' : 'Ascending'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------
export function Sales() {
  const { state, dispatch } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId)!;
  const isQuality = me.role === 'quality';
  const isAgent = me.role === 'agent';
  const isTL = me.role === 'team_leader';
  const isOM = me.role === 'operation_manager';

  const [month, setMonth] = useState(currentMonthKey());
  const [rowDir, setRowDir] = useState<Dir>('desc');     // order of agents / teams by number of sales
  const [listDir, setListDir] = useState<Dir>('desc');   // order of the sales list by date
  const [showForm, setShowForm] = useState(false);

  // Which teams/agents this person is allowed to see
  const groups: Group[] = useMemo(() => {
    const build = (t: Team): Group => ({
      team: t,
      leader: state.users.find(u => u.id === t.leaderId),
      agents: state.users.filter(u => t.agentIds.includes(u.id)),
    });
    if (isAgent) {
      const t = state.teams.find(x => x.agentIds.includes(me.id));
      return t ? [{ ...build(t), agents: [me] }] : [];
    }
    if (isTL) return state.teams.filter(t => t.leaderId === me.id).map(build);
    if (isOM) return state.teams.filter(t => t.managerId === me.id).map(build);
    return state.teams.map(build);                      // quality sees everyone
  }, [state.teams, state.users, me, isAgent, isTL, isOM]);

  const visibleAgentIds = useMemo(() => new Set(groups.flatMap(g => g.agents.map(a => a.id))), [groups]);

  const monthSales = useMemo(
    () => state.sales.filter(s => s.date.startsWith(month) && visibleAgentIds.has(s.agentId)),
    [state.sales, month, visibleAgentIds],
  );

  const salesOf = (agentIds: string[]) => monthSales.filter(s => agentIds.includes(s.agentId));
  const targetOf = (g: Group) => (isAgent ? AGENT_SALES_TARGET : teamSalesTarget({ agentIds: g.agents.map(a => a.id) }));

  const totalTarget = groups.reduce((n, g) => n + targetOf(g), 0);
  const totalCount = monthSales.length;

  const dirMul = rowDir === 'desc' ? -1 : 1;
  const sortedGroups = useMemo(() => {
    const countOf = (g: Group) => monthSales.filter(s => g.agents.some(a => a.id === s.agentId)).length;
    return [...groups]
      .map(g => ({
        ...g,
        agents: [...g.agents].sort((a, b) =>
          dirMul * (monthSales.filter(s => s.agentId === a.id).length - monthSales.filter(s => s.agentId === b.id).length)
          || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => dirMul * (countOf(a) - countOf(b)) || a.team.name.localeCompare(b.team.name));
  }, [groups, monthSales, dirMul]);

  const sortedSales = useMemo(
    () => [...monthSales].sort((a, b) => (listDir === 'desc' ? -1 : 1) * (a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))),
    [monthSales, listDir],
  );

  const showTeamHeaders = isOM || isQuality;
  const title = isAgent ? 'My Sales' : isTL ? `${groups[0]?.team.name ?? 'Team'} Sales` : isOM ? 'Team Sales' : 'Sales';
  const summaryLabel = isAgent ? 'My monthly target' : isTL ? 'Team monthly target' : isOM ? 'All teams monthly target' : 'Company monthly target';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">
            {isQuality ? 'Record every sale and follow each agent\u2019s progress' : 'Sales recorded by Quality'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-l-lg" aria-label="Previous month">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="px-3 text-sm font-medium text-slate-700 min-w-[130px] text-center">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} className="w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-r-lg" aria-label="Next month">
              <ChevronRight className="w-4 h-4 text-slate-500" />
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
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">{summaryLabel}</span>
          </div>
          <span className="text-sm font-bold text-slate-900">{totalCount} / {totalTarget}</span>
        </div>
        <Progress count={totalCount} target={totalTarget} />
        <div className="mt-3"><TypeChips sales={monthSales} /></div>
        {!isAgent && (
          <p className="text-xs text-slate-400 mt-3">
            Each agent: {AGENT_SALES_TARGET} sales a month. A team's target is its number of agents × {AGENT_SALES_TARGET}.
          </p>
        )}
      </div>

      {/* Agents / teams */}
      {!isAgent && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {isTL ? 'Agents' : isOM ? 'Team leaders & agents' : 'All agents by team'}
            </h3>
            <SortButton dir={rowDir} onToggle={() => setRowDir(d => (d === 'desc' ? 'asc' : 'desc'))} label="Sales" />
          </div>

          {sortedGroups.length === 0 && <p className="text-sm text-slate-400">No teams to show.</p>}

          <div className="space-y-4">
            {sortedGroups.map(g => {
              const gSales = salesOf(g.agents.map(a => a.id));
              return (
                <div key={g.team.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {showTeamHeaders && (
                    <div className="p-4 bg-slate-50/60 border-b border-slate-100">
                      <div className="flex items-center gap-3 mb-3">
                        {g.leader && <Avatar user={g.leader} />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{g.leader?.name ?? g.team.name}</div>
                          <div className="text-xs text-slate-500">{g.team.name} • Team Leader • {g.agents.length} agents</div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-slate-900">
                          <Trophy className="w-4 h-4 text-amber-500" /> {gSales.length}
                        </div>
                      </div>
                      <Progress count={gSales.length} target={targetOf(g)} />
                      <div className="mt-2"><TypeChips sales={gSales} /></div>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {g.agents.map(a => {
                      const aSales = monthSales.filter(s => s.agentId === a.id);
                      return (
                        <div key={a.id} className="p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar user={a} size="w-8 h-8" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-900">{a.name}</div>
                              <div className="text-xs text-slate-500">@{a.username}</div>
                            </div>
                          </div>
                          <Progress count={aSales.length} target={AGENT_SALES_TARGET} />
                          <TypeChips sales={aSales} />
                        </div>
                      );
                    })}
                    {g.agents.length === 0 && <div className="p-4 text-sm text-slate-400">No agents in this team.</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sales list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {isAgent ? 'My sales' : 'Sales'} <span className="text-slate-400 font-normal">({sortedSales.length})</span>
          </h3>
          <SortButton dir={listDir} onToggle={() => setListDir(d => (d === 'desc' ? 'asc' : 'desc'))} label="Date" />
        </div>

        {sortedSales.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No sales in {monthLabel(month)}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {sortedSales.map(s => {
              const agent = state.users.find(u => u.id === s.agentId);
              const cfg = saleTypeConfig(s.saleType);
              return (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/40">
                  <div className="w-20 text-xs text-slate-500 shrink-0">
                    {new Date(`${s.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{s.leadName}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {s.product}{!isAgent && agent ? ` • ${agent.name}` : ''}
                    </div>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.chip}`}>{cfg.label}</span>
                  {isQuality && (
                    <button
                      onClick={() => { if (window.confirm('Delete this sale?')) dispatch(deleteSale(s.id)); }}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"
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
      </div>

      {showForm && isQuality && (
        <RecordSaleModal
          state={state}
          me={me}
          onClose={() => setShowForm(false)}
          onSave={sale => {
            dispatch(addSale(sale));
            // jump to the month of the sale so Quality sees it appear
            setMonth(sale.date.slice(0, 7));
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quality: record a sale  (choose or write the lead, choose or write what the customer got)
// ---------------------------------------------------------------------------
function RecordSaleModal({
  state, me, onClose, onSave,
}: {
  state: AppState;
  me: User;
  onClose: () => void;
  onSave: (sale: Sale) => void;
}) {
  const agents = state.users.filter(u => u.role === 'agent');
  const [agentId, setAgentId] = useState('');
  const [leadMode, setLeadMode] = useState<'pick' | 'write'>('pick');
  const [leadId, setLeadId] = useState('');
  const [leadText, setLeadText] = useState('');
  const [saleType, setSaleType] = useState<SaleType>('new');
  const [product, setProduct] = useState('');
  const [date, setDate] = useState(localDateStr());

  const agentLeads = useMemo(() => state.leads.filter(l => l.agentId === agentId), [state.leads, agentId]);
  const pickedLead = state.leads.find(l => l.id === leadId);
  const knownProducts = useMemo(() => [...new Set(state.sales.map(s => s.product))].sort(), [state.sales]);

  const leadName = leadMode === 'pick' ? pickedLead?.companyName ?? '' : leadText.trim();
  const canSave = !!agentId && !!leadName && !!product.trim() && !!date;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(),
      agentId,
      leadId: leadMode === 'pick' ? leadId : undefined,
      leadName,
      saleType,
      product: product.trim(),
      date,
      createdBy: me.id,
      createdAt: new Date().toISOString(),
    });
  };

  const input = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Record Sale</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Agent</label>
            <select
              value={agentId}
              onChange={e => { setAgentId(e.target.value); setLeadId(''); }}
              className={input}
            >
              <option value="">Select agent...</option>
              {state.teams.map(t => (
                <optgroup key={t.id} label={t.name}>
                  {agents.filter(a => t.agentIds.includes(a.id)).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Lead</label>
              <button
                type="button"
                onClick={() => setLeadMode(m => (m === 'pick' ? 'write' : 'pick'))}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {leadMode === 'pick' ? 'Type it instead' : "Pick from agent's leads"}
              </button>
            </div>
            {leadMode === 'pick' ? (
              agentId ? (
                <LeadPicker leads={agentLeads} value={leadId} onChange={setLeadId} placeholder="Search this agent's leads..." />
              ) : (
                <div className="px-4 py-2.5 rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">Choose an agent first</div>
              )
            ) : (
              <input
                type="text" value={leadText} onChange={e => setLeadText(e.target.value)}
                placeholder="Company or customer name" className={input}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sale type</label>
            <div className="flex gap-2">
              {SALE_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setSaleType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    saleType === t.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">What the customer got</label>
            <input
              type="text" list="known-products" value={product} onChange={e => setProduct(e.target.value)}
              placeholder="Choose a previous one or write a new one" className={input}
            />
            <datalist id="known-products">
              {knownProducts.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sale date</label>
            <input type="date" value={date} max={localDateStr()} onChange={e => setDate(e.target.value)} className={input} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all"
          >
            Save Sale
          </button>
        </div>
      </div>
    </div>
  );
}
