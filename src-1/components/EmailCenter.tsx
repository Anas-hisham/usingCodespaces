import { useState, useMemo } from 'react';
import {
  Mail, Search, Send, X, FileText, PenSquare, Users,
} from 'lucide-react';
import { useStore, sendCustomEmail, sendEmail, bulkEmail } from '@/store';
import { LeadPicker } from '@/components/LeadPicker';
import { queueBucket, currentTouchPoint, isOpenTouchPoint, stepLabel } from '@/lib/workflow';
import type { Lead, EmailTemplate } from '@/types';

export function EmailCenter() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [search, setSearch] = useState('');
  const [showSend, setShowSend] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const isAgent = currentUser.role === 'agent';
  const isManager = currentUser.role === 'team_leader' || currentUser.role === 'operation_manager';

  const visibleLeads = useMemo(() => {
    if (isAgent) return state.leads.filter(l => l.agentId === currentUser.id);
    if (currentUser.role === 'team_leader') {
      const team = state.teams.find(t => t.id === currentUser.teamId);
      return state.leads.filter(l => team?.agentIds.includes(l.agentId));
    }
    return state.leads;
  }, [state.leads, currentUser, state.teams, isAgent]);

  const visibleLogs = useMemo(() => {
    let logs = state.emailLogs;
    if (isAgent) logs = logs.filter(log => log.sentBy === currentUser.id);
    else if (currentUser.role === 'team_leader') {
      const team = state.teams.find(t => t.id === currentUser.teamId);
      logs = logs.filter(log => {
        const lead = state.leads.find(l => l.id === log.leadId);
        return lead && team?.agentIds.includes(lead.agentId);
      });
    }
    if (search) logs = logs.filter(log =>
      log.subject.toLowerCase().includes(search.toLowerCase()) ||
      log.to.toLowerCase().includes(search.toLowerCase())
    );
    return [...logs].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [state.emailLogs, state.leads, currentUser, state.teams, search, isAgent]);

  const templates = state.emailTemplates;

  // Optional shortcut: the agent's leads whose CURRENT step is an email that is due today (or overdue)
  const emailStepLeads = useMemo(() => state.leads.filter(l => {
    if (l.agentId !== currentUser.id || l.removedFromQueue || l.stopped) return false;
    const tp = currentTouchPoint(l);
    return !!tp && tp.type === 'email' && isOpenTouchPoint(tp) && queueBucket(l) === 'today';
  }), [state.leads, currentUser.id]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Center</h2>
          <p className="text-sm text-slate-500">
            {isManager ? 'Send custom emails and track history' : 'Write your own emails (templates are optional) and track history'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAgent && (
            <button
              onClick={() => setShowBulk(true)}
              className="px-4 py-2 bg-white text-teal-700 border border-teal-200 rounded-lg text-sm font-medium hover:bg-teal-50 transition-all flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Email step leads
              <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">{emailStepLeads.length}</span>
            </button>
          )}
          <button
            onClick={() => setShowSend(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5"
          >
            <PenSquare className="w-3.5 h-3.5" />
            {isManager ? 'Compose Email' : 'Write Email'}
          </button>
        </div>
      </div>

      {isAgent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {templates.map(t => {
            const sentCount = state.emailLogs.filter(log => log.templateType === t.type).length;
            return (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Subject: {t.subject}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {sentCount} sent
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Email History</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {visibleLogs.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No emails sent yet</p>
            </div>
          )}
          {visibleLogs.map(log => (
            <div key={log.id} className="px-5 py-3 hover:bg-slate-50/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{log.subject}</span>
                    <span className="text-xs text-slate-400">→ {log.to}</span>
                    {log.auto && (
                      <span className="text-xs px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full font-medium">
                        Auto · {log.templateType === 'discovery' ? 'Discovery' : 'No Response'}
                      </span>
                    )}
                    {log.templateType === 'custom' && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Custom</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{log.body}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{new Date(log.sentAt).toLocaleString()}</span>
                    {log.leadName && <span>• {log.leadName}</span>}
                    <span>• by {log.sentByName}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showSend && isManager && (
        <CustomEmailModal
          onClose={() => setShowSend(false)}
          onSend={(to, subject, body) => {
            dispatch(sendCustomEmail({
              to, subject, body,
              senderId: currentUser.id,
              senderName: currentUser.name,
            }));
            setShowSend(false);
          }}
        />
      )}

      {showBulk && isAgent && (
        <BulkEmailModal
          leads={emailStepLeads}
          templates={templates}
          onClose={() => setShowBulk(false)}
          onSend={(leadIds, subject, body) => {
            dispatch(bulkEmail({ leadIds, subject, body, senderId: currentUser.id, senderName: currentUser.name }));
            setShowBulk(false);
          }}
        />
      )}

      {showSend && isAgent && (
        <TemplatedEmailModal
          leads={visibleLeads}
          templates={templates}
          onClose={() => setShowSend(false)}
          onSend={(to, subject, body, leadId) => {
            const lead = visibleLeads.find(l => l.id === leadId);
            dispatch(sendEmail({
              email: {
                id: crypto.randomUUID(),
                leadId: leadId || '',
                leadName: lead?.companyName || '',
                to,
                subject,
                body,
                templateType: 'custom',
                sentAt: new Date().toISOString(),
                sentBy: currentUser.id,
                sentByName: currentUser.name,
              },
              leadId: leadId || '',
              touchPointOrder: -1,
            }));
            setShowSend(false);
          }}
        />
      )}
    </div>
  );
}

function CustomEmailModal({
  onClose, onSend,
}: {
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => void;
}) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Compose Email</h2>
            <p className="text-sm text-slate-500">Custom email — write from scratch</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <input
              type="text"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => onSend(to, subject, body)}
            disabled={!to.trim() || !subject.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatedEmailModal({
  leads, templates, onClose, onSend,
}: {
  leads: Lead[];
  templates: EmailTemplate[];
  onClose: () => void;
  onSend: (to: string, subject: string, body: string, leadId?: string) => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [linkLeadId, setLinkLeadId] = useState('');

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  const handleLeadLink = (leadId: string) => {
    setLinkLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead?.email) setTo(lead.email);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Send Email</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Template</label>
            <select
              value={selectedTemplate} onChange={e => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select template...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Link to Lead (optional — auto-fills email)</label>
            <LeadPicker leads={leads} value={linkLeadId} onChange={handleLeadLink} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => {
              if (!to.trim() || !subject.trim()) return;
              onSend(to, subject, body, linkLeadId || undefined);
              setSelectedTemplate(''); setTo(''); setSubject(''); setBody(''); setLinkLeadId('');
            }}
            disabled={!to.trim() || !subject.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Optional shortcut (the main way to email is still writing it by hand).
 * Lists the agent's leads whose current step is a due EMAIL; the agent can send to all of them or pick some.
 * Sending marks that email step complete for every selected lead.
 */
function BulkEmailModal({
  leads, templates, onClose, onSend,
}: {
  leads: Lead[];
  templates: EmailTemplate[];
  onClose: () => void;
  onSend: (leadIds: string[], subject: string, body: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');

  const allSelected = leads.length > 0 && selected.length === leads.length;
  const toggle = (id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const withoutEmail = leads.filter(l => selected.includes(l.id) && !l.email).length;

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find(x => x.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Email step leads</h2>
            <p className="text-sm text-slate-500">Leads whose current step is an email due today</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {leads.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No leads are waiting on an email step right now.</p>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Leads <span className="text-xs text-slate-400 font-normal">({selected.length}/{leads.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelected(allSelected ? [] : leads.map(l => l.id))}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin border border-slate-200 rounded-xl p-2">
                  {leads.map(l => {
                    const tp = currentTouchPoint(l);
                    return (
                      <label key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} className="rounded" />
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{l.leadCode}</span>
                        <span className="text-sm text-slate-700 truncate flex-1">{l.companyName}</span>
                        {tp && <span className="text-xs text-slate-400 shrink-0">{stepLabel(tp.order, tp.type)}</span>}
                        {!l.email && <span className="text-xs text-red-500 shrink-0">no email</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Template (optional)</label>
                <select
                  value={templateId} onChange={e => applyTemplate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Write it myself...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  value={body} onChange={e => setBody(e.target.value)} rows={7}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">[Name], [Company Name] and [Agent Name] are filled in for each lead.</p>
              </div>

              {withoutEmail > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {withoutEmail} selected lead{withoutEmail > 1 ? 's have' : ' has'} no email address saved.
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => onSend(selected, subject, body)}
            disabled={selected.length === 0 || !subject.trim() || !body.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send & Mark Complete ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
