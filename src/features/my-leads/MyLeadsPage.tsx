import { Ban, Building2, Download, Hash, History, Mail, Phone, Play, Users, X, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Lead } from '@/domain/types';
import { campaignLabel } from '@/domain/workflow/campaignLabel';
import { TakeLeadsModal } from '@/features/take-leads/TakeLeadsModal';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { LeadPicker } from '@/shared/components/LeadPicker';
import { LEAD_STATUS_STYLE } from '@/shared/ui/leadStatusStyles';
import { removeLeadFromAgentQueue, resumeLeadWorkflow, stopLeadWorkflow, takeLeadsFromPool, useStore } from '@/store';

export function MyLeadsPage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  // keep only the id: the drawer always shows the live lead from the store (a copy would go stale after Stop / Resume)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead = selectedLeadId ? state.leads.find(l => l.id === selectedLeadId) ?? null : null;
  const setSelectedLead = (l: Lead | null) => setSelectedLeadId(l?.id ?? null);
  const { ask, dialog: confirmDialog } = useConfirm();
  const [showTake, setShowTake] = useState(false);

  const visibleLeads = useMemo(() => {
    // a removed lead is out of "My Leads" (its history is kept in the data)
    let leads = state.leads.filter(l => l.agentId === currentUser.id && !l.removedFromQueue);
    if (filterCampaign) leads = leads.filter(l => l.campaignCode === filterCampaign);
    if (filterStatus) leads = leads.filter(l => l.status === filterStatus);
    return leads;
  }, [state.leads, currentUser, filterCampaign, filterStatus]);

  const campaigns = [...new Set(state.leads.map(l => l.campaignCode))];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">My Leads</h2>
          <p className="text-sm text-slate-600">{visibleLeads.length} leads</p>
        </div>
        <button
          onClick={() => setShowTake(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Take Leads
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
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>{campaignLabel(state.workflows, c)}</option>)}
        </select>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(LEAD_STATUS_STYLE).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Phones: one tappable card per lead instead of a 7-column table */}
        <ul className="md:hidden divide-y divide-slate-100">
          {visibleLeads.length === 0 && (
            <li className="px-4 py-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No leads found
            </li>
          )}
          {visibleLeads.map(lead => {
            const completed = lead.touchPoints.filter(tp => tp.status === 'completed').length;
            const total = lead.touchPoints.length;
            const cfg = LEAD_STATUS_STYLE[lead.status];
            return (
              <li key={lead.id}>
                <button
                  onClick={() => setSelectedLead(lead)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-900 truncate">{lead.companyName}</span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 truncate">{lead.contactName} · {lead.phone || 'No phone'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      {lead.expiredAt && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700">Expired</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mt-2">
                    <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{lead.leadCode}</span>
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{campaignLabel(state.workflows, lead.campaignCode)}</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600">{completed}/{total}</span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Lead Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No leads found
                  </td>
                </tr>
              )}
              {visibleLeads.map(lead => {
                const completed = lead.touchPoints.filter(tp => tp.status === 'completed').length;
                const total = lead.touchPoints.length;
                const cfg = LEAD_STATUS_STYLE[lead.status];

                return (
                  <tr key={lead.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{lead.leadCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-900">{lead.companyName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700">{lead.contactName}</div>
                      <div className="text-xs text-slate-500">{lead.phone || 'No phone'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{campaignLabel(state.workflows, lead.campaignCode)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      {lead.expiredAt && (
                        <span className="ml-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700">Expired</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${total ? (completed / total) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">{completed}/{total}</span>
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
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 z-10 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">{selectedLead.leadCode}</h2>
                <p className="text-sm text-slate-600 break-words">{selectedLead.companyName} • {selectedLead.contactName}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} aria-label="Close" className="w-8 h-8 shrink-0 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" />Phone</div>
                  <div className="text-sm text-slate-900">{selectedLead.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />Email</div>
                  <div className="text-sm text-slate-900 truncate">{selectedLead.email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Hash className="w-3 h-3" />Lead Code</div>
                  <div className="text-sm font-mono text-slate-900">{selectedLead.leadCode}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Status</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAD_STATUS_STYLE[selectedLead.status].color}`}>
                    {LEAD_STATUS_STYLE[selectedLead.status].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Touch Points Progress</h3>
              <div className="space-y-2">
                {selectedLead.touchPoints.map(tp => (
                  <div key={tp.order} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      tp.status === 'completed' ? 'bg-emerald-100' : 'bg-slate-200'
                    }`}>
                      {tp.type === 'call' ? <Phone className="w-3.5 h-3.5 text-slate-600" /> : <Mail className="w-3.5 h-3.5 text-slate-600" />}
                    </div>
                    <span className="text-sm text-slate-700 flex-1">{tp.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>{tp.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedLead.callLogs.length > 0 && (
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Call Logs</h3>
                <div className="space-y-2">
                  {selectedLead.callLogs.map(cl => (
                    <div key={cl.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{cl.type.toUpperCase()}</span>
                        <span className="text-xs text-slate-500">{new Date(cl.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-700">{cl.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 sm:px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Activity History
              </h3>
              <div className="space-y-2">
                {selectedLead.history.map(h => (
                  <div key={h.id} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-slate-600">
                        <span className="font-medium text-slate-900">{h.userName}</span> — {h.action.replace(/_/g, ' ')}
                        {h.detail && <span className="text-slate-500"> • {h.detail}</span>}
                      </span>
                      <div className="text-slate-500">{new Date(h.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!selectedLead.removedFromQueue && !selectedLead.expiredAt && (
              <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex gap-2">
                {selectedLead.stopped ? (
                  <button
                    onClick={() => { dispatch(resumeLeadWorkflow(selectedLead.id)); setSelectedLead(null); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Resume Workflow
                  </button>
                ) : (
                  <button
                    onClick={() => ask(
                      { title: 'Stop this workflow?', message: <><b>{selectedLead.companyName}</b> will stop moving through its touch points. You can resume it later.</>, confirmLabel: 'Stop workflow' },
                      () => { dispatch(stopLeadWorkflow(selectedLead.id)); setSelectedLead(null); },
                    )}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Stop Workflow
                  </button>
                )}
                <button
                  onClick={() => ask(
                    { title: 'Remove this lead?', message: <><b>{selectedLead.companyName}</b> leaves your leads and will not continue its steps. Its history and activity are kept. It goes back to the shared pool and its lead ID becomes free for any agent to take again.</>, confirmLabel: 'Remove lead', tone: 'danger' },
                    () => { dispatch(removeLeadFromAgentQueue(selectedLead.id)); setSelectedLead(null); },
                  )}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Remove Lead
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDialog}

      {showTake && (
        <TakeLeadsModal
          leads={state.leads} users={state.users} workflows={state.workflows} me={currentUser}
          onTake={ids => dispatch(takeLeadsFromPool(ids))}
          onClose={() => setShowTake(false)}
        />
      )}
    </div>
  );
}
