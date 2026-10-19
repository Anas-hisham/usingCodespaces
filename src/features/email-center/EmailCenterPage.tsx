import { FileText, Mail, PenSquare, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { queueBucket } from '@/domain/workflow/leadQueue';
import { findCurrentTouchPoint, isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { BulkEmailModal } from '@/features/email-center/components/BulkEmailModal';
import { CustomEmailModal } from '@/features/email-center/components/CustomEmailModal';
import { TemplatedEmailModal } from '@/features/email-center/components/TemplatedEmailModal';
import { sendBulkEmailForLeads, sendEmailForLead, sendStandaloneEmail, useStore } from '@/store';

export function EmailCenterPage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [search, setSearch] = useState('');
  const [showSend, setShowSend] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const isAgent = currentUser.role === 'agent';
  const isManager = currentUser.role === 'team_leader' || currentUser.role === 'operation_manager';

  const visibleLeads = useMemo(() => {
    if (isAgent) return state.leads.filter(l => l.agentId === currentUser.id && !l.removedFromQueue);
    if (currentUser.role === 'team_leader') {
      const team = state.teams.find(t => t.id === currentUser.teamId);
      return state.leads.filter(l => team?.agentIds.includes(l.agentId));
    }
    return state.leads.filter(l => !!l.agentId);   // pool leads have no agent yet
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
    const tp = findCurrentTouchPoint(l);
    return !!tp && tp.type === 'email' && isOpenTouchPoint(tp) && queueBucket(l) === 'today';
  }), [state.leads, currentUser.id]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Center</h2>
          <p className="text-sm text-slate-600">
            {isManager ? 'Send custom emails and track history' : 'Write your own emails (templates are optional) and track history'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAgent && (
            <button
              onClick={() => setShowBulk(true)}
              className="px-4 py-2 bg-white text-violet-700 border border-violet-200 rounded-lg text-sm font-medium hover:bg-violet-50 transition-all flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Email step leads
              <span className="text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">{emailStepLeads.length}</span>
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
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{t.name}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Subject: {t.subject}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Email History</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-48"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleLogs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
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
                    <span className="text-xs text-slate-500">→ {log.to}</span>
                    {log.auto && (
                      <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium">
                        Auto · {log.templateType === 'discovery' ? 'Discovery' : 'No Response'}
                      </span>
                    )}
                    {log.templateType === 'custom' && (
                      <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-medium">Custom</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{log.body}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
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
            dispatch(sendStandaloneEmail({
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
            dispatch(sendBulkEmailForLeads({ leadIds, subject, body, senderId: currentUser.id, senderName: currentUser.name }));
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
            dispatch(sendEmailForLead({
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
