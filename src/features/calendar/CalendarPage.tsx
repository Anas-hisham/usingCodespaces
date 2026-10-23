import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Meeting } from '@/domain/types';
import { CreateMeetingModal, type MeetingPrefill } from '@/features/calendar/components/CreateMeetingModal';
import { MeetingDetailModal } from '@/features/calendar/components/MeetingDetailModal';
import { MeetingsList } from '@/features/calendar/components/MeetingsList';
import { MEETING_STATUS_STYLE } from '@/features/calendar/meetingStatusStyles';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { createMeeting, updateMeeting, useStore } from '@/store';

export function CalendarPage() {
  const { state, dispatch } = useStore();
  const { ask, dialog: confirmDialog } = useConfirm();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  // set when the schedule form was opened FROM a meeting (reschedule / one more meeting with the same lead)
  const [prefill, setPrefill] = useState<MeetingPrefill | null>(null);

  const myMeetings = useMemo(() => {
    return state.meetings.filter(m => m.participantIds.includes(currentUser.id) || m.createdBy === currentUser.id);
  }, [state.meetings, currentUser]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();
  const todayStr = new Date().toISOString().split('T')[0];

  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) week.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    for (const m of myMeetings) {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    }
    return map;
  }, [myMeetings]);

  const dayMeetings = selectedDate ? meetingsByDate[selectedDate] || [] : [];
  const todayMeetings = (meetingsByDate[todayStr] || []).filter(m => m.status === 'arranged');   // done ones are not "today's to do"

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const isToday = (d: Date) => formatDate(d) === todayStr;

  const creatorName = (m: Meeting) => state.users.find(u => u.id === m.createdBy)?.name ?? 'Manager';
  const getDisplayParticipants = (m: Meeting): string => {
    if (m.type === 'lead_meeting' && m.companyName) return m.participantNames.join(', ');
    const isCreator = currentUser.id === m.createdBy;
    if (isCreator) return m.participantNames.join(', ');
    return [creatorName(m), ...m.participantNames].join(', ');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {todayMeetings.length > 0 && (
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 rounded-xl p-4 mb-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4" />
            <span className="font-semibold text-sm">Today's Meetings ({todayMeetings.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayMeetings.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMeeting(m)}
                className="bg-white/10 backdrop-blur rounded-lg p-3 text-left hover:bg-white/20 transition-all border border-white/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-violet-200" />
                  <span className="text-sm font-medium">{m.time}</span>
                  <span className="text-xs text-violet-200">({m.duration}min)</span>
                </div>
                <div className="text-sm font-semibold truncate">{m.title}</div>
                <div className="text-xs text-violet-200 truncate">
                  {m.type === 'lead_meeting' && m.companyName ? m.companyName : getDisplayParticipants(m)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{monthName}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="ml-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Meeting
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-100">
              {weekdayNames.map(d => (
                <div key={d} className="px-0.5 sm:px-2 py-2.5 text-center text-[11px] sm:text-xs font-semibold text-slate-600">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {weeks.flat().map((date, i) => {
                if (!date) return <div key={i} className="min-h-[56px] sm:min-h-[100px] border-r border-b border-slate-100 bg-slate-50/30" />;
                const dateStr = formatDate(date);
                const meetings = meetingsByDate[dateStr] || [];
                const selected = selectedDate === dateStr;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[56px] sm:min-h-[100px] border-r border-b border-slate-100 p-1 sm:p-1.5 text-left align-top transition-colors ${
                      selected ? 'bg-violet-50' : 'hover:bg-slate-50'
                    } ${isToday(date) ? 'ring-2 ring-violet-300 ring-inset' : ''}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      isToday(date) ? 'text-violet-700 font-bold' : 'text-slate-700'
                    }`}>
                      {date.getDate()}
                    </div>
                    {meetings.length > 0 && (
                      <span className="sm:hidden inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-violet-100 text-violet-700 text-[10px] font-semibold">{meetings.length}</span>
                    )}
                    <div className="hidden sm:block space-y-0.5">
                      {meetings.slice(0, 3).map(m => (
                        <div
                          key={m.id}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${MEETING_STATUS_STYLE[m.status].bg} ${MEETING_STATUS_STYLE[m.status].color}`}
                        >
                          {m.time} {m.type === 'lead_meeting' ? m.companyName : m.title}
                        </div>
                      ))}
                      {meetings.length > 3 && (
                        <div className="text-xs text-slate-500 px-1.5">+{meetings.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:sticky lg:top-0">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </h3>
            {dayMeetings.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No meetings on this day</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayMeetings.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMeeting(m)}
                    className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{m.time}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${MEETING_STATUS_STYLE[m.status].bg} ${MEETING_STATUS_STYLE[m.status].color}`}>
                        {MEETING_STATUS_STYLE[m.status].label}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">{m.title}</div>
                    <div className="text-xs text-slate-600">
                      {m.type === 'lead_meeting' && m.companyName ? `${m.companyName} • ` : ''}
                      {getDisplayParticipants(m)} • {m.duration}min
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <MeetingsList
        meetings={myMeetings}
        describe={m => `${m.type === 'lead_meeting' && m.companyName ? `${m.companyName} • ` : ''}${getDisplayParticipants(m)}`}
        onOpen={setSelectedMeeting}
      />

      {showCreateModal && (
        <CreateMeetingModal
          state={state}
          currentUser={currentUser}
          prefill={prefill ?? undefined}
          onClose={() => { setShowCreateModal(false); setPrefill(null); }}
          onCreate={(meeting) => {
            dispatch(createMeeting(meeting));
            // rescheduling: the old meeting is closed only now, once the new time is really saved
            if (prefill?.purpose === 'reschedule') dispatch(updateMeeting({ meetingId: prefill.source.id, updates: { status: 'rescheduled' } }));
            setShowCreateModal(false);
            setPrefill(null);
          }}
        />
      )}

      {confirmDialog}

      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          currentUser={currentUser}
          creatorName={creatorName(selectedMeeting)}
          onClose={() => setSelectedMeeting(null)}
          onReschedule={() => { setPrefill({ source: selectedMeeting, purpose: 'reschedule' }); setSelectedMeeting(null); setShowCreateModal(true); }}
          onScheduleAnother={() => { setPrefill({ source: selectedMeeting, purpose: 'follow_up' }); setSelectedMeeting(null); setShowCreateModal(true); }}
          onUpdate={(updates) => {
            const apply = () => { dispatch(updateMeeting({ meetingId: selectedMeeting.id, updates })); setSelectedMeeting(null); };
            if (updates.status === 'cancelled') {
              ask({ title: 'Cancel this meeting?', message: <><b>{selectedMeeting.title}</b> will be marked as cancelled.</>, confirmLabel: 'Cancel meeting', tone: 'danger' }, apply);
            } else apply();
          }}
        />
      )}
    </div>
  );
}
