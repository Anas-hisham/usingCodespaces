import { useCollapsibleSections } from '@/features/work-queue/useCollapsibleSections';
import type { QueueHandlers } from '@/features/work-queue/queueHandlers';
import { WorkQueueStats } from '@/features/work-queue/components/WorkQueueStats';
import { TodayMeetingsBanner } from '@/features/work-queue/components/TodayMeetingsBanner';
import { CampaignSection } from '@/features/work-queue/components/CampaignSection';
import { Download, Inbox } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Lead, TouchPoint } from '@/domain/types';
import { queueCategory } from '@/domain/workflow/callClassification';
import { queueBucket } from '@/domain/workflow/leadQueue';
import { describeDueDate, findCurrentTouchPoint, stepLabel } from '@/domain/workflow/touchPoints';
import { TakeLeadsModal } from '@/features/take-leads/TakeLeadsModal';
import { buildWorkQueue } from '@/features/work-queue/buildWorkQueue';
import { CallLogModal } from '@/features/work-queue/components/CallLogModal';
import { DeleteLeadModal } from '@/features/work-queue/components/DeleteLeadModal';
import { LeadDetailDrawer } from '@/features/work-queue/components/LeadDetailDrawer';
import { TouchPointEmailModal } from '@/features/work-queue/components/TouchPointEmailModal';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { LeadPicker } from '@/shared/components/LeadPicker';
import { deleteLeadPermanently, logCallAndCompleteTouchPoint, removeLeadFromAgentQueue, restoreSkippedTouchPoint, resumeLeadWorkflow, sendEmailForLead, skipTouchPoint, stopLeadWorkflow, takeLeadsFromPool, useStore } from '@/store';

export function WorkQueuePage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const sections = useCollapsibleSections();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [callLeadId, setCallLeadId] = useState<string | null>(null);
  const [emailLeadId, setEmailLeadId] = useState<string | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [showTake, setShowTake] = useState(false);
  const { ask, dialog: confirmDialog } = useConfirm();
  const askSkip = (lead: Lead, tp: TouchPoint) => ask(
    { title: 'Skip this touch point?', message: <>Step <b>{stepLabel(tp.order, tp.type)}</b> ({tp.label}) for <b>{lead.companyName}</b> will be skipped and the lead moves to the next step. You can restore it later.</>, confirmLabel: 'Skip' },
    () => dispatch(skipTouchPoint({ leadId: lead.id, order: tp.order })),
  );

  // live clock: a lead moves from Next to Today by itself when its day arrives
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // always read the live lead from the store (so modals/drawers never act on a stale copy)
  const leadById = (id: string | null) => (id ? state.leads.find(l => l.id === id) : undefined);
  const selectedLead = leadById(selectedLeadId);
  const callLead = leadById(callLeadId);
  const emailLead = leadById(emailLeadId);
  const leadToDelete = leadById(deleteLeadId);

  const myLeads = useMemo(
    () => state.leads.filter(l => !l.removedFromQueue && !l.expiredAt && l.agentId === currentUser.id),
    [state.leads, currentUser.id],
  );
  const queue = useMemo(() => buildWorkQueue(myLeads, state.workflows, now), [myLeads, state.workflows, now]);

  const todayStr = new Date().toISOString().split('T')[0];
  const arrangedMeetingsToday = useMemo(() => state.meetings.filter(m =>
    m.type === 'lead_meeting' && m.date === todayStr && m.status === 'arranged' &&
    m.participantIds.includes(currentUser.id)
  ), [state.meetings, currentUser.id, todayStr]);

  const currentTP = findCurrentTouchPoint;

  const handleMarkComplete = (lead: Lead, tp: TouchPoint) => {
    if (tp.type === 'call') setCallLeadId(lead.id);
    else setEmailLeadId(lead.id);
  };

  const todayTotal = queue.reduce((n, c) => n + c.todayCount, 0);
  const nextTotal = queue.reduce((n, c) => n + c.nextCount, 0);
  const stoppedTotal = queue.reduce((n, c) => n + c.stopped.length, 0);
  const overdueCount = myLeads.filter(l => queueBucket(l, now) === 'today' && describeDueDate(currentTP(l)).tone === 'overdue').length;

  const handlers: QueueHandlers = {
    onMarkComplete: handleMarkComplete,
    onSkip: askSkip,
    onDetails: l => setSelectedLeadId(l.id),
    onResume: leadId => dispatch(resumeLeadWorkflow(leadId)),
    onRequestDelete: leadId => setDeleteLeadId(leadId),
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <WorkQueueStats
        todayTotal={todayTotal} overdueCount={overdueCount} nextTotal={nextTotal}
        stoppedTotal={stoppedTotal} meetingsTodayCount={arrangedMeetingsToday.length}
      />

      <TodayMeetingsBanner
        meetings={arrangedMeetingsToday}
        onOpenMeeting={m => { if (m.leadId && leadById(m.leadId)) setSelectedLeadId(m.leadId); }}
      />

      {/* Find a lead: type to search, then select it to open its details (same picker as the email form) */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <LeadPicker
            leads={myLeads}
            value=""
            onChange={id => { if (id) setSelectedLeadId(id); }}
            placeholder="Search a lead by name, code, email or phone, then select it..."
          />
        </div>
        <button
          onClick={() => setShowTake(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Take Leads
        </button>
      </div>

      {showTake && (
        <TakeLeadsModal
          leads={state.leads} users={state.users} workflows={state.workflows} me={currentUser}
          onTake={ids => dispatch(takeLeadsFromPool(ids))}
          onClose={() => setShowTake(false)}
        />
      )}

      {/* Work queue: campaign -> Today / Next / Stop */}
      <div className="space-y-3">
        {queue.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No leads in your work queue</p>
            <p className="text-xs mt-1">Use “Take Leads” to get leads from the pool.</p>
          </div>
        )}

        {queue.map(campaign => (
          <CampaignSection key={campaign.code} campaign={campaign} now={now} sections={sections} handlers={handlers} />
        ))}
      </div>

      {/* Lead detail drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onMarkComplete={tp => handleMarkComplete(selectedLead, tp)}
          onSkip={tp => askSkip(selectedLead, tp)}
          onRestore={tp => dispatch(restoreSkippedTouchPoint({ leadId: selectedLead.id, order: tp.order }))}
          onStop={() => ask(
            { title: 'Stop this workflow?', message: <><b>{selectedLead.companyName}</b> leaves Today / Next and moves to Stop. You can resume it later.</>, confirmLabel: 'Stop workflow' },
            () => dispatch(stopLeadWorkflow(selectedLead.id)),
          )}
          onResume={() => dispatch(resumeLeadWorkflow(selectedLead.id))}
          onRemove={() => ask(
            { title: 'Remove from queue?', message: <><b>{selectedLead.companyName}</b> leaves your work queue and your leads and will not continue its steps. Its history and activity are kept, and its lead ID becomes free for anyone to add again.</>, confirmLabel: 'Remove', tone: 'danger' },
            () => { dispatch(removeLeadFromAgentQueue(selectedLead.id)); setSelectedLeadId(null); },
          )}
          onDelete={() => setDeleteLeadId(selectedLead.id)}
          onScheduleMeeting={() => setSelectedLeadId(null)}
          agentName={state.users.find(u => u.id === selectedLead.agentId)?.name || ''}
        />
      )}

      {/* Call log modal */}
      {callLead && (
        <CallLogModal
          lead={callLead}
          onClose={() => setCallLeadId(null)}
          onSave={(type, description) => {
            const order = callLead.currentTouchPoint;
            // one atomic action: the call log and the completed step can never get out of sync
            dispatch(logCallAndCompleteTouchPoint({
              leadId: callLead.id,
              log: { id: crypto.randomUUID(), type, description: description.trim(), timestamp: new Date().toISOString(), touchPointOrder: order },
            }));
            setCallLeadId(null);
          }}
        />
      )}

      {/* Email modal */}
      {emailLead && (
        <TouchPointEmailModal
          lead={emailLead}
          category={queueCategory(emailLead)}
          templates={state.emailTemplates}
          onClose={() => setEmailLeadId(null)}
          onSend={(to, subject, body, templateType) => {
            dispatch(sendEmailForLead({
              email: {
                id: crypto.randomUUID(),
                leadId: emailLead.id,
                leadName: emailLead.companyName,
                to, subject, body, templateType,
                sentAt: new Date().toISOString(),
                sentBy: state.currentUserId,
                sentByName: currentUser.name,
              },
              leadId: emailLead.id,
              touchPointOrder: emailLead.currentTouchPoint,
            }));
            setEmailLeadId(null);
          }}
        />
      )}

      {confirmDialog}

      {/* Delete confirmation */}
      {leadToDelete && (
        <DeleteLeadModal
          lead={leadToDelete}
          hasSales={state.sales.some(x => x.leadId === leadToDelete.id)}
          onCancel={() => setDeleteLeadId(null)}
          onConfirm={() => {
            dispatch(deleteLeadPermanently(leadToDelete.id));
            setDeleteLeadId(null);
            setSelectedLeadId(null);
          }}
        />
      )}
    </div>
  );
}
