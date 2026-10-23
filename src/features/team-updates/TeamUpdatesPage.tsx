import { Bell, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TeamUpdate } from '@/domain/types';
import { canSeeUpdate, updateRecipients } from '@/domain/updates/updateRecipients';
import { CreateUpdateModal } from '@/features/team-updates/components/CreateUpdateModal';
import { UpdateCard } from '@/features/team-updates/components/UpdateCard';
import { DoneSection } from '@/shared/components/DoneSection';
import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/usePagination';
import { acknowledgeTeamUpdate, markUpdatesSeen, postTeamUpdate, useStore } from '@/store';

const UPDATES_PER_PAGE = 5;

export function TeamUpdatesPage() {
  const { state, dispatch } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId)!;
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = me.role === 'team_leader' || me.role === 'operation_manager';

  // Opening this page is what clears the number in the menu (the bell notifications stay until "Mark read")
  const hasUnseen = state.updates.some(u => !u.seenBy.includes(me.id));
  useEffect(() => { if (hasUnseen) dispatch(markUpdatesSeen(me.id)); }, [hasUnseen, me.id, dispatch]);

  const recipientsOf = (u: TeamUpdate) => updateRecipients(u, state.users, state.teams);
  const visible = state.updates.filter(u => canSeeUpdate(u, me, state.users, state.teams));

  // "Handled": a recipient pressed Acknowledge; for the author / the OM it means everybody acknowledged.
  const isHandled = (u: TeamUpdate) => {
    const recipients = recipientsOf(u);
    if (recipients.some(r => r.id === me.id)) return u.acknowledgedBy.includes(me.id);
    return recipients.every(r => u.acknowledgedBy.includes(r.id));
  };
  const open = usePagination(visible.filter(u => !isHandled(u)), UPDATES_PER_PAGE);
  const handled = usePagination(visible.filter(isHandled), UPDATES_PER_PAGE);

  const audienceLabel = (u: TeamUpdate) =>
    u.audience === 'all' ? 'Everyone' : u.audience === 'team_leaders' ? 'All Team Leaders' : u.audience === 'quality' ? 'Quality'
      : state.teams.find(t => t.id === u.teamId)?.name || 'Team';

  const renderUpdate = (u: TeamUpdate) => (
    <UpdateCard
      key={u.id} update={u} me={me} author={state.users.find(x => x.id === u.authorId)}
      audienceLabel={audienceLabel(u)} recipients={recipientsOf(u)}
      onAcknowledge={() => dispatch(acknowledgeTeamUpdate({ updateId: u.id, userId: me.id }))}
    />
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Team Updates</h2>
          <p className="text-sm text-slate-600">
            {me.role === 'operation_manager' ? 'Send updates to team leaders, Quality or everyone'
              : me.role === 'team_leader' ? 'Updates from management, and updates for your team agents'
              : me.role === 'quality' ? 'Updates from management'
              : 'Updates from your team leader and management'}
          </p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />New Update
          </button>
        )}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No updates yet</p>
        </div>
      )}

      {visible.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">
            Needs attention <span className="ml-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{open.total}</span>
          </h3>
          {open.total === 0 ? (
            <p className="text-sm text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 px-5 py-6 text-center">You are all caught up. 🎉</p>
          ) : (
            <div className="space-y-4">{open.pageItems.map(renderUpdate)}</div>
          )}
          <Pagination {...open} onPage={open.setPage} />
        </section>
      )}

      {/* Already acknowledged: closed until the person opens it, so the old ones never pile up under the new ones */}
      <DoneSection title="Acknowledged" count={handled.total}>
        <div className="space-y-4">{handled.pageItems.map(renderUpdate)}</div>
        <Pagination {...handled} onPage={handled.setPage} />
      </DoneSection>

      {showCreate && (
        <CreateUpdateModal
          currentUser={me} state={state}
          onClose={() => setShowCreate(false)}
          onCreate={update => { dispatch(postTeamUpdate(update)); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
