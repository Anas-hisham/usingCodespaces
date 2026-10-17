import { useState } from 'react';
import {
  Bell, Check, CheckCircle2, X, Send, AlertCircle,
  UserCheck, Clock, Users as UsersIcon,
} from 'lucide-react';
import { useStore, ackUpdate, addUpdate, addNotification } from '@/store';
import type { AppState } from '@/store';
import type { TeamUpdate, UpdateAudience } from '@/types';

export function TeamUpdates() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = currentUser.role === 'team_leader' || currentUser.role === 'operation_manager';
  const myTeam = state.teams.find(t => t.id === currentUser.teamId);

  const relevantUpdates = state.updates.filter(u => {
    if (currentUser.role === 'agent') {
      return u.audience === 'all' || (u.audience === 'specific_team' && u.teamId === currentUser.teamId);
    }
    if (currentUser.role === 'team_leader') {
      return u.audience === 'all' || u.audience === 'team_leaders' || (u.audience === 'specific_team' && u.teamId === currentUser.teamId);
    }
    return true;
  });

  const getUpdateRecipients = (update: TeamUpdate) => {
    if (update.audience === 'all') return state.users.filter(u => u.role !== 'operation_manager');
    if (update.audience === 'team_leaders') return state.users.filter(u => u.role === 'team_leader');
    if (update.audience === 'specific_team') {
      const team = state.teams.find(t => t.id === update.teamId);
      return state.users.filter(u => team?.agentIds.includes(u.id));
    }
    return [];
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Team Updates</h2>
          <p className="text-sm text-slate-500">
            {currentUser.role === 'agent' ? 'Updates from your team leader and management' :
             currentUser.role === 'operation_manager' ? 'Send updates to team leaders or everyone' :
             'Send updates to your team agents'}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            New Update
          </button>
        )}
      </div>

      <div className="space-y-4">
        {relevantUpdates.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No updates yet</p>
          </div>
        )}

        {relevantUpdates.map(update => {
          const author = state.users.find(u => u.id === update.authorId);
          const acknowledged = update.acknowledgedBy.includes(currentUser.id);
          const recipients = getUpdateRecipients(update);
          const ackRecipients = recipients.filter(r => update.acknowledgedBy.includes(r.id));
          const pendingRecipients = recipients.filter(r => !update.acknowledgedBy.includes(r.id));
          const canAck = recipients.some(r => r.id === currentUser.id);

          const audienceLabel = update.audience === 'all' ? 'Everyone' :
            update.audience === 'team_leaders' ? 'All Team Leaders' :
            state.teams.find(t => t.id === update.teamId)?.name || 'Team';

          return (
            <div key={update.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: author?.color || '#64748b' }}
                  >
                    {author?.initials || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">{update.authorName}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(update.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-0.5">{update.title}</h3>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      To: {audienceLabel}
                    </span>
                  </div>
                  {!acknowledged && canAck && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-ring shrink-0 mt-2" />
                  )}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-4">{update.content}</p>

                {currentUser.role !== 'agent' && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-medium text-slate-500">Acknowledgments</span>
                    <span className="text-xs text-slate-400">
                      {ackRecipients.length}/{recipients.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ackRecipients.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-700 font-medium">{r.name}</span>
                      </div>
                    ))}
                    {pendingRecipients.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{r.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {canAck && (
                    <button
                      onClick={() => dispatch(ackUpdate({ updateId: update.id, userId: currentUser.id }))}
                      disabled={acknowledged}
                      className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        acknowledged
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {acknowledged ? 'Acknowledged' : 'Acknowledge'}
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <CreateUpdateModal
          currentUser={currentUser}
          state={state}
          onClose={() => setShowCreate(false)}
          onCreate={(update) => {
            dispatch(addUpdate(update));
            dispatch(addNotification({
              id: crypto.randomUUID(),
              type: 'update',
              title: 'New update',
              message: `${currentUser.name} posted: ${update.title}`,
              timestamp: new Date().toISOString(),
              read: false,
            }));
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateUpdateModal({
  currentUser, state, onClose, onCreate,
}: {
  currentUser: import('@/types').User;
  state: AppState;
  onClose: () => void;
  onCreate: (update: TeamUpdate) => void;
}) {
  const isOM = currentUser.role === 'operation_manager';
  const myTeam = state.teams.find(t => t.id === currentUser.teamId);

  const [audience, setAudience] = useState<UpdateAudience>(isOM ? 'all' : 'specific_team');
  const [selectedTeamId, setSelectedTeamId] = useState(myTeam?.id || state.teams[0]?.id || '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const audienceOptions: { value: UpdateAudience; label: string; show: boolean }[] = [
    { value: 'all', label: 'Everyone (all TLs + all agents)', show: isOM },
    { value: 'team_leaders', label: 'All Team Leaders only', show: isOM },
    { value: 'specific_team', label: isOM ? 'Specific Team' : 'My Team Agents', show: true },
  ];

  const availableTeams = isOM ? state.teams : state.teams.filter(t => t.id === currentUser.teamId);

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    const update: TeamUpdate = {
      id: crypto.randomUUID(),
      audience,
      teamId: audience === 'specific_team' ? selectedTeamId : null,
      authorId: currentUser.id,
      authorName: currentUser.name,
      title,
      content,
      createdAt: new Date().toISOString(),
      acknowledgedBy: [],
    };
    onCreate(update);
    setTitle(''); setContent('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">New Update</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Audience</label>
            <div className="space-y-2">
              {audienceOptions.filter(o => o.show).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAudience(opt.value)}
                  className={`w-full flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                    audience === opt.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <UsersIcon className={`w-4 h-4 ${audience === opt.value ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {audience === 'specific_team' && availableTeams.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Team</label>
              <select
                value={selectedTeamId}
                onChange={e => setSelectedTeamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {availableTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Update title..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write your update..."
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertCircle className="w-3.5 h-3.5" />
            {audience === 'all' ? 'All team leaders and agents will see this' :
             audience === 'team_leaders' ? 'Only team leaders will see this' :
             'Agents in the selected team will see this'}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || !content.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all"
          >
            Send Update
          </button>
        </div>
      </div>
    </div>
  );
}
