import { Calendar } from 'lucide-react';
import type { Meeting, User } from '@/domain/types';

export function TodayMeetingsCard({ meetings, users, title = "Today's Meetings" }: { meetings: Meeting[]; users: User[]; title?: string }) {
  const sorted = [...meetings].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div className="bg-violet-50/50 rounded-xl border border-violet-100 p-5">
      <h3 className="text-sm font-semibold text-violet-900 mb-3 flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />
        {title} ({sorted.length})
      </h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">No meetings today.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(m => {
            const agent = users.find(u => u.id === m.agentId);
            const who = m.type === 'lead_meeting'
              ? [m.companyName, agent?.name].filter(Boolean).join(' • ')
              : m.participantNames.join(', ');
            return (
              <div key={m.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-violet-100">
                <div className="w-14 text-center shrink-0">
                  <div className="text-sm font-bold text-violet-700">{m.time}</div>
                  <div className="text-[11px] text-slate-500">{m.duration}min</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{m.title}</div>
                  {who && <div className="text-xs text-slate-600 truncate">{who}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
