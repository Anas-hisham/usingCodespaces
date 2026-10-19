import { ChevronDown, ChevronRight } from 'lucide-react';
import { QUEUE_BUCKET_STYLE } from '@/features/work-queue/queueStyles';
import { StoppedLeadRow } from '@/features/work-queue/components/StoppedLeadRow';
import { TouchPointStepSection } from '@/features/work-queue/components/TouchPointStepSection';
import type { CampaignQueue } from '@/features/work-queue/buildWorkQueue';
import type { QueueHandlers } from '@/features/work-queue/queueHandlers';
import type { CollapsibleSections } from '@/features/work-queue/useCollapsibleSections';

interface QueueBucketSectionProps {
  campaign: CampaignQueue;
  bucket: 'today' | 'next' | 'stop';
  now: number;
  sections: CollapsibleSections;
  handlers: QueueHandlers;
}

/** The big Today / Next / Stop block of one campaign. */
export function QueueBucketSection({ campaign, bucket, now, sections, handlers }: QueueBucketSectionProps) {
  const { isOpen, toggle } = sections;
  const style = QUEUE_BUCKET_STYLE[bucket];
  const Icon = style.icon;
  const key = `${campaign.code}|${bucket}`;
  const open = isOpen(key, bucket === 'today');
  const count = bucket === 'today' ? campaign.todayCount : bucket === 'next' ? campaign.nextCount : campaign.stopped.length;
  return (
    <div className={`mx-3 my-3 rounded-xl border overflow-hidden ${style.wrap}`}>
      <button onClick={() => toggle(key)} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${style.head}`}>
        {open ? <ChevronDown className={`w-4 h-4 ${style.text}`} /> : <ChevronRight className={`w-4 h-4 ${style.text}`} />}
        <Icon className={`w-4 h-4 ${style.text}`} />
        <span className={`text-sm font-bold ${style.text}`}>{style.label}</span>
        <span className="text-xs text-slate-600 hidden sm:inline">{style.hint}</span>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${style.pill}`}>{count}</span>
      </button>

      {open && (
        <div className="bg-white border-t border-slate-100">
          {count === 0 && (
            <div className="px-5 py-5 text-sm text-slate-500">
              {bucket === 'today' ? 'Nothing due today in this campaign.' : bucket === 'next' ? 'Nothing coming up.' : 'No stopped workflows.'}
            </div>
          )}

          {bucket !== 'stop' && count > 0 && (bucket === 'today' ? campaign.today : campaign.next).map(step => (
            <TouchPointStepSection
              key={`${campaign.code}|${bucket}|${step.order}`}
              campaignCode={campaign.code} bucket={bucket} step={step} now={now} sections={sections} handlers={handlers}
            />
          ))}

          {bucket === 'stop' && campaign.stopped.length > 0 && (
            <div className="divide-y divide-slate-100">
              {campaign.stopped.map(lead => (
                <StoppedLeadRow key={lead.id} lead={lead} handlers={handlers} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
