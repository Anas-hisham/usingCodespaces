import { Calendar } from 'lucide-react';
import type { Meeting } from '@/domain/types';

interface TodayMeetingsBannerProps {
  meetings: Meeting[];
  onOpenMeeting: (meeting: Meeting) => void;
}

/** The meetings the agent has arranged for today (shown only when there is at least one). */
export function TodayMeetingsBanner({ meetings, onOpenMeeting }: TodayMeetingsBannerProps) {
  return (
    <>
      {meetings.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-violet-600" />
            <span className="font-semibold text-sm text-violet-900">Arranged Meetings — Today</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {meetings.map(m => (
              <button
                key={m.id}
                onClick={() => onOpenMeeting(m)}
                className="flex items-center gap-3 bg-white rounded-lg p-3 border border-violet-100 hover:border-violet-300 transition-all text-left"
              >
                <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 truncate">{m.companyName}</div>
                  <div className="text-xs text-slate-600">{m.leadName} — {m.time}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
