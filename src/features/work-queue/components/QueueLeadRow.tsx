import { AlertCircle, Building2, Clock, Hourglass, Mail, Phone, SkipForward, User } from 'lucide-react';
import type { Lead, TouchPoint } from '@/domain/types';
import { daysUntilExpiry } from '@/domain/workflow/leadExpiry';
import { becomesTodayAt } from '@/domain/workflow/leadQueue';
import { describeDueDate, lastTouchTimestamp } from '@/domain/workflow/touchPoints';
import { DUE_TONE_CLASS } from '@/features/work-queue/queueStyles';
import { formatDuration } from '@/shared/lib/dates';

export function QueueLeadRow({
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
  const due = describeDueDate(tp);
  const overdue = due.tone === 'overdue';
  // 15-day rule: warn the agent when a lead is about to leave the queue
  const daysLeft = daysUntilExpiry(lead, now);
  const expiring = daysLeft <= 3;
  // an email step with no address cannot be sent automatically
  const missingEmail = !!tp && tp.type === 'email' && !lead.email;

  // Counting runs FORWARD from the last touch point the agent did - not down from the day the lead was assigned.
  const lastTouch = lastTouchTimestamp(lead);
  const enterTodayAt = becomesTodayAt(tp);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{lead.leadCode}</span>
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-900 truncate">{lead.companyName}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{lead.contactName}</span>
          {expiring && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Hourglass className="w-3 h-3" />
              {daysLeft === 0 ? 'Leaves queue today' : `Leaves queue in ${daysLeft}d`}
            </span>
          )}
          {missingEmail && (
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <AlertCircle className="w-3 h-3" />
              No email - can't auto-send
            </span>
          )}
          {tp && (
            <span className={`flex items-center gap-1 ${DUE_TONE_CLASS[due.tone]}`}>
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
            Today in {formatDuration(enterTodayAt - now)}
          </span>
        )}
        {bucket === 'today' && (
          <span className={`font-medium flex items-center gap-1 ${overdue ? 'text-rose-600' : 'text-blue-600'}`}>
            <Clock className="w-3 h-3" />
            {overdue && tp?.dueDate ? `Waiting ${formatDuration(now - new Date(tp.dueDate).getTime())}` : 'Your turn now'}
          </span>
        )}
        <span className="text-slate-500">
          {lastTouch === null ? 'No touch yet' : `Last touch ${formatDuration(now - lastTouch)} ago`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        {tp && bucket === 'today' && (
          <>
            <button
              onClick={() => onAction(lead, tp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                overdue ? 'bg-rose-600 text-white hover:bg-rose-700'
                : tp.type === 'call' ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                : 'bg-violet-600 text-white hover:bg-violet-700'
              }`}
            >
              {tp.type === 'call' ? <Phone className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
              Mark {tp.type === 'call' ? 'Call' : 'Email'}
            </button>
            <button
              onClick={() => onSkip(lead, tp)}
              title="Skip this touch point"
              aria-label="Skip this touch point"
              className="w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center"
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
