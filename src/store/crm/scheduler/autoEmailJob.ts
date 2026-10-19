/** Job: sends an email touch point automatically when it comes due. */
import { fillEmailTemplate } from '@/domain/email/fillEmailTemplate';
import { effectiveCallType } from '@/domain/workflow/callClassification';
import { isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { createSystemHistoryEntry } from '@/store/crm/helpers/leadHistory';
import { pointLeadAtFirstOpenTouchPoint } from '@/store/crm/helpers/touchPointScheduling';
import type { AppState } from '@/store/state/AppState';

/**
 * Email touch point came due -> the system sends it. Discovery template if the lead reached Discovery, otherwise
 * the No Response template. A call step is never skipped: if the lead is waiting on a call, nothing is sent.
 * No email address -> nothing is sent and the step stays open. (Sending is simulated: it is logged, not delivered.)
 */
export function runAutoEmailJob(state: AppState, now: number) {
  const nowIso = new Date(now).toISOString();
  for (const l of state.leads) {
    if (l.stopped || l.removedFromQueue || l.expiredAt || !l.email) continue;
    const tp = l.touchPoints.find(t => t.order === l.currentTouchPoint);
    if (!tp || tp.type !== 'email' || !isOpenTouchPoint(tp)) continue;
    if (!tp.dueDate || new Date(tp.dueDate).getTime() > now) continue;

    const key = `auto|${l.id}|${l.round ?? 1}|${tp.order}`;
    if (state.emailLogs.some(e => e.idempotencyKey === key)) continue;

    const type = effectiveCallType(l) === 'discovery' ? 'discovery' : 'no_response';
    const tpl = state.emailTemplates.find(t => t.type === type);
    if (!tpl) continue;
    const agent = state.users.find(u => u.id === l.agentId);
    const agentName = agent?.name ?? '';
    const emailId = crypto.randomUUID();

    state.emailLogs.unshift({
      id: emailId, leadId: l.id, leadName: l.companyName, to: l.email,
      subject: fillEmailTemplate(tpl.subject, l, agentName), body: fillEmailTemplate(tpl.body, l, agentName),
      templateType: type, sentAt: nowIso, sentBy: l.agentId, sentByName: agentName,
      auto: true, idempotencyKey: key,
    });
    tp.status = 'completed';
    tp.completedAt = nowIso;
    pointLeadAtFirstOpenTouchPoint(l);
    l.history.push(createSystemHistoryEntry(l, 'auto_email_sent', `${tpl.name} sent to ${l.email}`, tp, { emailLogId: emailId, templateType: type }));
    state.notifications.unshift({
      id: crypto.randomUUID(), type: 'email', title: 'Email sent automatically',
      message: `${l.companyName}: ${tp.label}`, timestamp: nowIso, read: false, leadId: l.id, userId: l.agentId,
    });
  }
}
