/** Label + colours of each meeting status. */
import { Ban, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import type { MeetingStatus } from '@/domain/types';

export const MEETING_STATUS_STYLE: Record<MeetingStatus, { label: string; color: string; bg: string; icon?: typeof CheckCircle2 }> = {
  arranged: { label: 'Arranged', color: 'text-violet-700', bg: 'bg-violet-100' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
  no_show: { label: 'No Show', color: 'text-rose-700', bg: 'bg-rose-100', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100', icon: Ban },
  rescheduled: { label: 'Rescheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: RefreshCw },
};
