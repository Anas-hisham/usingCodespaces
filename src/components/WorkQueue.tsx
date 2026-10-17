import { useState, useMemo, useEffect } from 'react';
import {
  Phone, Mail, CheckCircle2, XCircle, Ban, Clock, ChevronDown, ChevronRight,
  Calendar, Send, User, Building2, MoreVertical, AlertCircle, Inbox,
  SkipForward, Undo2, Play, Trash2, PauseCircle, Sun, Hourglass,
} from 'lucide-react';
import {
  useStore, markTouchpoint, skipTouchpoint, restoreTouchpoint, stopLead, resumeLead,
  removeLead, deleteLead, addCallLog, sendEmail,
} from '@/store';
import type { Lead, TouchPoint, CallType, TouchPointType, Workflow, EmailTemplate } from '@/types';
import { LeadPicker } from '@/components/LeadPicker';
import {
  queueCategory, highestCallType, dueInfo, isOpenTouchPoint, type QueueCategory,
  queueBucket, currentTouchPoint, becomesTodayAt, formatSpan, lastTouchAt,
  campaignLabel, stepLabel,
} from '@/lib/workflow';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  discovery: { label: 'Discovery', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  lvm: { label: 'LVM', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  nvm: { label: 'NVM', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  no_response: { label: 'No Response', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  arranged_meeting: { label: 'Meeting', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
};

// The categories a lead can sit in inside a touch point step. NVM-only leads are shown inside LVM.
const CATEGORY_ORDER: QueueCategory[] = ['new', 'discovery', 'lvm', 'meeting'];
const CATEGORY_CONFIG: Record<QueueCategory, { label: string; color: string; dot: string }> = {
  new: STATUS_CONFIG.new,
  discovery: STATUS_CONFIG.discovery,
  lvm: { ...STATUS_CONFIG.lvm, label: 'LVM' },
  meeting: STATUS_CONFIG.arranged_meeting,
};

const DUE_TONE = {
  overdue: 'text-red-600 font-medium',
  today: 'text-amber-600 font-medium',
  later: 'text-slate-400',
  none: 'text-slate-400',
};

interface StepGroup {
  order: number;
  type: TouchPointType;
  label: string;
  byCategory: Record<QueueCategory, Lead[]>;
  total: number;
}
interface CampaignGroup {
  code: string;
  name: string;            // "Activation" - what the agent sees instead of ACT-001
  today: StepGroup[];
  next: StepGroup[];
  todayCount: number;
  nextCount: number;
  stopped: Lead[];         // leads whose workflow the agent stopped
  finished: Lead[];        // leads that finished every touch point
  total: number;
}

const emptyByCategory = (): Record<QueueCategory, Lead[]> => ({ new: [], discovery: [], lvm: [], meeting: [] });

/**
 * Campaign -> Today / Next / Stop.
 *   Today = touch point is due today (or overdue)     Next = due tomorrow or later     Stop = stopped by the agent
 * Inside Today / Next the leads are grouped by touch point step (1: CALL, 2: EMAIL ...) and then by category.
 */
function buildQueue(leads: Lead[], workflows: Workflow[], now: number): CampaignGroup[] {
  const byCampaign = new Map<string, Lead[]>();
  for (const l of leads) {
    if (!byCampaign.has(l.campaignCode)) byCampaign.set(l.campaignCode, []);
    byCampaign.get(l.campaignCode)!.push(l);
  }

  return [...byCampaign.entries()].map(([code, campaignLeads]) => {
    const maps = { today: new Map<number, StepGroup>(), next: new Map<number, StepGroup>() };
    const stopped: Lead[] = [];
    const finished: Lead[] = [];
    let todayCount = 0, nextCount = 0;

    for (const lead of campaignLeads) {
      const bucket = queueBucket(lead, now);
      if (bucket === 'stop') { stopped.push(lead); continue; }
      if (bucket === 'finished') { finished.push(lead); continue; }
      const tp = currentTouchPoint(lead)!;
      const stepMap = maps[bucket];
      if (!stepMap.has(tp.order)) stepMap.set(tp.order, { order: tp.order, type: tp.type, label: tp.label, byCategory: emptyByCategory(), total: 0 });
      const step = stepMap.get(tp.order)!;
      step.byCategory[queueCategory(lead)].push(lead);
      step.total++;
      if (bucket === 'today') todayCount++; else nextCount++;
    }

    // inside a step: the lead that has waited longest comes first
    const dueOf = (l: Lead) => new Date(currentTouchPoint(l)?.dueDate ?? 0).getTime();
    const finish = (m: Map<number, StepGroup>) => [...m.values()]
      .sort((a, b) => a.order - b.order)
      .map(s => { CATEGORY_ORDER.forEach(c => s.byCategory[c].sort((a, b) => dueOf(a) - dueOf(b))); return s; });

    return {
      code, name: campaignLabel(workflows, code),
      today: finish(maps.today), next: finish(maps.next),
      todayCount, nextCount, stopped, finished, total: campaignLeads.length,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

const BUCKET_STYLE = {
  today: { label: 'Today', hint: 'due today or overdue', icon: Sun, wrap: 'border-blue-200', head: 'bg-blue-50 hover:bg-blue-100/70', text: 'text-blue-800', pill: 'bg-blue-600 text-white' },
  next: { label: 'Next', hint: 'tomorrow or later', icon: Hourglass, wrap: 'border-slate-200', head: 'bg-slate-50 hover:bg-slate-100', text: 'text-slate-700', pill: 'bg-slate-600 text-white' },
  stop: { label: 'Stop', hint: 'workflows you stopped', icon: PauseCircle, wrap: 'border-amber-200', head: 'bg-amber-50 hover:bg-amber-100/70', text: 'text-amber-800', pill: 'bg-amber-500 text-white' },
} as const;

export function WorkQueue() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  // sections the agent flipped away from their default (campaign + Today open, Next + Stop closed)
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [callLeadId, setCallLeadId] = useState<string | null>(null);
  const [emailLeadId, setEmailLeadId] = useState<string | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

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
    () => state.leads.filter(l => !l.removedFromQueue && l.agentId === currentUser.id),
    [state.leads, currentUser.id],
  );
  const queue = useMemo(() => buildQueue(myLeads, state.workflows, now), [myLeads, state.workflows, now]);

  const todayStr = new Date().toISOString().split('T')[0];
  const arrangedMeetingsToday = useMemo(() => state.meetings.filter(m =>
    m.type === 'lead_meeting' && m.date === todayStr && m.status === 'arranged' &&
    m.participantIds.includes(currentUser.id)
  ), [state.meetings, currentUser.id, todayStr]);

  const isOpen = (key: string, defaultOpen: boolean) => (flipped.has(key) ? !defaultOpen : defaultOpen);
  const toggle = (key: string) =>
    setFlipped(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const currentTP = currentTouchPoint;

  const handleMarkComplete = (lead: Lead, tp: TouchPoint) => {
    if (tp.type === 'call') setCallLeadId(lead.id);
    else setEmailLeadId(lead.id);
  };

  const todayTotal = queue.reduce((n, c) => n + c.todayCount, 0);
  const nextTotal = queue.reduce((n, c) => n + c.nextCount, 0);
  const stoppedTotal = queue.reduce((n, c) => n + c.stopped.length, 0);
  const overdueCount = myLeads.filter(l => queueBucket(l, now) === 'today' && dueInfo(currentTP(l)).tone === 'overdue').length;

  /** Steps (1: CALL, 2: EMAIL ...) -> categories -> lead rows, for the Today and Next sections. */
  const renderSteps = (campaign: CampaignGroup, bucket: 'today' | 'next') => {
    const steps = bucket === 'today' ? campaign.today : campaign.next;
    return steps.map(step => {
      const stepKey = `${campaign.code}|${bucket}|${step.order}`;
      const stepOpen = isOpen(stepKey, true);
      const StepIcon = step.type === 'call' ? Phone : Mail;
      return (
        <div key={stepKey} className="border-b border-slate-100 last:border-0">
          <button
            onClick={() => toggle(stepKey)}
            className="w-full flex items-center gap-2.5 px-5 py-2.5 hover:bg-slate-50/60 transition-colors"
          >
            {stepOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.type === 'call' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
              <StepIcon className="w-3 h-3" />
            </span>
            <span className="text-sm font-semibold text-slate-800">{stepLabel(step.order, step.type)}</span>
            <span className="text-xs text-slate-400 truncate">{step.label}</span>
            <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{step.total}</span>
          </button>

          {stepOpen && (
            <div className="pl-6 bg-slate-50/30">
              {CATEGORY_ORDER.filter(cat => step.byCategory[cat].length > 0).map(cat => {
                const cfg = CATEGORY_CONFIG[cat];
                const catKey = `${stepKey}|${cat}`;
                const catOpen = isOpen(catKey, true);
                const leads = step.byCategory[cat];
                return (
                  <div key={catKey} className="border-t border-slate-100">
                    <button
                      onClick={() => toggle(catKey)}
                      className="w-full flex items-center gap-2.5 px-5 py-2 hover:bg-slate-50 transition-colors"
                    >
                      {catOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-sm font-medium text-slate-700">{cfg.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{leads.length}</span>
                    </button>
                    {catOpen && (
                      <div className="divide-y divide-slate-100 bg-white">
                        {leads.map(lead => (
                          <LeadRow
                            key={lead.id}
                            lead={lead}
                            tp={currentTP(lead)}
                            bucket={bucket}
                            now={now}
                            onAction={handleMarkComplete}
                            onSkip={(l, tp) => dispatch(skipTouchpoint({ leadId: l.id, order: tp.order }))}
                            onDetails={l => setSelectedLeadId(l.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  /** The big Today / Next / Stop block of one campaign. */
  const renderBucket = (campaign: CampaignGroup, bucket: 'today' | 'next' | 'stop') => {
    const style = BUCKET_STYLE[bucket];
    const Icon = style.icon;
    const key = `${campaign.code}|${bucket}`;
    const open = isOpen(key, bucket === 'today');
    const count = bucket === 'today' ? campaign.todayCount : bucket === 'next' ? campaign.nextCount : campaign.stopped.length;
    return (
      <div key={key} className={`mx-3 my-3 rounded-xl border overflow-hidden ${style.wrap}`}>
        <button onClick={() => toggle(key)} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${style.head}`}>
          {open ? <ChevronDown className={`w-4 h-4 ${style.text}`} /> : <ChevronRight className={`w-4 h-4 ${style.text}`} />}
          <Icon className={`w-4 h-4 ${style.text}`} />
          <span className={`text-sm font-bold uppercase tracking-wide ${style.text}`}>{style.label}</span>
          <span className="text-xs text-slate-500 hidden sm:inline">{style.hint}</span>
          <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.pill}`}>{count}</span>
        </button>

        {open && (
          <div className="bg-white border-t border-slate-100">
            {count === 0 && (
              <div className="px-5 py-5 text-sm text-slate-400">
                {bucket === 'today' ? 'Nothing due today in this campaign.' : bucket === 'next' ? 'Nothing coming up.' : 'No stopped workflows.'}
              </div>
            )}

            {bucket !== 'stop' && count > 0 && renderSteps(campaign, bucket)}

            {bucket === 'stop' && campaign.stopped.length > 0 && (
              <div className="divide-y divide-slate-100">
                {campaign.stopped.map(lead => {
                  const tp = currentTP(lead);
                  return (
                    <div key={lead.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{lead.leadCode}</span>
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm font-medium text-slate-900 truncate">{lead.companyName}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {tp ? `Stopped at ${stepLabel(tp.order, tp.type)} · ${tp.label}` : 'Stopped after finishing all touch points'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => dispatch(resumeLead(lead.id))}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 flex items-center gap-1.5"
                        >
                          <Play className="w-3 h-3" /> Resume
                        </button>
                        <button
                          onClick={() => setDeleteLeadId(lead.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <button
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-slate-500 mb-1">Today</div>
          <div className="text-2xl font-bold text-blue-600">{todayTotal}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500 mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500 mb-1">Next</div>
          <div className="text-2xl font-bold text-slate-700">{nextTotal}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500 mb-1">Stopped</div>
          <div className="text-2xl font-bold text-amber-600">{stoppedTotal}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2 lg:col-span-1">
          <div className="text-sm text-slate-500 mb-1">Meetings Today</div>
          <div className="text-2xl font-bold text-blue-600">{arrangedMeetingsToday.length}</div>
        </div>
      </div>

      {/* Arranged meetings today */}
      {arrangedMeetingsToday.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-blue-900">Arranged Meetings — Today</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {arrangedMeetingsToday.map(m => (
              <button
                key={m.id}
                onClick={() => { if (m.leadId && leadById(m.leadId)) setSelectedLeadId(m.leadId); }}
                className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100 hover:border-blue-300 transition-all text-left"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">{m.companyName}</div>
                  <div className="text-xs text-slate-500">{m.leadName} — {m.time}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Find a lead: type to search, then select it to open its details (same picker as the email form) */}
      <div className="mb-6">
        <LeadPicker
          leads={myLeads}
          value=""
          onChange={id => { if (id) setSelectedLeadId(id); }}
          placeholder="Search a lead by name, code, email or phone, then select it..."
        />
      </div>

      {/* Work queue: campaign -> Today / Next / Stop */}
      <div className="space-y-3">
        {queue.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No leads in your work queue</p>
          </div>
        )}

        {queue.map(campaign => {
          const campKey = campaign.code;
          const campOpen = isOpen(campKey, true);
          return (
            <div key={campKey} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggle(campKey)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                {campOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span className="text-base font-bold text-slate-900">{campaign.name}</span>
                <div className="ml-auto flex items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Today {campaign.todayCount}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Next {campaign.nextCount}</span>
                  {campaign.stopped.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Stop {campaign.stopped.length}</span>
                  )}
                </div>
              </button>

              {campOpen && (
                <div className="border-t border-slate-100 pb-1">
                  {renderBucket(campaign, 'today')}
                  {renderBucket(campaign, 'next')}
                  {renderBucket(campaign, 'stop')}

                  {campaign.finished.length > 0 && (
                    <div className="mx-3 mb-3 rounded-xl border border-green-200 overflow-hidden">
                      <button
                        onClick={() => toggle(`${campKey}|done`)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-green-50/60 hover:bg-green-50"
                      >
                        {isOpen(`${campKey}|done`, false) ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-slate-800">Workflow finished</span>
                        <span className="ml-auto text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full">{campaign.finished.length}</span>
                      </button>
                      {isOpen(`${campKey}|done`, false) && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {campaign.finished.map(lead => (
                            <LeadRow
                              key={lead.id} lead={lead} tp={undefined} bucket="finished" now={now}
                              onAction={handleMarkComplete} onSkip={() => {}} onDetails={l => setSelectedLeadId(l.id)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lead detail drawer */}
      {selectedLead && (
        <LeadDetailDrawer
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onMarkComplete={tp => handleMarkComplete(selectedLead, tp)}
          onSkip={tp => dispatch(skipTouchpoint({ leadId: selectedLead.id, order: tp.order }))}
          onRestore={tp => dispatch(restoreTouchpoint({ leadId: selectedLead.id, order: tp.order }))}
          onStop={() => dispatch(stopLead(selectedLead.id))}
          onResume={() => dispatch(resumeLead(selectedLead.id))}
          onRemove={() => { dispatch(removeLead(selectedLead.id)); setSelectedLeadId(null); }}
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
            dispatch(addCallLog({
              leadId: callLead.id,
              log: { id: crypto.randomUUID(), type, description, timestamp: new Date().toISOString(), touchPointOrder: order },
            }));
            dispatch(markTouchpoint({ leadId: callLead.id, order }));
            setCallLeadId(null);
          }}
        />
      )}

      {/* Email modal */}
      {emailLead && (
        <EmailModal
          lead={emailLead}
          category={queueCategory(emailLead)}
          templates={state.emailTemplates}
          onClose={() => setEmailLeadId(null)}
          onSend={(to, subject, body, templateType) => {
            dispatch(sendEmail({
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

      {/* Delete confirmation */}
      {leadToDelete && (
        <ConfirmDeleteModal
          lead={leadToDelete}
          onCancel={() => setDeleteLeadId(null)}
          onConfirm={() => {
            dispatch(deleteLead(leadToDelete.id));
            setDeleteLeadId(null);
            setSelectedLeadId(null);
          }}
        />
      )}
    </div>
  );
}

function LeadRow({
  lead, tp, bucket, now, onAction, onSkip, onDetails,
}: {
  lead: Lead;
  tp: TouchPoint | undefined;
  bucket: 'today' | 'next' | 'finished';
  now: number;
  onAction: (lead: Lead, tp: TouchPoint) => void;
  onSkip: (lead: Lead, tp: TouchPoint) => void;
  onDetails: (lead: Lead) => void;
}) {
  const due = dueInfo(tp);
  const best = highestCallType(lead);
  const nvmOnly = best === 'nvm';
  const overdue = due.tone === 'overdue';

  // Counting runs FORWARD from the last touch point the agent did - not down from the day the lead was assigned.
  const lastTouch = lastTouchAt(lead);
  const enterTodayAt = becomesTodayAt(tp);

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{lead.leadCode}</span>
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-900 truncate">{lead.companyName}</span>
          {nvmOnly && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium shrink-0">NVM only</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{lead.contactName}</span>
          {tp && (
            <span className={`flex items-center gap-1 ${DUE_TONE[due.tone]}`}>
              {tp.type === 'call' ? <Phone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
              {due.label}
              {overdue && <AlertCircle className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end gap-0.5 text-xs shrink-0 text-right">
        {bucket === 'next' && enterTodayAt !== null && (
          <span className="text-slate-700 font-medium flex items-center gap-1">
            <Hourglass className="w-3 h-3" />
            Today in {formatSpan(enterTodayAt - now)}
          </span>
        )}
        {bucket === 'today' && (
          <span className={`font-medium flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-blue-600'}`}>
            <Clock className="w-3 h-3" />
            {overdue && tp?.dueDate ? `Waiting ${formatSpan(now - new Date(tp.dueDate).getTime())}` : 'Your turn now'}
          </span>
        )}
        <span className="text-slate-400">
          {lastTouch === null ? 'No touch yet' : `Last touch ${formatSpan(now - lastTouch)} ago`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {tp && bucket === 'today' && (
          <>
            <button
              onClick={() => onAction(lead, tp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                overdue ? 'bg-red-600 text-white hover:bg-red-700'
                : tp.type === 'call' ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              {tp.type === 'call' ? <Phone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
              Mark {tp.type === 'call' ? 'Call' : 'Email'}
            </button>
            <button
              onClick={() => onSkip(lead, tp)}
              title="Skip this touch point"
              aria-label="Skip this touch point"
              className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button
          onClick={() => onDetails(lead)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Details
        </button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ lead, onCancel, onConfirm }: { lead: Lead; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-slide-up p-6">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Delete this lead?</h2>
        <p className="text-sm text-slate-500 mb-5">
          <span className="font-medium text-slate-700">{lead.leadCode} — {lead.companyName}</span> will be deleted permanently
          with its call history and activity log. Its arranged meetings will be cancelled. This can’t be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700">Delete permanently</button>
        </div>
      </div>
    </div>
  );
}

function LeadDetailDrawer({
  lead, onClose, onMarkComplete, onSkip, onRestore, onStop, onResume, onRemove, onDelete, onScheduleMeeting, agentName,
}: {
  lead: Lead;
  onClose: () => void;
  onMarkComplete: (tp: TouchPoint) => void;
  onSkip: (tp: TouchPoint) => void;
  onRestore: (tp: TouchPoint) => void;
  onStop: () => void;
  onResume: () => void;
  onRemove: () => void;
  onDelete: () => void;
  onScheduleMeeting: () => void;
  agentName: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = STATUS_CONFIG[lead.status];
  const category = queueCategory(lead);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto scrollbar-thin animate-slide-in shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{lead.leadCode}</h2>
            <p className="text-sm text-slate-500">{lead.companyName} • {lead.contactName}</p>
          </div>
          <div className="flex items-center gap-2">
            {lead.stopped && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">Stopped</span>}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.color}`}>{config.label}</span>
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                <MoreVertical className="w-4 h-4 text-slate-500" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-20 py-1">
                  {lead.stopped ? (
                    <>
                      <button onClick={() => { onResume(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50">
                        <Play className="w-3.5 h-3.5" /> Resume Workflow
                      </button>
                      <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { onScheduleMeeting(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <Calendar className="w-3.5 h-3.5" /> Schedule Meeting
                      </button>
                      <button onClick={() => { onStop(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50">
                        <Ban className="w-3.5 h-3.5" /> Stop Workflow
                      </button>
                      <button onClick={() => { onRemove(); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <XCircle className="w-3.5 h-3.5" /> Remove from Queue
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {lead.stopped && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
            <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 flex-1">This workflow is stopped. Resume it to bring the lead back to the queue, or delete it.</p>
            <button onClick={onResume} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 shrink-0">Resume</button>
          </div>
        )}

        {/* Contact info */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">Phone</div>
              <div className="text-sm text-slate-900">{lead.phone || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Email</div>
              <div className="text-sm text-slate-900 truncate">{lead.email || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Agent</div>
              <div className="text-sm text-slate-900">{agentName}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Queue category</div>
              <div className="text-sm text-slate-900">{CATEGORY_CONFIG[category].label}</div>
            </div>
          </div>
        </div>

        {/* Touch points timeline */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Workflow Touch Points</h3>
          <div className="space-y-2">
            {lead.touchPoints.map(tp => {
              const isCurrent = tp.order === lead.currentTouchPoint;
              const skipped = tp.status === 'skipped';
              const open = isOpenTouchPoint(tp);
              const due = dueInfo(open ? tp : undefined);
              const overdue = due.tone === 'overdue';
              return (
                <div
                  key={tp.order}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isCurrent && !lead.stopped ? 'border-blue-300 bg-blue-50/50' : 'border-slate-100'
                  } ${skipped ? 'opacity-70' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    tp.status === 'completed' ? 'bg-green-100' : overdue ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    {tp.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : skipped ? (
                      <SkipForward className="w-4 h-4 text-slate-400" />
                    ) : tp.type === 'call' ? (
                      <Phone className={`w-4 h-4 ${overdue ? 'text-red-600' : 'text-slate-500'}`} />
                    ) : (
                      <Mail className={`w-4 h-4 ${overdue ? 'text-red-600' : 'text-slate-500'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium text-slate-900 ${skipped ? 'line-through text-slate-500' : ''}`}>
                      {tp.order + 1}. {tp.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      {tp.status === 'completed' && tp.completedAt
                        ? `Completed ${new Date(tp.completedAt).toLocaleDateString()}`
                        : skipped
                        ? `Skipped${tp.skippedAt ? ' ' + new Date(tp.skippedAt).toLocaleDateString() : ''}`
                        : tp.dueDate
                        ? <>Due {new Date(tp.dueDate).toLocaleDateString()}{overdue && <span className="text-red-600 ml-1">• Overdue</span>}</>
                        : 'Pending'}
                    </div>
                  </div>

                  {!lead.stopped && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrent && open && (
                        <button
                          onClick={() => onMarkComplete(tp)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all ${
                            tp.type === 'call' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'
                          }`}
                        >
                          {tp.type === 'call' ? 'Log Call' : 'Send Email'}
                        </button>
                      )}
                      {open && (
                        <button
                          onClick={() => onSkip(tp)}
                          title="Skip this touch point"
                          aria-label="Skip this touch point"
                          className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {skipped && (
                        <button
                          onClick={() => onRestore(tp)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Undo2 className="w-3 h-3" /> Restore
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Call logs */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Call History ({lead.callLogs.length})</h3>
          {lead.callLogs.length === 0 ? (
            <p className="text-sm text-slate-400">No calls logged yet</p>
          ) : (
            <div className="space-y-2">
              {lead.callLogs.map(cl => (
                <div key={cl.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      cl.type === 'discovery' ? 'bg-green-100 text-green-700' :
                      cl.type === 'lvm' ? 'bg-amber-100 text-amber-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {cl.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(cl.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700">{cl.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Activity History</h3>
          <div className="space-y-2">
            {lead.history.map(h => (
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
      </div>
    </div>
  );
}

function CallLogModal({
  lead, onClose, onSave,
}: {
  lead: Lead;
  onClose: () => void;
  onSave: (type: CallType, description: string) => void;
}) {
  const [callType, setCallType] = useState<CallType>('nvm');
  const [description, setDescription] = useState('');

  const callTypes: { value: CallType; label: string; desc: string; color: string }[] = [
    { value: 'nvm', label: 'NVM', desc: 'No Voicemail', color: 'border-orange-300 bg-orange-50 text-orange-700' },
    { value: 'lvm', label: 'LVM', desc: 'Left Voicemail', color: 'border-amber-300 bg-amber-50 text-amber-700' },
    { value: 'discovery', label: 'Discovery', desc: 'Client Responded', color: 'border-green-300 bg-green-50 text-green-700' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Log Call</h2>
            <p className="text-sm text-slate-500">{lead.companyName} — {lead.contactName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Call Type</label>
            <div className="grid grid-cols-3 gap-2">
              {callTypes.map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setCallType(ct.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    callType === ct.value ? ct.color : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-sm">{ct.label}</div>
                  <div className="text-xs mt-0.5 opacity-80">{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Call Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What happened during the call?"
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">Required — this will be used for AI analysis</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(callType, description)}
            disabled={!description.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Save & Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailModal({
  lead, category, templates, onClose, onSend,
}: {
  lead: Lead;
  category: QueueCategory;
  templates: EmailTemplate[];
  onClose: () => void;
  onSend: (to: string, subject: string, body: string, templateType: 'discovery' | 'no_response' | 'custom') => void;
}) {
  const templateType = category === 'discovery' ? 'discovery' : 'no_response';
  const template = templates.find(t => t.type === templateType);
  const [to, setTo] = useState(lead.email || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Send Email</h2>
            <p className="text-sm text-slate-500">{lead.companyName} — Template: {templateType === 'discovery' ? 'Discovery' : 'No Response'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <input
              type="email"
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSend(to, subject, body, templateType)}
            disabled={!to.trim() || !subject.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send & Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}
