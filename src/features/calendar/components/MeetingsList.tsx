import { AlertCircle, Clock } from 'lucide-react';
import { meetingStartMs } from '@/domain/meeting/meetingTime';
import type { Meeting } from '@/domain/types';
import { MEETING_STATUS_STYLE } from '@/features/calendar/meetingStatusStyles';
import { DoneSection } from '@/shared/components/DoneSection';
import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';

const MEETINGS_PER_PAGE = 5;

function MeetingRow({ meeting, subtitle, onOpen }: { meeting: Meeting; subtitle: string; onOpen: (m: Meeting) => void }) {
  const style = MEETING_STATUS_STYLE[meeting.status];
  // an "arranged" meeting whose time has passed still waits for its result (completed / no show / ...)
  const needsResult = meeting.status === 'arranged' && meetingStartMs(meeting) + meeting.duration * 60000 < Date.now();
  return (
    <button
      onClick={() => onOpen(meeting)}
      className="w-full text-left bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm px-4 py-3 transition-colors"
    >
      <div className="flex items-center gap-2 mb-0.5">
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="text-sm font-medium text-slate-900">{meeting.date} · {meeting.time}</span>
        <span className="text-xs text-slate-500">({meeting.duration}min)</span>
        {needsResult && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />Add result
          </span>
        )}
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.color}`}>{style.label}</span>
      </div>
      <div className="text-sm text-slate-800 truncate">{meeting.title}</div>
      <div className="text-xs text-slate-600 truncate">{subtitle}</div>
    </button>
  );
}

/**
 * All my meetings as a list. The meetings still waiting for a result (status "Arranged") are always on top;
 * the ones that already have a result (completed / no show / cancelled / rescheduled) sit in a closed section.
 */
export function MeetingsList({ meetings, describe, onOpen }: {
  meetings: Meeting[]; describe: (m: Meeting) => string; onOpen: (m: Meeting) => void;
}) {
  const pendingMeetings = meetings.filter(m => m.status === 'arranged').sort((a, b) => meetingStartMs(a) - meetingStartMs(b));   // soonest first
  const doneMeetings = meetings.filter(m => m.status !== 'arranged').sort((a, b) => meetingStartMs(b) - meetingStartMs(a));      // latest first
  const pending = usePagination(pendingMeetings, MEETINGS_PER_PAGE);
  const done = usePagination(doneMeetings, MEETINGS_PER_PAGE);

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">
        Meetings waiting for a result <span className="ml-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{pending.total}</span>
      </h3>
      {pending.total === 0 ? (
        <p className="text-sm text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 px-5 py-6 text-center">No pending meetings.</p>
      ) : (
        <div className="space-y-2">
          {pending.pageItems.map(m => <MeetingRow key={m.id} meeting={m} subtitle={describe(m)} onOpen={onOpen} />)}
        </div>
      )}
      <Pagination {...pending} onPage={pending.setPage} />

      <DoneSection title="Completed & closed meetings" count={done.total}>
        <div className="space-y-2">
          {done.pageItems.map(m => <MeetingRow key={m.id} meeting={m} subtitle={describe(m)} onOpen={onOpen} />)}
        </div>
        <Pagination {...done} onPage={done.setPage} />
      </DoneSection>
    </section>
  );
}
