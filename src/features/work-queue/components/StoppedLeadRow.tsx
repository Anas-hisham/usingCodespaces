import { Building2, Play, Trash2 } from 'lucide-react';
import type { Lead } from '@/domain/types';
import { findCurrentTouchPoint, stepLabel } from '@/domain/workflow/touchPoints';
import type { QueueHandlers } from '@/features/work-queue/queueHandlers';

interface StoppedLeadRowProps {
  lead: Lead;
  handlers: QueueHandlers;
}

/** A lead whose workflow the agent stopped: resume it, delete it, or open its details. */
export function StoppedLeadRow({ lead, handlers }: StoppedLeadRowProps) {
  const tp = findCurrentTouchPoint(lead);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{lead.leadCode}</span>
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-900 truncate">{lead.companyName}</span>
        </div>
        <div className="text-xs text-slate-600">
          {tp ? `Stopped at ${stepLabel(tp.order, tp.type)} · ${tp.label}` : 'Stopped after finishing all touch points'}
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-1.5 sm:shrink-0">
        <button
          onClick={() => handlers.onResume(lead.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
        >
          <Play className="w-3 h-3" /> Resume
        </button>
        <button
          onClick={() => handlers.onRequestDelete(lead.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
        <button
          onClick={() => handlers.onDetails(lead)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Details
        </button>
      </div>
    </div>
  );
}
