import { ChevronDown, ChevronRight, Mail, Phone } from 'lucide-react';
import { findCurrentTouchPoint, stepLabel } from '@/domain/workflow/touchPoints';
import { QUEUE_CATEGORY_ORDER, QUEUE_CATEGORY_STYLE } from '@/features/work-queue/queueStyles';
import { QueueLeadRow } from '@/features/work-queue/components/QueueLeadRow';
import type { TouchPointStepGroup } from '@/features/work-queue/buildWorkQueue';
import type { QueueHandlers } from '@/features/work-queue/queueHandlers';
import type { CollapsibleSections } from '@/features/work-queue/useCollapsibleSections';

interface TouchPointStepSectionProps {
  campaignCode: string;
  bucket: 'today' | 'next';
  step: TouchPointStepGroup;
  now: number;
  sections: CollapsibleSections;
  handlers: QueueHandlers;
}

/** One touch point step (for example "1: CALL") of a campaign, split into its categories (New / Discovery / LVM / NVM / Meeting). */
export function TouchPointStepSection({ campaignCode, bucket, step, now, sections, handlers }: TouchPointStepSectionProps) {
  const { isOpen, toggle } = sections;
  const stepKey = `${campaignCode}|${bucket}|${step.order}`;
  const stepOpen = isOpen(stepKey, true);
  const StepIcon = step.type === 'call' ? Phone : Mail;
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => toggle(stepKey)}
        className="w-full flex items-center gap-2.5 px-5 py-2.5 hover:bg-slate-50/60 transition-colors"
      >
        {stepOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
        <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.type === 'call' ? 'bg-cyan-50 text-cyan-700' : 'bg-violet-50 text-violet-600'}`}>
          <StepIcon className="w-3 h-3" />
        </span>
        <span className="text-sm font-semibold text-slate-800">{stepLabel(step.order, step.type)}</span>
        <span className="text-xs text-slate-500 truncate">{step.label}</span>
        <span className="ml-auto text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{step.total}</span>
      </button>

      {stepOpen && (
        <div className="pl-6 bg-slate-50/30">
          {QUEUE_CATEGORY_ORDER.filter(cat => step.byCategory[cat].length > 0).map(cat => {
            const cfg = QUEUE_CATEGORY_STYLE[cat];
            const catKey = `${stepKey}|${cat}`;
            const catOpen = isOpen(catKey, true);
            const leads = step.byCategory[cat];
            return (
              <div key={catKey} className="border-t border-slate-100">
                <button
                  onClick={() => toggle(catKey)}
                  className="w-full flex items-center gap-2.5 px-5 py-2 hover:bg-slate-50 transition-colors"
                >
                  {catOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-sm font-medium text-slate-700">{cfg.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>{leads.length}</span>
                </button>
                {catOpen && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {leads.map(lead => (
                      <QueueLeadRow
                        key={lead.id}
                        lead={lead}
                        tp={findCurrentTouchPoint(lead)}
                        bucket={bucket}
                        now={now}
                        onAction={handlers.onMarkComplete}
                        onSkip={handlers.onSkip}
                        onDetails={handlers.onDetails}
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
}
