import { Building2, Database, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { normalizeLeadCode } from '@/domain/lead/leadCode';
import { isInPool } from '@/domain/lead/leadPool';
import { campaignLabel } from '@/domain/workflow/campaignLabel';
import { AddSingleLeadModal } from '@/features/lead-pool/components/AddSingleLeadModal';
import { PasteLeadsModal } from '@/features/lead-pool/components/PasteLeadsModal';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { addLeadsToPool, deleteLeadsAsAdmin, useStore } from '@/store';

export function LeadPoolPage() {
  const { state, dispatch } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId)!;
  const [showPaste, setShowPaste] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'pool' | 'assigned'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { ask, dialog: confirmDialog } = useConfirm();

  const rows = useMemo(() => {
    const nq = normalizeLeadCode(q), raw = q.trim().toLowerCase();
    return state.leads.filter(l => {
      if (filter === 'pool' && !isInPool(l)) return false;
      if (filter === 'assigned' && isInPool(l)) return false;
      if (!raw) return true;
      return (nq && normalizeLeadCode(l.leadCode).includes(nq)) || l.companyName.toLowerCase().includes(raw) || l.contactName.toLowerCase().includes(raw);
    });
  }, [state.leads, q, filter]);

  const poolCount = state.leads.filter(isInPool).length;
  // a lead with a recorded sale cannot be deleted (the sale and the reports point at it)
  const soldIds = useMemo(() => new Set(state.sales.map(s => s.leadId)), [state.sales]);
  const shown = rows.slice(0, 300);
  const deletable = shown.filter(l => !soldIds.has(l.id));
  const allShownSelected = deletable.length > 0 && deletable.every(l => selected.has(l.id));
  const toggle = (id: string) => setSelected(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected(p => {
    const n = new Set(p);
    if (allShownSelected) deletable.forEach(l => n.delete(l.id)); else deletable.forEach(l => n.add(l.id));
    return n;
  });
  const askDelete = (ids: string[]) => {
    const n = ids.length;
    const only = n === 1 ? state.leads.find(l => l.id === ids[0]) : undefined;
    ask(
      {
        title: n === 1 ? 'Delete this lead?' : `Delete ${n} leads?`,
        message: <>{only ? <><b>{only.leadCode} — {only.companyName}</b> will be</> : <>These {n} leads will be</>} deleted permanently, with their call history and activity log. Their arranged meetings will be cancelled. This can’t be undone.</>,
        confirmLabel: 'Delete permanently', tone: 'danger',
      },
      () => { dispatch(deleteLeadsAsAdmin(ids)); setSelected(p => { const x = new Set(p); ids.forEach(id => x.delete(id)); return x; }); },
    );
  };
  const selectedIds = [...selected].filter(id => state.leads.some(l => l.id === id) && !soldIds.has(id));

  const nameOf = (id: string) => state.users.find(u => u.id === id)?.name ?? '—';

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Lead Pool</h2>
          <p className="text-sm text-slate-600">{state.leads.length} leads · {poolCount} waiting in the pool for an agent</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.length > 0 && (
            <button onClick={() => askDelete(selectedIds)} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />Delete selected ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />Add One Lead
          </button>
          <button onClick={() => setShowPaste(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />Paste Leads
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by lead ID, company or contact..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
          <option value="all">All leads</option>
          <option value="pool">In the pool</option>
          <option value="assigned">Held by an agent</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleAll} disabled={deletable.length === 0} aria-label="Select all shown leads" />
                </th>
                {['Lead ID', 'Company', 'Contact', 'Phone', 'Email', 'Campaign', 'Held by'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600">{h}</th>
                ))}
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                  <Database className="w-10 h-10 mx-auto mb-2 opacity-30" />No leads found
                </td></tr>
              )}
              {shown.map(l => (
                <tr key={l.id} className={`hover:bg-slate-50/30 ${selected.has(l.id) ? 'bg-blue-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} disabled={soldIds.has(l.id)}
                      title={soldIds.has(l.id) ? 'Has a recorded sale - cannot be deleted' : undefined} aria-label={`Select ${l.leadCode}`} />
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{l.leadCode}</span></td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900"><span className="inline-flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-slate-500" />{l.companyName}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-700">{l.contactName || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{l.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{l.email || '—'}</td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{campaignLabel(state.workflows, l.campaignCode)}</span></td>
                  <td className="px-4 py-3">
                    {isInPool(l)
                      ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">{l.agentId ? 'Back in pool' : 'In pool'}</span>
                      : <span className="text-sm text-slate-700">{nameOf(l.agentId)}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => askDelete([l.id])} disabled={soldIds.has(l.id)}
                      title={soldIds.has(l.id) ? 'Has a recorded sale - cannot be deleted' : 'Delete lead'} aria-label={`Delete ${l.leadCode}`}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 300 && <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">Showing 300 of {rows.length} - search to narrow it down</div>}
      </div>

      {confirmDialog}

      {showPaste && (
        <PasteLeadsModal
          workflows={state.workflows} existing={state.leads}
          onClose={() => setShowPaste(false)}
          onAdd={leads => dispatch(addLeadsToPool(leads))}
          adminId={me.id} adminName={me.name}
        />
      )}
      {showForm && (
        <AddSingleLeadModal
          workflows={state.workflows} existing={state.leads}
          onClose={() => setShowForm(false)}
          onAdd={lead => dispatch(addLeadsToPool([lead]))}
          adminId={me.id} adminName={me.name}
        />
      )}
    </div>
  );
}
