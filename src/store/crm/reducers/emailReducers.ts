/** Sending emails (one lead, many leads, or free-form). */
import type { PayloadAction } from '@reduxjs/toolkit';
import { fillEmailTemplate } from '@/domain/email/fillEmailTemplate';
import { isValidEmail } from '@/domain/lead/leadCode';
import type { EmailLog, TouchPoint } from '@/domain/types';
import { isOpenTouchPoint } from '@/domain/workflow/touchPoints';
import { findCurrentUser, findLeadById, isLeadWorkable, isOwnedByCurrentUser } from '@/store/crm/helpers/currentUserGuards';
import { createUserHistoryEntry } from '@/store/crm/helpers/leadHistory';
import { pointLeadAtFirstOpenTouchPoint } from '@/store/crm/helpers/touchPointScheduling';
import type { AppState } from '@/store/state/AppState';

export const emailReducers = {
  sendEmailForLead(state: AppState, a: PayloadAction<{ email: EmailLog; leadId: string; touchPointOrder: number }>) {
    const l = a.payload.leadId ? findLeadById(state, a.payload.leadId) : undefined;
    if (a.payload.leadId && (!l || !isOwnedByCurrentUser(state, l))) return;       // an agent can only email for their own lead
    state.emailLogs.unshift({ ...a.payload.email, sentBy: state.currentUserId || a.payload.email.sentBy });
    if (!l) return;
    const tp = l.touchPoints.find(t => t.order === a.payload.touchPointOrder);
    // Only an open EMAIL touch point is completed; a free email (order -1) leaves the workflow alone.
    if (tp && tp.type === 'email' && isOpenTouchPoint(tp) && isLeadWorkable(l)) {
      tp.status = 'completed';
      tp.completedAt = new Date().toISOString();
      pointLeadAtFirstOpenTouchPoint(l);
    }
    l.history.push(createUserHistoryEntry(state, l, 'email_sent', `Email sent to ${a.payload.email.to}`, tp, { emailLogId: a.payload.email.id, subject: a.payload.email.subject }));
  },
  /**
   * Optional shortcut for agents: send one email to many leads and mark their current EMAIL step complete.
   * Only the lead's CURRENT step is completed (and only if it is an open email step), never later ones.
   * [Name], [Company Name] and [Agent Name] in the subject/body are filled in per lead.
   */
  sendBulkEmailForLeads(state: AppState, a: PayloadAction<{ leadIds: string[]; subject: string; body: string; senderId: string; senderName: string; templateType?: EmailLog['templateType'] }>) {
    const now = new Date().toISOString();
    const senderName = findCurrentUser(state)?.name ?? a.payload.senderName;

    for (const id of new Set(a.payload.leadIds)) {
      const l = findLeadById(state, id);
      // never "send" to a lead that has no usable email, and never touch someone else's / a stopped lead
      if (!l || !isOwnedByCurrentUser(state, l) || !isLeadWorkable(l) || !isValidEmail(l.email || '')) continue;
      const tp = l.touchPoints.find(t => t.order === l.currentTouchPoint);
      const subject = fillEmailTemplate(a.payload.subject, l, senderName);
      const emailId = crypto.randomUUID();

      state.emailLogs.unshift({
        id: emailId, leadId: id, leadName: l.companyName,
        to: l.email,
        subject, body: fillEmailTemplate(a.payload.body, l, senderName),
        templateType: a.payload.templateType ?? 'custom',
        sentAt: now, sentBy: state.currentUserId, sentByName: senderName,
      });

      let completed: TouchPoint | undefined;
      if (tp && tp.type === 'email' && isOpenTouchPoint(tp)) {
        tp.status = 'completed';
        tp.completedAt = now;
        completed = tp;
        pointLeadAtFirstOpenTouchPoint(l);
      }
      l.history.push(createUserHistoryEntry(
        state, l, 'bulk_email_sent', `Email sent to ${l.email}`, completed ?? undefined,
        { emailLogId: emailId, subject },
      ));
    }
  },
  sendStandaloneEmail(state: AppState, a: PayloadAction<{ to: string; subject: string; body: string; senderId: string; senderName: string; templateType?: EmailLog['templateType']; leadName?: string }>) {
    state.emailLogs.unshift({
      id: crypto.randomUUID(), leadId: '', leadName: a.payload.leadName ?? '', to: a.payload.to,
      subject: a.payload.subject, body: a.payload.body, templateType: a.payload.templateType ?? 'custom',
      sentAt: new Date().toISOString(), sentBy: a.payload.senderId, sentByName: a.payload.senderName,
    });
  },
};
