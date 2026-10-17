import { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, X, Plus, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Ban, RefreshCw, Users as UsersIcon,
} from 'lucide-react';
import { useStore, addMeeting, updateMeeting, addNotification } from '@/store';
import type { AppState } from '@/store';
import { LeadPicker } from '@/components/LeadPicker';
import type { Meeting, MeetingStatus, User } from '@/types';

const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string; bg: string; icon?: typeof CheckCircle2 }> = {
  arranged: { label: 'Arranged', color: 'text-blue-700', bg: 'bg-blue-100' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  no_show: { label: 'No Show', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100', icon: Ban },
  rescheduled: { label: 'Rescheduled', color: 'text-amber-700', bg: 'bg-amber-100', icon: RefreshCw },
};

export function CalendarPage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

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
  const todayMeetings = meetingsByDate[todayStr] || [];

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const isToday = (d: Date) => formatDate(d) === todayStr;

  const getDisplayParticipants = (m: Meeting): string => {
    if (m.type === 'lead_meeting' && m.companyName) return m.participantNames.join(', ');
    const isCreator = currentUser.id === m.createdBy;
    if (isCreator) return m.participantNames.join(', ');
    return ['Manager', ...m.participantNames].join(', ');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {todayMeetings.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 mb-6 text-white">
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
                  <Clock className="w-3.5 h-3.5 text-blue-200" />
                  <span className="text-sm font-medium">{m.time}</span>
                  <span className="text-xs text-blue-200">({m.duration}min)</span>
                </div>
                <div className="text-sm font-semibold truncate">{m.title}</div>
                <div className="text-xs text-blue-200 truncate">
                  {m.type === 'lead_meeting' && m.companyName ? m.companyName : getDisplayParticipants(m)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{monthName}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-500" />
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
                  <ChevronRight className="w-4 h-4 text-slate-500" />
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
                <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {weeks.flat().map((date, i) => {
                if (!date) return <div key={i} className="min-h-[100px] border-r border-b border-slate-50 bg-slate-50/30" />;
                const dateStr = formatDate(date);
                const meetings = meetingsByDate[dateStr] || [];
                const selected = selectedDate === dateStr;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`min-h-[100px] border-r border-b border-slate-50 p-1.5 text-left align-top transition-colors ${
                      selected ? 'bg-blue-50' : 'hover:bg-slate-50/50'
                    } ${isToday(date) ? 'ring-2 ring-blue-300 ring-inset' : ''}`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      isToday(date) ? 'text-blue-600' : 'text-slate-700'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {meetings.slice(0, 3).map(m => (
                        <div
                          key={m.id}
                          className={`text-xs px-1.5 py-0.5 rounded truncate ${STATUS_CONFIG[m.status].bg} ${STATUS_CONFIG[m.status].color}`}
                        >
                          {m.time} {m.type === 'lead_meeting' ? m.companyName : m.title}
                        </div>
                      ))}
                      {meetings.length > 3 && (
                        <div className="text-xs text-slate-400 px-1.5">+{meetings.length - 3} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-80 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-0">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">
              {selectedDate
                ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </h3>
            {dayMeetings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
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
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[m.status].bg} ${STATUS_CONFIG[m.status].color}`}>
                        {STATUS_CONFIG[m.status].label}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">{m.title}</div>
                    <div className="text-xs text-slate-500">
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

      {showCreateModal && (
        <CreateMeetingModal
          state={state}
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onCreate={(meeting) => {
            dispatch(addMeeting(meeting));
            dispatch(addNotification({
              id: crypto.randomUUID(),
              type: 'meeting',
              title: 'Meeting scheduled',
              message: `${meeting.title} on ${meeting.date} at ${meeting.time}`,
              timestamp: new Date().toISOString(),
              read: false,
            }));
            setShowCreateModal(false);
          }}
        />
      )}

      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          currentUser={currentUser}
          onClose={() => setSelectedMeeting(null)}
          onUpdate={(updates) => {
            dispatch(updateMeeting({ meetingId: selectedMeeting.id, updates }));
            setSelectedMeeting(null);
          }}
        />
      )}
    </div>
  );
}

function CreateMeetingModal({
  state, currentUser, onClose, onCreate,
}: {
  state: AppState;
  currentUser: User;
  onClose: () => void;
  onCreate: (meeting: Meeting) => void;
}) {
  const isAgent = currentUser.role === 'agent';
  const isTL = currentUser.role === 'team_leader';
  const isOM = currentUser.role === 'operation_manager';

  const [leadId, setLeadId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');

  const myTeam = state.teams.find(t => t.id === currentUser.teamId);

  const availableLeads = useMemo(() => {
    if (isAgent) return state.leads.filter(l => l.agentId === currentUser.id && !l.removedFromQueue && !l.stopped && !l.expiredAt);
    if (isTL) return state.leads.filter(l => myTeam?.agentIds.includes(l.agentId) && !l.removedFromQueue && !l.stopped && !l.expiredAt);
    return [];
  }, [state.leads, currentUser, isAgent, isTL, myTeam]);

  const availableParticipants = useMemo(() => {
    if (isAgent) return [];
    if (isTL) return state.users.filter(u => myTeam?.agentIds.includes(u.id));
    if (isOM) {
      const myLeaderIds = state.teams.filter(t => t.managerId === currentUser.id).map(t => t.leaderId);
      return state.users.filter(u => u.role === 'team_leader' && myLeaderIds.includes(u.id));
    }
    return [];
  }, [state.users, currentUser, isTL, isOM, myTeam]);

  const selectedLead = state.leads.find(l => l.id === leadId);

  const handleCreate = () => {
    if (isAgent && selectedLead) {
      onCreate({
        id: crypto.randomUUID(),
        type: 'lead_meeting',
        leadId: selectedLead.id,
        leadName: selectedLead.contactName,
        companyName: selectedLead.companyName,
        agentId: currentUser.id,
        participantIds: [currentUser.id],
        participantNames: [currentUser.name],
        title: `Meeting with ${selectedLead.companyName}`,
        date, time, duration, notes,
        status: 'arranged',
        priority: 'high',
        createdBy: currentUser.id,
      });
    } else if ((isTL || isOM) && participantIds.length > 0) {
      const participants = state.users.filter(u => participantIds.includes(u.id));
      const firstLead = selectedLead;
      onCreate({
        id: crypto.randomUUID(),
        type: firstLead ? 'lead_meeting' : 'internal_meeting',
        ...(firstLead ? {
          leadId: firstLead.id,
          leadName: firstLead.contactName,
          companyName: firstLead.companyName,
        } : {}),
        participantIds,
        participantNames: participants.map(p => p.name),
        title: title || (firstLead ? `Meeting with ${firstLead.companyName}` : `Meeting with ${participants.map(p => p.name).join(', ')}`),
        date, time, duration, notes,
        status: 'arranged',
        priority: 'high',
        createdBy: currentUser.id,
      });
    }
  };

  const allSelected = availableParticipants.length > 0 && availableParticipants.every(p => participantIds.includes(p.id));
  const toggleAll = () => setParticipantIds(allSelected ? [] : availableParticipants.map(p => p.id));

  const canCreate = isAgent ? !!leadId : participantIds.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Schedule Meeting</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {isAgent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lead</label>
              <LeadPicker leads={availableLeads} value={leadId} onChange={setLeadId} placeholder="Search a lead, then select it..." />
            </div>
          )}

          {(isTL || isOM) && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Meeting title..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isTL && availableLeads.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Link to Lead (optional)</label>
                  <LeadPicker leads={availableLeads} value={leadId} onChange={setLeadId} placeholder="Search a lead, then select it..." />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    <UsersIcon className="w-3.5 h-3.5 inline mr-1" />
                    {isOM ? 'Select Team Leaders' : 'Select Agents'}
                    <span className="text-xs text-slate-400 font-normal ml-1">({participantIds.length}/{availableParticipants.length})</span>
                  </label>
                  {availableParticipants.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      {allSelected ? 'Clear all' : isOM ? 'Select all team leaders' : 'Select all agents'}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin border border-slate-200 rounded-xl p-2">
                  {availableParticipants.map(p => (
                    <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participantIds.includes(p.id)}
                        onChange={e => {
                          if (e.target.checked) setParticipantIds([...participantIds, p.id]);
                          else setParticipantIds(participantIds.filter(id => id !== p.id));
                        }}
                        className="rounded"
                      />
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: p.color }}>
                        {p.initials}
                      </div>
                      <span className="text-sm text-slate-700">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (minutes)</label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    duration === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d}min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Meeting agenda or notes..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all"
          >
            Schedule Meeting
          </button>
        </div>
      </div>
    </div>
  );
}

function MeetingDetailModal({
  meeting, currentUser, onClose, onUpdate,
}: {
  meeting: Meeting;
  currentUser: User;
  onClose: () => void;
  onUpdate: (updates: Partial<Meeting>) => void;
}) {
  const config = STATUS_CONFIG[meeting.status];
  // Only the person who created the meeting can update its status; everyone else just views it.
  const canUpdate = meeting.createdBy === currentUser.id;

  const getDisplayParticipants = (m: Meeting): string => {
    if (m.type === 'lead_meeting' && m.companyName) return m.participantNames.join(', ');
    const isCreator = currentUser.id === m.createdBy;
    if (isCreator) return m.participantNames.join(', ');
    return ['Manager', ...m.participantNames].join(', ');
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{meeting.title}</h2>
            <p className="text-sm text-slate-500">
              {meeting.type === 'lead_meeting' && meeting.companyName ? `${meeting.companyName} • ` : ''}
              {getDisplayParticipants(meeting)}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-400 mb-1">Date</div>
              <div className="text-sm text-slate-900">{new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Time</div>
              <div className="text-sm text-slate-900">{meeting.time} ({meeting.duration}min)</div>
            </div>
          </div>

          {meeting.notes && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Notes</div>
              <div className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">{meeting.notes}</div>
            </div>
          )}

          <div>
            <div className="text-xs text-slate-400 mb-1">Participants</div>
            <div className="text-sm text-slate-700">{getDisplayParticipants(meeting)}</div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-2">Status</div>
            <span className={`text-sm px-3 py-1 rounded-full ${config.bg} ${config.color} font-medium`}>{config.label}</span>
          </div>

          {!canUpdate && (
            <div className="border-t border-slate-100 pt-4 text-xs text-slate-500">
              Only the person who created this meeting can update its status.
            </div>
          )}

          {canUpdate && (
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs text-slate-400 mb-2">Update Status</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { status: 'completed' as MeetingStatus, label: 'Completed', icon: CheckCircle2, color: 'bg-green-600' },
                { status: 'no_show' as MeetingStatus, label: 'No Show', icon: XCircle, color: 'bg-red-600' },
                { status: 'cancelled' as MeetingStatus, label: 'Cancel', icon: Ban, color: 'bg-slate-600' },
                { status: 'rescheduled' as MeetingStatus, label: 'Reschedule', icon: RefreshCw, color: 'bg-amber-600' },
              ]).map(btn => (
                <button
                  key={btn.status}
                  onClick={() => onUpdate({ status: btn.status })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white ${btn.color} hover:opacity-90 transition-all`}
                >
                  <btn.icon className="w-3.5 h-3.5" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
