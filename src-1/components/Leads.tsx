import { useState, useMemo } from 'react';
import {
  Users,  Building2, Phone, Mail, User as UserIcon,
  Ban, X, History, Plus, Upload, XCircle, Hash, Play,
} from 'lucide-react';
import { useStore, stopLead, resumeLead, addBulkLeads } from '@/store';
import type { Lead, Workflow } from '@/types';
import { LeadPicker } from '@/components/LeadPicker';
import { campaignLabel } from '@/lib/workflow';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-slate-100 text-slate-700' },
  discovery: { label: 'Discovery', color: 'bg-green-100 text-green-700' },
  lvm: { label: 'LVM', color: 'bg-amber-100 text-amber-700' },
  nvm: { label: 'NVM', color: 'bg-orange-100 text-orange-700' },
  no_response: { label: 'No Response', color: 'bg-red-100 text-red-700' },
  arranged_meeting: { label: 'Meeting', color: 'bg-blue-100 text-blue-700' },
};

export function Leads() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const visibleLeads = useMemo(() => {
    let leads = state.leads.filter(l => l.agentId === currentUser.id);
    if (filterCampaign) leads = leads.filter(l => l.campaignCode === filterCampaign);
    if (filterStatus) leads = leads.filter(l => l.status === filterStatus);
    return leads;
  }, [state.leads, currentUser, filterCampaign, filterStatus]);

  const campaigns = [...new Set(state.leads.map(l => l.campaignCode))];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">My Leads</h2>
          <p className="text-sm text-slate-500">{visibleLeads.length} leads</p>
        </div>
        <button
          onClick={() => setShowBulkAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Leads
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <LeadPicker
            leads={visibleLeads}
            value=""
            onChange={id => { const l = state.leads.find(x => x.id === id); if (l) setSelectedLead(l); }}
            placeholder="Search a lead by name, code, email or phone, then select it..."
          />
        </div>
        <select
          value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>{campaignLabel(state.workflows, c)}</option>)}
        </select>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Lead Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visibleLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No leads found
                  </td>
                </tr>
              )}
              {visibleLeads.map(lead => {
                const completed = lead.touchPoints.filter(tp => tp.status === 'completed').length;
                const total = lead.touchPoints.length;
                const cfg = STATUS_CONFIG[lead.status];

                return (
                  <tr key={lead.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{lead.leadCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-900">{lead.companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">{lead.contactName}</div>
                      <div className="text-xs text-slate-400">{lead.phone || 'No phone'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{campaignLabel(state.workflows, lead.campaignCode)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      {lead.expiredAt && (
                        <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Expired</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${(completed / total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{completed}/{total}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto scrollbar-thin animate-slide-in shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedLead.leadCode}</h2>
                <p className="text-sm text-slate-500">{selectedLead.companyName} • {selectedLead.contactName}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</div>
                  <div className="text-sm text-slate-900">{selectedLead.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />Email</div>
                  <div className="text-sm text-slate-900 truncate">{selectedLead.email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Lead Code</div>
                  <div className="text-sm font-mono text-slate-900">{selectedLead.leadCode}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Status</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[selectedLead.status].color}`}>
                    {STATUS_CONFIG[selectedLead.status].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Touch Points Progress</h3>
              <div className="space-y-2">
                {selectedLead.touchPoints.map(tp => (
                  <div key={tp.order} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      tp.status === 'completed' ? 'bg-green-100' : 'bg-slate-200'
                    }`}>
                      {tp.type === 'call' ? <Phone className="w-3.5 h-3.5 text-slate-600" /> : <Mail className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                    <span className="text-sm text-slate-700 flex-1">{tp.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>{tp.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedLead.callLogs.length > 0 && (
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Call Logs</h3>
                <div className="space-y-2">
                  {selectedLead.callLogs.map(cl => (
                    <div key={cl.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{cl.type.toUpperCase()}</span>
                        <span className="text-xs text-slate-400">{new Date(cl.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700">{cl.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Activity History
              </h3>
              <div className="space-y-2">
                {selectedLead.history.map(h => (
                  <div key={h.id} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-slate-600">
                        <span className="font-medium text-slate-900">{h.userName}</span> — {h.action.replace(/_/g, ' ')}
                        {h.detail && <span className="text-slate-400"> • {h.detail}</span>}
                      </span>
                      <div className="text-slate-400">{new Date(h.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!selectedLead.removedFromQueue && !selectedLead.expiredAt && (
              <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
                {selectedLead.stopped ? (
                  <button
                    onClick={() => { dispatch(resumeLead(selectedLead.id)); setSelectedLead(null); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume Workflow
                  </button>
                ) : (
                  <button
                    onClick={() => { dispatch(stopLead(selectedLead.id)); setSelectedLead(null); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Stop Workflow
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showBulkAdd && (
        <BulkAddLeadsModal
          workflows={state.workflows}
          onClose={() => setShowBulkAdd(false)}
          onAdd={(leads) => {
            dispatch(addBulkLeads(leads));
            setShowBulkAdd(false);
          }}
          agentId={currentUser.id}
          agentName={currentUser.name}
        />
      )}
    </div>
  );
}

function BulkAddLeadsModal({
  workflows, onClose, onAdd, agentId, agentName,
}: {
  workflows: Workflow[];
  onClose: () => void;
  onAdd: (leads: Lead[]) => void;
  agentId: string;
  agentName: string;
}) {
  const [campaignCode, setCampaignCode] = useState(workflows[0]?.campaignCode || '');
  const [rawText, setRawText] = useState('');

  const handleAdd = () => {
    const wf = workflows.find(w => w.campaignCode === campaignCode);
    if (!wf) return;

    const lines = rawText.trim().split('\n').filter(l => l.trim());
    const existingCodes = new Set<string>();
    const leads: Lead[] = [];
    const now = new Date().toISOString();

    for (const line of lines) {
      const parts = line.split('\t').map(p => p.trim());
      const leadCode = parts[0] || `LD-${Date.now()}-${leads.length}`;
      if (existingCodes.has(leadCode)) continue;
      existingCodes.add(leadCode);

      const companyName = parts[1] || parts[0] || '';
      const contactName = parts[2] || '';
      const phone = parts[3] || '';
      const email = parts[4] || '';

      const touchPoints = wf.touchPoints.map(tp => ({
        ...tp,
        status: 'pending' as const,
        completedAt: null,
        dueDate: tp.order === 0 ? now : new Date(Date.now() + tp.dayOffset * 86400000).toISOString(),
      }));

      leads.push({
        id: crypto.randomUUID(),
        leadCode,
        campaignCode,
        companyName,
        contactName,
        phone,
        email,
        status: 'new',
        agentId,
        assignedAt: now,
        touchPoints,
        currentTouchPoint: 0,
        callLogs: [],
        history: [{
          id: crypto.randomUUID(),
          action: 'assigned',
          timestamp: now,
          userId: agentId,
          userName: agentName,
          detail: 'Lead created',
        }],
        stopped: false,
        removedFromQueue: false,
        removedAt: null,
      });
    }

    if (leads.length > 0) onAdd(leads);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Leads</h2>
            <p className="text-sm text-slate-500">Paste rows from a spreadsheet</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Campaign</label>
            <select
              value={campaignCode}
              onChange={e => setCampaignCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {workflows.map(w => (
                <option key={w.id} value={w.campaignCode}>{campaignLabel(workflows, w.campaignCode)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Upload className="w-3.5 h-3.5 inline mr-1" />
              Paste lead rows (tab-separated)
            </label>
            <div className="text-xs text-slate-400 mb-2 bg-slate-50 rounded-lg p-2">
              Format: Lead Code [Tab] Company Name [Tab] Contact Name [Tab] Phone [Tab] Email
              <br />
              One lead per line. Lead Code is the primary identifier.
            </div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={"LD-101\tTechCorp\tJohn Smith\t+20 100 111 2222\tjohn@techcorp.com\nLD-102\tDataSys\tJane Doe\t+20 101 333 4444\tjane@datasys.com"}
              rows={8}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={!rawText.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Leads
          </button>
        </div>
      </div>
    </div>
  );
}
