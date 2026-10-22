import { ArrowRightLeft, BadgeCheck, Crown, Shield } from 'lucide-react';
import { useState } from 'react';
import type { Team, User } from '@/domain/types';
import { MoveAgentModal } from '@/features/teams/components/MoveAgentModal';
import { Collapsible } from '@/shared/components/Collapsible';
import { UserAvatar } from '@/shared/components/UserAvatar';
import { moveAgentToTeam, useStore } from '@/store';

/** Everybody sees who is in which team: Operation Manager on top, then each Team Leader with their agents. */
export function TeamsPage() {
  const { state, dispatch } = useStore();
  const me = state.users.find(u => u.id === state.currentUserId)!;
  const [moving, setMoving] = useState<User | null>(null);

  const userOf = (id: string) => state.users.find(u => u.id === id);
  const managers = state.users.filter(u => u.role === 'operation_manager');
  const quality = state.users.filter(u => u.role === 'quality');
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
      <Collapsible
        key={team.id}
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        headerClassName="px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        header={
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-900">{team.name}</span>
            <span className="text-xs text-slate-600">{agents.length} agent{agents.length === 1 ? '' : 's'}</span>
          </span>
        }
      >
        {leader && (
          <div className="px-4 py-3 border-t border-b border-slate-100 flex items-center justify-between gap-2">
            {person(leader)}
            <span className="shrink-0 text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" />Team Leader</span>
          </div>
        )}
        <ul className="divide-y divide-slate-100">
          {agents.map(agentRow)}
          {agents.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">No agents in this team</li>}
        </ul>
      </Collapsible>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Teams</h2>
        <p className="text-sm text-slate-600">
          {state.teams.length} teams · {state.users.filter(u => u.role === 'agent').length} agents · click an arrow to open or close a group
          {me.role === 'operation_manager' && ' · use Move to put an agent in another team'}
        </p>
      </div>

      {managers.map(m => {
        const teams = state.teams.filter(t => t.managerId === m.id);
        const agentCount = teams.reduce((n, t) => n + t.agentIds.length, 0);
        return (
          <Collapsible
            key={m.id}
            className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5"
            headerClassName="rounded-xl bg-white border border-blue-200 shadow-sm px-4 py-3 hover:bg-blue-50/50 transition-colors"
            /* the manager is the header of the panel: every team below belongs to him, however many there are */
            header={
              <span className="flex items-center justify-between gap-3 flex-wrap">
                {person(m)}
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-600">{teams.length} team{teams.length === 1 ? '' : 's'} · {agentCount} agents</span>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Crown className="w-3 h-3" />Manager</span>
                </span>
              </span>
            }
          >
            {/* plain grid: the first row fills left → middle → right, the next team starts again on the LEFT of a new row */}
            {teams.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start mt-4">{teams.map(teamCard)}</div>
            )}
          </Collapsible>
        );
      })}

      {quality.length > 0 && (
        <Collapsible
          className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5"
          headerClassName="rounded-xl bg-white border border-amber-200 shadow-sm px-4 py-3 hover:bg-amber-50/50 transition-colors"
          header={
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">Quality</span>
              <span className="text-xs text-slate-600">{quality.length} member{quality.length === 1 ? '' : 's'}</span>
            </span>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-4">
            {quality.map(q => (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-2">
                {person(q)}
                <span className="shrink-0 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1"><BadgeCheck className="w-3 h-3" />Quality</span>
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      {unassigned.length > 0 && (
        <Collapsible
          className="bg-white rounded-xl border border-dashed border-slate-300 overflow-hidden"
          headerClassName="px-4 py-3 bg-slate-50 hover:bg-slate-100"
          header={<span className="text-sm font-bold text-slate-900">Agents without a team <span className="ml-1 text-xs font-normal text-slate-600">({unassigned.length})</span></span>}
        >
          <ul className="divide-y divide-slate-100 border-t border-slate-100">{unassigned.map(agentRow)}</ul>
        </Collapsible>
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
