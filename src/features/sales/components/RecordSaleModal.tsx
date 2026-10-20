import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { hasReachedPerson } from '@/domain/analytics/performanceMetrics';
import { SALE_TYPES } from '@/domain/sales/saleTypes';
import type { Sale, SaleType, User } from '@/domain/types';
import { AgentPicker } from '@/shared/components/AgentPicker';
import { LeadPicker } from '@/shared/components/LeadPicker';
import { localDateStr } from '@/shared/lib/dates';
import type { AppState } from '@/store/state/AppState';

// ---------------------------------------------------------------------------
// Quality: record a sale  (agent, lead, sale type, date)
// ---------------------------------------------------------------------------
export function RecordSaleModal({
  state, me, onClose, onSave,
}: {
  state: AppState;
  me: User;
  onClose: () => void;
  onSave: (sale: Sale) => void;
}) {
  const agents = state.users.filter(u => u.role === 'agent' && u.qualityId === me.id);   // the agents this Quality follows
  const [agentId, setAgentId] = useState('');
  const [leadId, setLeadId] = useState('');
  const [saleType, setSaleType] = useState<SaleType | ''>('');
  const [date, setDate] = useState(localDateStr());

  const agentLeads = useMemo(() => state.leads.filter(l => l.agentId === agentId), [state.leads, agentId]);
  const pickedLead = state.leads.find(l => l.id === leadId);

  const leadName = pickedLead?.companyName ?? '';
  const neverReached = !!pickedLead && !hasReachedPerson(pickedLead);
  const canSave = !!agentId && !!pickedLead && !!saleType && !!date;

  const handleSave = () => {
    if (!canSave || !saleType) return;
    onSave({
      id: crypto.randomUUID(),
      agentId,
      leadId,
      leadName,
      saleType,
      date,
      createdBy: me.id,
      createdAt: new Date().toISOString(),
    });
  };

  const input = 'w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Record Sale</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Agent</label>
            <AgentPicker agents={agents} teams={state.teams} value={agentId} onChange={id => { setAgentId(id); setLeadId(''); }} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Lead</label>
            {agentId ? (
              <LeadPicker leads={agentLeads} value={leadId} onChange={setLeadId} placeholder="Search this agent's leads..." />
            ) : (
              <div className="px-4 py-2.5 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">Choose an agent first</div>
            )}
            {pickedLead && (
              <div className="mt-1.5 text-xs text-slate-600">{pickedLead.leadCode} · {pickedLead.campaignCode}</div>
            )}
            {neverReached && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Nobody has spoken to this lead yet (no Discovery call or meeting). Check that this is the right lead before saving.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Sale type</label>
            <select value={saleType} onChange={e => setSaleType(e.target.value as SaleType | '')} className={input}>
              <option value="">Select sale type...</option>
              {SALE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
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
