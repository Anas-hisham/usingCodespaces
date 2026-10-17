import { useMemo } from 'react';
import {
  Users, AlertCircle, Calendar, TrendingUp, Clock,
  CheckCircle2, Mail, Phone, Target, ArrowRight,
  PhoneOutgoing, Voicemail, UserCheck, BarChart3,
} from 'lucide-react';
import { useStore } from '@/store';
import type { User, Lead, CallType } from '@/types';

function isToday(dateStr: string) {
  return dateStr.split('T')[0] === new Date().toISOString().split('T')[0];
}

function countCallTypes(callLogs: Lead['callLogs'], filterFn?: (cl: Lead['callLogs'][0]) => boolean) {
  const logs = filterFn ? callLogs.filter(filterFn) : callLogs;
  return {
    nvm: logs.filter(cl => cl.type === 'nvm').length,
    lvm: logs.filter(cl => cl.type === 'lvm').length,
    discovery: logs.filter(cl => cl.type === 'discovery').length,
    total: logs.length,
  };
}

function countTodayCalls(callLogs: Lead['callLogs']) {
  return countCallTypes(callLogs, cl => isToday(cl.timestamp));
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Phone; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function CallBreakdown({ callLogs, todayOnly }: { callLogs: Lead['callLogs']; todayOnly?: boolean }) {
  const stats = todayOnly ? countTodayCalls(callLogs) : countCallTypes(callLogs);
  const items = [
    { label: 'Total Calls', value: stats.total, color: 'bg-blue-50 text-blue-600', icon: Phone },
    { label: 'Discovery', value: stats.discovery, color: 'bg-green-50 text-green-600', icon: UserCheck },
    { label: 'LVM', value: stats.lvm, color: 'bg-amber-50 text-amber-600', icon: Voicemail },
    { label: 'NVM', value: stats.nvm, color: 'bg-orange-50 text-orange-600', icon: PhoneOutgoing },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${item.color}`}>
            <item.icon className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-slate-900">{item.value}</div>
          <div className="text-xs text-slate-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function AgentDashboard({ currentUser, leads, meetings, emails }: {
  currentUser: User; leads: Lead[]; meetings: ReturnType<typeof useStore>['state']['meetings']; emails: ReturnType<typeof useStore>['state']['emailLogs'];
}) {
  const myLeads = leads.filter(l => l.agentId === currentUser.id && !l.removedFromQueue);
  const allMyCallLogs = myLeads.flatMap(l => l.callLogs);
  const todayCalls = countTodayCalls(allMyCallLogs);
  const myEmails = emails.filter(e => e.sentBy === currentUser.id);
  const todayEmails = myEmails.filter(e => isToday(e.sentAt));
  const myMeetings = meetings.filter(m => m.participantIds.includes(currentUser.id) && m.status === 'arranged');
  const todayMeetings = myMeetings.filter(m => isToday(m.date));
  const overdueLeads = myLeads.filter(l => {
    if (l.stopped) return false;
    const tp = l.touchPoints.find(t => t.order === l.currentTouchPoint);
    return tp && tp.status !== 'completed' && tp.dueDate && new Date(tp.dueDate) < new Date();
  });
  const target = currentUser.dailyCallTarget;
  const progressPct = target > 0 ? Math.min((todayCalls.total / target) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">My Dashboard</h2>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">Today's Call Progress</span>
          </div>
          <span className="text-sm font-bold text-slate-900">{todayCalls.total} / {target}</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
            style={{ width: `${Math.max(progressPct, 2)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">{Math.round(progressPct)}% of daily target</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Today's Call Breakdown</h3>
        <CallBreakdown callLogs={allMyCallLogs} todayOnly />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Emails Sent Today" value={todayEmails.length} icon={Mail} color="text-teal-600 bg-teal-50" />
        <StatCard label="Meetings Today" value={todayMeetings.length} icon={Calendar} color="text-green-600 bg-green-50" />
        <StatCard label="Active Leads" value={myLeads.filter(l => !l.stopped).length} icon={Users} color="text-blue-600 bg-blue-50" />
        <StatCard label="Overdue" value={overdueLeads.length} icon={AlertCircle} color="text-red-600 bg-red-50" />
      </div>

      {todayMeetings.length > 0 && (
        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Today's Meetings ({todayMeetings.length})
          </h3>
          <div className="space-y-2">
            {todayMeetings.map(m => (
              <div key={m.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">{m.title}</div>
                  <div className="text-xs text-slate-500">{m.time} • {m.duration}min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {overdueLeads.length > 0 && (
        <div className="bg-red-50/50 rounded-xl border border-red-100 p-5">
          <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Overdue Touch Points ({overdueLeads.length})
          </h3>
          <div className="space-y-2">
            {overdueLeads.slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-red-100">
                <Clock className="w-4 h-4 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">{l.leadCode} — {l.companyName}</div>
                  <div className="text-xs text-slate-500">{l.touchPoints.find(t => t.order === l.currentTouchPoint)?.label}</div>
                </div>
                <span className="text-xs text-red-600 font-medium">
                  {(() => { const tp = l.touchPoints.find(t => t.order === l.currentTouchPoint); return tp?.dueDate ? new Date(tp.dueDate).toLocaleDateString() : '—'; })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamLeaderDashboard({ currentUser, state }: {
  currentUser: User; state: ReturnType<typeof useStore>['state'];
}) {
  const myTeam = state.teams.find(t => t.id === currentUser.teamId);
  const teamAgents = state.users.filter(u => myTeam?.agentIds.includes(u.id));
  const teamLeads = state.leads.filter(l => myTeam?.agentIds.includes(l.agentId) && !l.removedFromQueue);
  const todayMeetings = state.meetings.filter(m =>
    m.type === 'lead_meeting' && m.status === 'arranged' &&
    isToday(m.date) && myTeam?.agentIds.includes(m.agentId || '')
  );

  const agentStats = teamAgents.map(agent => {
    const agentLeads = teamLeads.filter(l => l.agentId === agent.id);
    const allCalls = agentLeads.flatMap(l => l.callLogs);
    const todayCalls = countTodayCalls(allCalls);
    const agentEmails = state.emailLogs.filter(e => e.sentBy === agent.id && isToday(e.sentAt));
    const agentMeetings = state.meetings.filter(m =>
      m.type === 'lead_meeting' && m.participantIds.includes(agent.id) && m.status === 'arranged' && isToday(m.date)
    );
    const overdue = agentLeads.filter(l => {
      if (l.stopped) return false;
      const tp = l.touchPoints.find(t => t.order === l.currentTouchPoint);
      return tp && tp.status !== 'completed' && tp.dueDate && new Date(tp.dueDate) < new Date();
    });
    return { agent, todayCalls, agentEmails, agentMeetings, overdue, activeLeads: agentLeads.filter(l => !l.stopped) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{myTeam?.name} Dashboard</h2>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {todayMeetings.length > 0 && (
        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Team Meetings Today ({todayMeetings.length})
          </h3>
          <div className="space-y-2">
            {todayMeetings.map(m => {
              const agent = state.users.find(u => u.id === m.agentId);
              return (
                <div key={m.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{m.title}</div>
                    <div className="text-xs text-slate-500">
                      {m.time} • {m.duration}min • Agent: {agent?.name || '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Agent Performance — Today</h3>
        <div className="space-y-3">
          {agentStats.map(({ agent, todayCalls, agentEmails, agentMeetings, overdue, activeLeads }) => {
            const target = agent.dailyCallTarget;
            const pct = target > 0 ? Math.min((todayCalls.total / target) * 100, 100) : 0;
            return (
              <div key={agent.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: agent.color }}>
                    {agent.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{agent.name}</div>
                    <div className="text-xs text-slate-500">@{agent.username} • {activeLeads.length} active leads</div>
                  </div>
                  {overdue.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">{overdue.length} overdue</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">{todayCalls.total}/{target}</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-blue-700">{todayCalls.total}</div>
                    <div className="text-[10px] text-slate-500">Calls</div>
                  </div>
                  <div className="bg-green-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-green-700">{todayCalls.discovery}</div>
                    <div className="text-[10px] text-slate-500">Disc.</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-amber-700">{todayCalls.lvm}</div>
                    <div className="text-[10px] text-slate-500">LVM</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-orange-700">{todayCalls.nvm}</div>
                    <div className="text-[10px] text-slate-500">NVM</div>
                  </div>
                  <div className="bg-teal-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-teal-700">{agentEmails.length}</div>
                    <div className="text-[10px] text-slate-500">Emails</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-purple-700">{agentMeetings.length}</div>
                    <div className="text-[10px] text-slate-500">Meet.</div>
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

function OMDashboard({ state }: { state: ReturnType<typeof useStore>['state'] }) {
  const teamLeaders = state.users.filter(u => u.role === 'team_leader');
  const todayMeetings = state.meetings.filter(m => m.status === 'arranged' && isToday(m.date));

  const tlStats = teamLeaders.map(tl => {
    const team = state.teams.find(t => t.id === tl.teamId);
    const agents = state.users.filter(u => team?.agentIds.includes(u.id));
    const teamLeads = state.leads.filter(l => team?.agentIds.includes(l.agentId) && !l.removedFromQueue);
    const allCalls = teamLeads.flatMap(l => l.callLogs);
    const todayCalls = countTodayCalls(allCalls);
    const teamTarget = agents.reduce((sum, a) => sum + a.dailyCallTarget, 0);
    const teamEmails = state.emailLogs.filter(e => e.sentBy && team?.agentIds.includes(e.sentBy) && isToday(e.sentAt));
    const teamMeetings = state.meetings.filter(m => m.type === 'lead_meeting' && m.status === 'arranged' && isToday(m.date) && team?.agentIds.includes(m.agentId || ''));
    return { tl, team, agents, todayCalls, teamTarget, teamEmails, teamMeetings, activeLeads: teamLeads.filter(l => !l.stopped) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Operations Overview</h2>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {todayMeetings.length > 0 && (
        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Meetings Today ({todayMeetings.length})
          </h3>
          <div className="space-y-2">
            {todayMeetings.map(m => {
              const agent = state.users.find(u => u.id === m.agentId);
              const team = state.teams.find(t => agent && t.agentIds.includes(agent.id));
              return (
                <div key={m.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{m.title}</div>
                    <div className="text-xs text-slate-500">
                      {m.time} • {m.duration}min • {agent?.name || '—'} {team ? `(${team.name})` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Team Leader Performance — Today</h3>
        <div className="space-y-3">
          {tlStats.map(({ tl, team, agents, todayCalls, teamTarget, teamEmails, teamMeetings, activeLeads }) => {
            const pct = teamTarget > 0 ? Math.min((todayCalls.total / teamTarget) * 100, 100) : 0;
            return (
              <div key={tl.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0" style={{ backgroundColor: tl.color }}>
                    {tl.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{tl.name}</div>
                    <div className="text-xs text-slate-500">@{tl.username} • {team?.name} • {agents.length} agents • {activeLeads.length} active leads</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">{todayCalls.total}/{teamTarget} ({Math.round(pct)}%)</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-blue-700">{todayCalls.total}</div>
                    <div className="text-[10px] text-slate-500">Calls</div>
                  </div>
                  <div className="bg-green-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-green-700">{todayCalls.discovery}</div>
                    <div className="text-[10px] text-slate-500">Disc.</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-amber-700">{todayCalls.lvm}</div>
                    <div className="text-[10px] text-slate-500">LVM</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-orange-700">{todayCalls.nvm}</div>
                    <div className="text-[10px] text-slate-500">NVM</div>
                  </div>
                  <div className="bg-teal-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-teal-700">{teamEmails.length}</div>
                    <div className="text-[10px] text-slate-500">Emails</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg py-1.5">
                    <div className="text-sm font-bold text-purple-700">{teamMeetings.length}</div>
                    <div className="text-[10px] text-slate-500">Meet.</div>
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

export function Dashboard() {
  const { state } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;

  if (currentUser.role === 'agent') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <AgentDashboard currentUser={currentUser} leads={state.leads} meetings={state.meetings} emails={state.emailLogs} />
      </div>
    );
  }

  if (currentUser.role === 'team_leader') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <TeamLeaderDashboard currentUser={currentUser} state={state} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <OMDashboard state={state} />
    </div>
  );
}
