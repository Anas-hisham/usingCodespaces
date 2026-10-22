import { Users as UsersIcon, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Meeting, User } from '@/domain/types';
import { LeadPicker } from '@/shared/components/LeadPicker';
import type { AppState } from '@/store/state/AppState';

/** Starting point of the form: copy the lead / people / title / length / agenda of an existing meeting. */
export interface MeetingPrefill {
  source: Meeting;
  purpose: 'reschedule' | 'follow_up';
}

export function CreateMeetingModal({
  state, currentUser, onClose, onCreate, prefill,
}: {
  state: AppState;
  currentUser: User;
  onClose: () => void;
  onCreate: (meeting: Meeting) => void;
  prefill?: MeetingPrefill;
}) {
  const isAgent = currentUser.role === 'agent';
  const isTL = currentUser.role === 'team_leader';
  const isOM = currentUser.role === 'operation_manager';
  const isQuality = currentUser.role === 'quality';   // Quality schedules meetings with agents exactly like a team leader does

  const from = prefill?.source;
  const [leadId, setLeadId] = useState(from?.leadId ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>(isAgent ? [] : from?.participantIds ?? []);
  const [title, setTitle] = useState(from?.title ?? '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState(from?.duration ?? 30);
  const [notes, setNotes] = useState(from?.notes ?? '');

  const myTeam = state.teams.find(t => t.id === currentUser.teamId);

  const availableLeads = useMemo(() => {
    if (isAgent) return state.leads.filter(l => l.agentId === currentUser.id && !l.removedFromQueue && !l.stopped && !l.expiredAt);
    if (isTL) return state.leads.filter(l => myTeam?.agentIds.includes(l.agentId) && !l.removedFromQueue && !l.stopped && !l.expiredAt);
    if (isQuality) return state.leads.filter(l => !!l.agentId && !l.removedFromQueue && !l.stopped && !l.expiredAt);
    return [];
  }, [state.leads, currentUser, isAgent, isTL, isQuality, myTeam]);

  const availableParticipants = useMemo(() => {
    if (isAgent) return [];
    if (isTL) return state.users.filter(u => myTeam?.agentIds.includes(u.id));
    if (isQuality) return state.users.filter(u => u.role === 'agent');
    if (isOM) {
      const myLeaderIds = state.teams.filter(t => t.managerId === currentUser.id).map(t => t.leaderId);
      return state.users.filter(u => u.role === 'quality' || (u.role === 'team_leader' && myLeaderIds.includes(u.id)));   // my team leaders + Quality
    }
    return [];
  }, [state.users, state.teams, currentUser, isTL, isOM, isQuality, myTeam]);
  const teamNameOf = (userId: string) => state.teams.find(t => t.agentIds.includes(userId) || t.leaderId === userId)?.name;

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
    } else if ((isTL || isOM || isQuality) && participantIds.length > 0) {
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up max-h-modal overflow-y-auto scrollbar-thin">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{prefill?.purpose === 'reschedule' ? 'Reschedule Meeting' : prefill ? 'Schedule Another Meeting' : 'Schedule Meeting'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4">
          {isAgent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Lead</label>
              <LeadPicker leads={availableLeads} value={leadId} onChange={setLeadId} placeholder="Search a lead, then select it..." />
            </div>
          )}

          {(isTL || isOM || isQuality) && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Meeting title..."
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    <UsersIcon className="w-3.5 h-3.5 inline mr-1" />
                    {isOM ? 'Select Team Leaders / Quality' : 'Select Agents'}
                    <span className="text-xs text-slate-500 font-normal ml-1">({participantIds.length}/{availableParticipants.length})</span>
                  </label>
                  {availableParticipants.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      {allSelected ? 'Clear all' : isOM ? 'Select all' : 'Select all agents'}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin border border-slate-200 rounded-xl p-2">
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
                      {(isQuality || isOM) && <span className="ml-auto text-[11px] text-slate-500">{p.role === 'quality' ? 'Quality' : teamNameOf(p.id)}</span>}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
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
