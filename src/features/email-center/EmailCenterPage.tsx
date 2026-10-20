import { PenSquare, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TEMPLATE_TYPE_LABEL, templateTypeForLead, type BatchTemplateType } from '@/domain/email/emailBatches';
import { queueBucket } from '@/domain/workflow/leadQueue';
import { findCurrentTouchPoint, isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { CustomEmailModal } from '@/features/email-center/components/CustomEmailModal';
import { EmailTouchPointGroup } from '@/features/email-center/components/EmailTouchPointGroup';
import { SheetEmailModal } from '@/features/email-center/components/SheetEmailModal';
import { TemplatedEmailModal } from '@/features/email-center/components/TemplatedEmailModal';
import { useSequentialSend } from '@/features/email-center/useSequentialSend';
import { isLeadWorkable } from '@/store/crm/helpers/currentUserGuards';
import { sendBulkEmailForLeads, sendEmailForLead, sendStandaloneEmail, useStore } from '@/store';

const GROUPS: BatchTemplateType[] = ['discovery', 'no_response'];

export function EmailCenterPage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [showSend, setShowSend] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [includeUpcoming, setIncludeUpcoming] = useState(false);
  const [sendingGroup, setSendingGroup] = useState<BatchTemplateType | null>(null);
  const { progress, run, stop } = useSequentialSend();

  const isAgent = currentUser.role === 'agent';
  const isManager = currentUser.role === 'team_leader' || currentUser.role === 'operation_manager';
  const templates = state.emailTemplates;

  const visibleLeads = useMemo(() => {
    if (isAgent) return state.leads.filter(l => l.agentId === currentUser.id && !l.removedFromQueue);
    if (currentUser.role === 'team_leader') {
      const team = state.teams.find(t => t.id === currentUser.teamId);
      return state.leads.filter(l => team?.agentIds.includes(l.agentId));
    }
    return state.leads.filter(l => !!l.agentId);   // pool leads have no agent yet
  }, [state.leads, currentUser, state.teams, isAgent]);

  // Every lead of mine whose CURRENT touch point is an email, split by the template it gets (Discovery / No Response)
  const emailLeadsByType = useMemo(() => {
    const groups: Record<BatchTemplateType, typeof state.leads> = { discovery: [], no_response: [] };
    for (const l of state.leads) {
      if (l.agentId !== currentUser.id || !isLeadWorkable(l)) continue;
      const tp = findCurrentTouchPoint(l);
      if (!tp || tp.type !== 'email' || !isOpenTouchPoint(tp)) continue;
      if (!includeUpcoming && queueBucket(l) !== 'today') continue;
      groups[templateTypeForLead(l)].push(l);
    }
    const dueOf = (l: (typeof state.leads)[number]) => new Date(findCurrentTouchPoint(l)?.dueDate ?? 0).getTime();
    GROUPS.forEach(g => groups[g].sort((a, b) => dueOf(a) - dueOf(b)));
    return groups;
  }, [state.leads, currentUser.id, includeUpcoming]);

  const sendGroup = (type: BatchTemplateType, leadIds: string[]) => {
    const tpl = templates.find(t => t.type === type);
    if (!tpl || leadIds.length === 0) return;
    setSendingGroup(type);
    // one email at a time: each lead gets its own filled-in copy and its email step is marked complete
    run(leadIds, id => dispatch(sendBulkEmailForLeads({
      leadIds: [id], subject: tpl.subject, body: tpl.body, templateType: type,
      senderId: currentUser.id, senderName: currentUser.name,
    }))).finally(() => setSendingGroup(null));
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Email Center</h2>
          <p className="text-sm text-slate-600">
            {isManager ? 'Send custom emails' : 'Send the emails your touch points are waiting for, or write your own'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAgent && (
            <button
              onClick={() => setShowSheet(true)}
              className="px-4 py-2 bg-white text-violet-700 border border-violet-200 rounded-lg text-sm font-medium hover:bg-violet-50 transition-all flex items-center gap-1.5"
            >
              <Table2 className="w-3.5 h-3.5" />
              Send from sheet
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
        <section>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-800">Email touch points</h3>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={includeUpcoming} disabled={progress.running} onChange={e => setIncludeUpcoming(e.target.checked)} className="rounded" />
              Include upcoming (not due yet)
            </label>
          </div>
          {progress.running && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3">Sending {progress.done}/{progress.total}… one by one.</p>
          )}
          <div className="space-y-4">
            {GROUPS.map(type => (
              <EmailTouchPointGroup
                key={type}
                type={type}
                title={`${TEMPLATE_TYPE_LABEL[type]} leads`}
                template={templates.find(t => t.type === type)}
                leads={emailLeadsByType[type]}
                progress={progress}
                busy={sendingGroup !== null}
                onSend={ids => sendGroup(type, ids)}
                onStop={stop}
              />
            ))}
          </div>
        </section>
      )}

      {showSend && isManager && (
        <CustomEmailModal
          onClose={() => setShowSend(false)}
          onSend={(to, subject, body) => {
            dispatch(sendStandaloneEmail({ to, subject, body, senderId: currentUser.id, senderName: currentUser.name }));
            setShowSend(false);
          }}
        />
      )}

      {showSheet && isAgent && (
        <SheetEmailModal
          templates={templates}
          myLeads={visibleLeads}
          agentName={currentUser.name}
          onClose={() => setShowSheet(false)}
          onSendOne={p => {
            if (p.leadId) {
              dispatch(sendEmailForLead({
                email: {
                  id: crypto.randomUUID(), leadId: p.leadId, leadName: p.leadName, to: p.to, subject: p.subject, body: p.body,
                  templateType: p.templateType, sentAt: new Date().toISOString(), sentBy: currentUser.id, sentByName: currentUser.name,
                },
                leadId: p.leadId,
                touchPointOrder: -1,     // an email from the sheet never completes a touch point
              }));
            } else {
              dispatch(sendStandaloneEmail({
                to: p.to, subject: p.subject, body: p.body, templateType: p.templateType, leadName: p.leadName,
                senderId: currentUser.id, senderName: currentUser.name,
              }));
            }
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
                to, subject, body,
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
