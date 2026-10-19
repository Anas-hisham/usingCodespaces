import { Bell, Check, CheckCircle2, Clock, Send, UserCheck } from 'lucide-react';
import { useState } from 'react';
import type { TeamUpdate } from '@/domain/types';
import { CreateUpdateModal } from '@/features/team-updates/components/CreateUpdateModal';
import { acknowledgeTeamUpdate, addNotification, postTeamUpdate, useStore } from '@/store';

export function TeamUpdatesPage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = currentUser.role === 'team_leader' || currentUser.role === 'operation_manager';

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
    if (update.audience === 'all') return state.users.filter(u => u.role !== 'operation_manager' && u.role !== 'admin');
    if (update.audience === 'team_leaders') return state.users.filter(u => u.role === 'team_leader');
    if (update.audience === 'specific_team') {
      const team = state.teams.find(t => t.id === update.teamId);
      return state.users.filter(u => team?.agentIds.includes(u.id));
    }
    return [];
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Team Updates</h2>
          <p className="text-sm text-slate-600">
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
          <div className="text-center py-12 text-slate-500">
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
            <div key={update.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                      <span className="text-xs text-slate-500">
                        {new Date(update.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mt-0.5">{update.title}</h3>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                      To: {audienceLabel}
                    </span>
                  </div>
                  {!acknowledged && canAck && (
                    <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse-ring shrink-0 mt-2" />
                  )}
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-4">{update.content}</p>

                {currentUser.role !== 'agent' && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">Acknowledgments</span>
                    <span className="text-xs text-slate-500">
                      {ackRecipients.length}/{recipients.length}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {ackRecipients.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="text-xs text-emerald-700 font-medium">{r.name}</span>
                      </div>
                    ))}
                    {pendingRecipients.map(r => (
                      <div key={r.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-xs text-slate-600">{r.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {canAck && (
                    <button
                      onClick={() => dispatch(acknowledgeTeamUpdate({ updateId: update.id, userId: currentUser.id }))}
                      disabled={acknowledged}
                      className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        acknowledged
                          ? 'bg-emerald-100 text-emerald-700 cursor-default'
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
            dispatch(postTeamUpdate(update));
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
