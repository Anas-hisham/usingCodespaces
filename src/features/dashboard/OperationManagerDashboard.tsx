import { TodayMeetingsCard } from '@/features/dashboard/components/TodayMeetingsCard';
import { countCallsMadeToday, isTodayDate } from '@/features/dashboard/dashboardCallStats';
import type { AppState } from '@/store/state/AppState';

export function OperationManagerDashboard({ state }: { state: AppState }) {
  const teamLeaders = state.users.filter(u => u.role === 'team_leader');
  const todayMeetings = state.meetings.filter(m => m.status === 'arranged' && isTodayDate(m.date));

  const tlStats = teamLeaders.map(tl => {
    const team = state.teams.find(t => t.id === tl.teamId);
    const agents = state.users.filter(u => team?.agentIds.includes(u.id));
    const teamLeads = state.leads.filter(l => team?.agentIds.includes(l.agentId) && !l.removedFromQueue && !l.expiredAt);
    const allCalls = teamLeads.flatMap(l => l.callLogs);
    const todayCalls = countCallsMadeToday(allCalls);
    const teamTarget = agents.reduce((sum, a) => sum + a.dailyCallTarget, 0);
    const teamEmails = state.emailLogs.filter(e => e.sentBy && team?.agentIds.includes(e.sentBy) && isTodayDate(e.sentAt));
    const teamMeetings = state.meetings.filter(m => m.type === 'lead_meeting' && m.status === 'arranged' && isTodayDate(m.date) && team?.agentIds.includes(m.agentId || ''));
    return { tl, team, agents, todayCalls, teamTarget, teamEmails, teamMeetings };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Operations Overview</h2>
        <p className="text-sm text-slate-600">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <TodayMeetingsCard meetings={todayMeetings} users={state.users} title="Meetings Today" />

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Team Leader Performance — Today</h3>
        <div className="space-y-3">
          {tlStats.map(({ tl, team, agents, todayCalls, teamTarget, teamEmails, teamMeetings }) => {
            const pct = teamTarget > 0 ? Math.min((todayCalls.total / teamTarget) * 100, 100) : 0;
            return (
              <div key={tl.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: tl.color }}>
                    {tl.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{tl.name}</div>
                    <div className="text-xs text-slate-600">@{tl.username} • {team?.name} • {agents.length} agents</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">{todayCalls.total}/{teamTarget} ({Math.round(pct)}%)</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-blue-700">{todayCalls.total}</div>
                    <div className="text-[11px] text-slate-600">Calls</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-emerald-700">{todayCalls.discovery}</div>
                    <div className="text-[11px] text-slate-600">Disc.</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-amber-700">{todayCalls.lvm}</div>
                    <div className="text-[11px] text-slate-600">LVM</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-amber-700">{todayCalls.nvm}</div>
                    <div className="text-[11px] text-slate-600">NVM</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-violet-700">{teamEmails.length}</div>
                    <div className="text-[11px] text-slate-600">Emails</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-violet-700">{teamMeetings.length}</div>
                    <div className="text-[11px] text-slate-600">Meet.</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
