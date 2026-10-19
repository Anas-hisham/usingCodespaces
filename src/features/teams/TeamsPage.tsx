import { ArrowRightLeft, Crown, Shield } from 'lucide-react';
import { useState } from 'react';
import type { Team, User } from '@/domain/types';
import { MoveAgentModal } from '@/features/teams/components/MoveAgentModal';
import { UserAvatar } from '@/shared/components/UserAvatar';
import { moveAgentToTeam, useStore } from '@/store';

/** Everybody sees who is in which team: Operation Manager on top, then each Team Leader with their agents. */
export function TeamsPage() {
  const { state, dispatch } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId)!;
  const [moving, setMoving] = useState<User | null>(null);

  const userOf = (id: string) => state.users.find(u => u.id === id);
  const managers = state.users.filter(u => u.role === 'operation_manager');
  const teamOf = (agentId: string) => state.teams.find(t => t.agentIds.includes(agentId));
  const unassigned = state.users.filter(u => u.role === 'agent' && !teamOf(u.id));
  const canMove = (agent: User) => {
    if (me.role !== 'operation_manager') return false;
    const t = teamOf(agent.id);
    return !t || t.managerId === me.id;
  };
  const myTeams = state.teams.filter(t => t.managerId === me.id);

  const person = (u: User, extra?: React.ReactNode) => (
    <div className="flex items-center gap-3 min-w-0">
      <UserAvatar user={u} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{u.name}{u.id === me.id && <span className="ml-1.5 text-xs font-normal text-blue-600">(you)</span>}</div>
        <div className="text-xs text-slate-600 truncate">@{u.username}</div>
      </div>
      {extra}
    </div>
  );

  const agentRow = (agent: User) => (
    <li key={agent.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
      {person(agent)}
      {canMove(agent) && (
        <button
          onClick={() => setMoving(agent)}
          className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />Move
        </button>
      )}
    </li>
  );

  const teamCard = (team: Team) => {
    const leader = userOf(team.leaderId);
    const agents = team.agentIds.map(userOf).filter((u): u is User => !!u);
    return (
      <div key={team.id} className="flex flex-col items-stretch">
        <div className="mx-auto w-px h-5 bg-slate-300" />
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">{team.name}</h3>
            <span className="text-xs text-slate-600">{agents.length} agent{agents.length === 1 ? '' : 's'}</span>
          </div>
          {leader && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
              {person(leader)}
              <span className="shrink-0 text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" />Team Leader</span>
            </div>
          )}
          <ul className="divide-y divide-slate-100">
            {agents.map(agentRow)}
            {agents.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">No agents in this team</li>}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Teams</h2>
        <p className="text-sm text-slate-600">
          {state.teams.length} teams · {state.users.filter(u => u.role === 'agent').length} agents
          {me.role === 'operation_manager' && ' · use Move to put an agent in another team'}
        </p>
      </div>

      {managers.map(m => {
        const teams = state.teams.filter(t => t.managerId === m.id);
        return (
          <section key={m.id}>
            <div className="mx-auto max-w-xs bg-white rounded-xl border-2 border-blue-200 shadow-sm px-4 py-3 flex items-center justify-between gap-2">
              {person(m)}
              <span className="shrink-0 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" />Manager</span>
            </div>
            {teams.length > 0 && (
              <>
                <div className="mx-auto w-px h-5 bg-slate-300" />
                <div className="border-t border-slate-300 mx-6 sm:mx-16" />
                <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3 -mt-px">{teams.map(teamCard)}</div>
              </>
            )}
          </section>
        );
      })}

      {unassigned.length > 0 && (
        <section className="bg-white rounded-xl border border-dashed border-slate-300 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-sm font-bold text-slate-900">Agents without a team</div>
          <ul className="divide-y divide-slate-100">{unassigned.map(agentRow)}</ul>
        </section>
      )}

      {moving && (
        <MoveAgentModal
          agent={moving} fromTeam={teamOf(moving.id)} teams={myTeams} users={state.users}
          onClose={() => setMoving(null)}
          onMove={toTeamId => { dispatch(moveAgentToTeam({ agentId: moving.id, toTeamId })); setMoving(null); }}
        />
      )}
    </div>
  );
}
