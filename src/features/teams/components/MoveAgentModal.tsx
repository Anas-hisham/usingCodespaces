import { XCircle } from 'lucide-react';
import { useState } from 'react';
import type { Team, User } from '@/domain/types';
import { UserAvatar } from '@/shared/components/UserAvatar';

/** The Operation Manager picks the new team for one agent. Only the team changes - the agent keeps every lead and all the data. */
export function MoveAgentModal({ agent, fromTeam, teams, users, onMove, onClose }: {
  agent: User; fromTeam: Team | undefined; teams: Team[]; users: User[];
  onMove: (toTeamId: string) => void; onClose: () => void;
}) {
  const options = teams.filter(t => t.id !== fromTeam?.id);
  const [toId, setToId] = useState(options[0]?.id ?? '');
  const to = options.find(t => t.id === toId);
  const leaderOf = (t?: Team) => users.find(u => u.id === t?.leaderId)?.name ?? '—';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Move agent">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Move agent to another team</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center" aria-label="Close">
            <XCircle className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar user={agent} />
            <div>
              <div className="text-sm font-medium text-slate-900">{agent.name}</div>
              <div className="text-xs text-slate-600">{fromTeam ? `${fromTeam.name} · ${leaderOf(fromTeam)}` : 'No team yet'}</div>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">New team</span>
            <select
              value={toId} onChange={e => setToId(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {options.map(t => <option key={t.id} value={t.id}>{t.name} · Team Leader: {leaderOf(t)}</option>)}
            </select>
          </label>

          <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
            Only the team changes. {agent.name.split(' ')[0]} keeps all their leads, calls, meetings and sales exactly as they are,
            and continues under {to ? leaderOf(to) : 'the new Team Leader'}.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
          <button
            onClick={() => to && onMove(to.id)} disabled={!to}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
          >
            Move agent
          </button>
        </div>
      </div>
    </div>
  );
}
