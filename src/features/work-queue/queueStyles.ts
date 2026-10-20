/** Colours/labels for the work queue sections. */
import { Hourglass, PauseCircle, Sun } from 'lucide-react';
import type { QueueCategory } from '@/domain/workflow/callClassification';
import { LEAD_STATUS_STYLE } from '@/shared/ui/leadStatusStyles';

// The categories a lead can sit in inside a touch point step. Each one is its own section.
export const QUEUE_CATEGORY_ORDER: QueueCategory[] = ['new', 'discovery', 'lvm', 'nvm'];

export const QUEUE_CATEGORY_STYLE: Record<QueueCategory, { label: string; color: string; dot: string }> = {
  new: LEAD_STATUS_STYLE.new,
  discovery: LEAD_STATUS_STYLE.discovery,
  lvm: { ...LEAD_STATUS_STYLE.lvm, label: 'LVM' },
  nvm: { ...LEAD_STATUS_STYLE.nvm, label: 'NVM' },
};

export const DUE_TONE_CLASS = {
  overdue: 'text-rose-600 font-medium',
  today: 'text-amber-600 font-medium',
  later: 'text-slate-500',
  none: 'text-slate-500',
};

export const QUEUE_BUCKET_STYLE = {
  today: { label: 'Today', hint: 'due today or overdue', icon: Sun, wrap: 'border-blue-200', head: 'bg-blue-50 hover:bg-blue-100/70', text: 'text-blue-800', pill: 'bg-blue-600 text-white' },
  next: { label: 'Next', hint: 'tomorrow or later', icon: Hourglass, wrap: 'border-slate-200', head: 'bg-slate-50 hover:bg-slate-100', text: 'text-slate-700', pill: 'bg-slate-600 text-white' },
  stop: { label: 'Stop', hint: 'workflows you stopped', icon: PauseCircle, wrap: 'border-amber-200', head: 'bg-amber-50 hover:bg-amber-100/70', text: 'text-amber-800', pill: 'bg-amber-500 text-white' },
} as const;
