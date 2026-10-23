import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { QueueBucketSection } from '@/features/work-queue/components/QueueBucketSection';
import { QueueLeadRow } from '@/features/work-queue/components/QueueLeadRow';
import type { CampaignQueue } from '@/features/work-queue/buildWorkQueue';
import type { QueueHandlers } from '@/features/work-queue/queueHandlers';
import type { CollapsibleSections } from '@/features/work-queue/useCollapsibleSections';

interface CampaignSectionProps {
  campaign: CampaignQueue;
  now: number;
  sections: CollapsibleSections;
  handlers: QueueHandlers;
}

/** One campaign: its Today / Next / Stop blocks and the leads that finished every touch point. */
export function CampaignSection({ campaign, now, sections, handlers }: CampaignSectionProps) {
  const { isOpen, toggle } = sections;
  const campKey = campaign.code;
  const campOpen = isOpen(campKey, true);
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => toggle(campKey)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        {campOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
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
          <QueueBucketSection campaign={campaign} bucket="today" now={now} sections={sections} handlers={handlers} />
          <QueueBucketSection campaign={campaign} bucket="next" now={now} sections={sections} handlers={handlers} />
          <QueueBucketSection campaign={campaign} bucket="stop" now={now} sections={sections} handlers={handlers} />

          {campaign.finished.length > 0 && (
            <div className="mx-3 mb-3 rounded-xl border border-emerald-200 overflow-hidden">
              <button
                onClick={() => toggle(`${campKey}|done`)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50/60 hover:bg-emerald-50"
              >
                {isOpen(`${campKey}|done`, false) ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-slate-800">Workflow finished</span>
                <span className="ml-auto text-xs text-slate-600 bg-white px-2 py-0.5 rounded-full">{campaign.finished.length}</span>
              </button>
              {isOpen(`${campKey}|done`, false) && (
                <div className="divide-y divide-slate-100 bg-white">
                  {campaign.finished.map(lead => (
                    <QueueLeadRow
                      key={lead.id} lead={lead} tp={undefined} bucket="finished" now={now}
                      onAction={handlers.onMarkComplete} onSkip={() => {}} onDetails={handlers.onDetails}
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
}
