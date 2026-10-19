import { Trophy } from 'lucide-react';
import type { AgentRank } from '@/domain/sales/salesLeaderboard';
import type { Team } from '@/domain/types';
import { UserAvatar } from '@/shared/components/UserAvatar';

const PODIUM = [
  'bg-amber-100 text-amber-700 ring-amber-300',
  'bg-slate-100 text-slate-600 ring-slate-300',
  'bg-amber-100 text-amber-700 ring-amber-300',
];

/** Top 5 agents of the month: only the number of sales is shown (not the type). */
export function TopAgentsCard({ ranks, teams, meId, monthName }: { ranks: AgentRank[]; teams: Team[]; meId: string; monthName: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-900">Top 5 agents</h3>
        <span className="text-xs text-slate-500">· {monthName}</span>
      </div>

      {ranks.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 text-center">No sales yet this month</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {ranks.map((r, i) => {
            const team = teams.find(t => t.agentIds.includes(r.agent.id));
            const isMe = r.agent.id === meId;
            return (
              <li key={r.agent.id} className={`px-5 py-3 flex items-center gap-3 ${isMe ? 'bg-blue-50/60' : ''}`}>
                <span className={`w-7 h-7 rounded-full ring-1 flex items-center justify-center text-xs font-bold shrink-0 ${PODIUM[i] ?? 'bg-slate-50 text-slate-500 ring-slate-200'}`}>
                  {i + 1}
                </span>
                <UserAvatar user={r.agent} size="w-8 h-8" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {r.agent.name}
                    {isMe && <span className="ml-1.5 text-[10px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">You</span>}
                  </div>
                  {team && <div className="text-xs text-slate-600 truncate">{team.name}</div>}
                </div>
                <div className="text-sm font-bold text-slate-900 shrink-0">
                  {r.sales} <span className="text-xs font-normal text-slate-500">{r.sales === 1 ? 'sale' : 'sales'}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
