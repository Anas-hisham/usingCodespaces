import { useState } from 'react';
import { Ban, CalendarPlus, CheckCircle2, RefreshCw, X, XCircle } from 'lucide-react';
import type { Meeting, MeetingStatus, User } from '@/domain/types';
import { MEETING_STATUS_STYLE } from '@/features/calendar/meetingStatusStyles';

export function MeetingDetailModal({
  meeting, currentUser, creatorName = 'Manager', onClose, onUpdate, onReschedule, onScheduleAnother,
}: {
  meeting: Meeting;
  currentUser: User;
  creatorName?: string;              // who scheduled it (shown to the invited people)
  onClose: () => void;
  onUpdate: (updates: Partial<Meeting>) => void;
  onReschedule: () => void;          // opens the schedule form with this meeting's data, to pick another time
  onScheduleAnother: () => void;     // opens the schedule form with this meeting's data, for one more meeting
}) {
  const isLeadMeeting = meeting.type === 'lead_meeting' && !!meeting.leadId;
  const [writingOutcome, setWritingOutcome] = useState(false);
  const [outcome, setOutcome] = useState(meeting.outcome ?? '');

  const config = MEETING_STATUS_STYLE[meeting.status];
  // Only the person who created the meeting can update its status; everyone else just views it.
  const canUpdate = meeting.createdBy === currentUser.id;

  const getDisplayParticipants = (m: Meeting): string => {
    if (m.type === 'lead_meeting' && m.companyName) return m.participantNames.join(', ');
    const isCreator = currentUser.id === m.createdBy;
    if (isCreator) return m.participantNames.join(', ');
    return [creatorName, ...m.participantNames].join(', ');
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up max-h-[92dvh] overflow-y-auto scrollbar-thin">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{meeting.title}</h2>
            <p className="text-sm text-slate-600">
              {meeting.type === 'lead_meeting' && meeting.companyName ? `${meeting.companyName} • ` : ''}
              {getDisplayParticipants(meeting)}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">Date</div>
              <div className="text-sm text-slate-900">{new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Time</div>
              <div className="text-sm text-slate-900">{meeting.time} ({meeting.duration}min)</div>
            </div>
          </div>

          {meeting.notes && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Notes</div>
              <div className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">{meeting.notes}</div>
            </div>
          )}

          {meeting.outcome && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Meeting outcome</div>
              <div className="text-sm text-slate-700 p-3 bg-emerald-50 border border-emerald-100 rounded-lg whitespace-pre-wrap">{meeting.outcome}</div>
            </div>
          )}

          <div>
            <div className="text-xs text-slate-500 mb-1">Participants</div>
            <div className="text-sm text-slate-700">{getDisplayParticipants(meeting)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-2">Status</div>
            <span className={`text-sm px-3 py-1 rounded-full ${config.bg} ${config.color} font-medium`}>{config.label}</span>
          </div>

          {!canUpdate && (
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-600">
              Only the person who created this meeting can update its status.
            </div>
          )}

          {canUpdate && writingOutcome && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">What happened in the meeting?</label>
                <textarea
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  placeholder="Describe the meeting: what was discussed, what the lead decided, next steps..."
                  rows={4}
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">Required — it is saved on the meeting and in the lead's history.</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => setWritingOutcome(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Back</button>
                <button
                  onClick={() => { onUpdate({ status: 'completed', outcome: outcome.trim() }); onScheduleAnother(); }}
                  disabled={!outcome.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40"
                >
                  Save & schedule next meeting
                </button>
                <button
                  onClick={() => onUpdate({ status: 'completed', outcome: outcome.trim() })}
                  disabled={!outcome.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
                >
                  Save outcome
                </button>
              </div>
            </div>
          )}

          {canUpdate && !writingOutcome && (
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs text-slate-500 mb-2">Update Status</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { status: 'completed' as MeetingStatus, label: 'Completed', icon: CheckCircle2, color: 'bg-emerald-600' },
                { status: 'no_show' as MeetingStatus, label: 'No Show', icon: XCircle, color: 'bg-rose-600' },
                { status: 'cancelled' as MeetingStatus, label: 'Cancel', icon: Ban, color: 'bg-slate-600' },
                { status: 'rescheduled' as MeetingStatus, label: 'Reschedule', icon: RefreshCw, color: 'bg-amber-600' },
              ]).map(btn => (
                <button
                  key={btn.status}
                  onClick={() => {
                    if (btn.status === 'completed' && isLeadMeeting) setWritingOutcome(true);   // a lead meeting needs its description first
                    else if (btn.status === 'rescheduled') onReschedule();                       // pick the new time before anything changes
                    else onUpdate({ status: btn.status });
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white ${btn.color} hover:opacity-90 transition-all`}
                >
                  <btn.icon className="w-3.5 h-3.5" />
                  {btn.label}
                </button>
              ))}
            </div>
            {isLeadMeeting && (
              <button
                onClick={onScheduleAnother}
                className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Schedule another meeting with this lead
              </button>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
