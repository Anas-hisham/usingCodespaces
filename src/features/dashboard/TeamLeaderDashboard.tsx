import type { User } from '@/domain/types';
import { ReassignRow } from '@/features/dashboard/components/ReassignRow';
import { TodayMeetingsCard } from '@/features/dashboard/components/TodayMeetingsCard';
import { countCallsMadeToday, isTodayDate } from '@/features/dashboard/dashboardCallStats';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { transferLeadToAgent, useStore } from '@/store';
import type { AppState } from '@/store/state/AppState';

export function TeamLeaderDashboard({ currentUser, state, dispatch }: {
  currentUser: User; state: AppState; dispatch: ReturnType<typeof useStore>['dispatch'];
}) {
  const { ask, dialog: confirmDialog } = useConfirm();
  const myTeam = state.teams.find(t => t.id === currentUser.teamId);
  const teamAgents = state.users.filter(u => myTeam?.agentIds.includes(u.id));
  const teamLeads = state.leads.filter(l => myTeam?.agentIds.includes(l.agentId) && !l.removedFromQueue && !l.expiredAt);
  const expiredLeads = state.leads.filter(l => myTeam?.agentIds.includes(l.agentId) && !l.removedFromQueue && !!l.expiredAt);
  const todayMeetings = state.meetings.filter(m =>
    m.status === 'arranged' && isTodayDate(m.date) && (
      (m.type === 'lead_meeting' && myTeam?.agentIds.includes(m.agentId || '')) ||
      m.participantIds.includes(currentUser.id) || m.createdBy === currentUser.id
    )
  );

  const agentStats = teamAgents.map(agent => {
    const agentLeads = teamLeads.filter(l => l.agentId === agent.id);
    const allCalls = agentLeads.flatMap(l => l.callLogs);
    const todayCalls = countCallsMadeToday(allCalls);
    const agentEmails = state.emailLogs.filter(e => e.sentBy === agent.id && isTodayDate(e.sentAt));
    const agentMeetings = state.meetings.filter(m =>
      m.type === 'lead_meeting' && m.participantIds.includes(agent.id) && m.status === 'arranged' && isTodayDate(m.date)
    );
    return { agent, todayCalls, agentEmails, agentMeetings };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{myTeam?.name} Dashboard</h2>
        <p className="text-sm text-slate-600">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {confirmDialog}

      <TodayMeetingsCard meetings={todayMeetings} users={state.users} title="Team Meetings Today" />

      {expiredLeads.length > 0 && (
        <div className="bg-rose-50/50 rounded-xl border border-rose-100 p-5">
          <h3 className="text-sm font-semibold text-rose-900 mb-1">Needs reassignment ({expiredLeads.length})</h3>
          <p className="text-xs text-slate-600 mb-3">No progress for 15 days. The new agent starts from touch point 1; the old history is kept.</p>
          <div className="space-y-2">
            {expiredLeads.map(l => (
              <ReassignRow
                key={l.id} lead={l} agents={teamAgents}
                ownerName={state.users.find(u => u.id === l.agentId)?.name ?? '—'}
                onReassign={agentId => ask(
                  { title: 'Reassign this lead?', message: <><b>{l.companyName}</b> will move to <b>{state.users.find(u => u.id === agentId)?.name ?? 'the selected agent'}</b> and start again from touch point 1. The old history is kept.</>, confirmLabel: 'Reassign' },
                  () => dispatch(transferLeadToAgent({ leadId: l.id, newAgentId: agentId })),
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Agent Performance — Today</h3>
        <div className="space-y-3">
          {agentStats.map(({ agent, todayCalls, agentEmails, agentMeetings }) => {
            const target = agent.dailyCallTarget;
            const pct = target > 0 ? Math.min((todayCalls.total / target) * 100, 100) : 0;
            return (
              <div key={agent.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: agent.color }}>
                    {agent.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{agent.name}</div>
                    <div className="text-xs text-slate-600">@{agent.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">{todayCalls.total}/{target}</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
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
                    <div className="text-sm font-bold text-violet-700">{agentEmails.length}</div>
                    <div className="text-[11px] text-slate-600">Emails</div>
                  </div>
                  <div className="bg-violet-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-violet-700">{agentMeetings.length}</div>
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
