import {
  Users, Calendar, Mail, Phone, Target, Trophy,
  PhoneOutgoing, Voicemail, UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useStore, transferLead } from '@/store';
import { currentMonthKey } from '@/lib/sales';
import type { User, Lead, Meeting } from '@/types';

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

function TodayMeetingsCard({ meetings, users, title = "Today's Meetings" }: { meetings: Meeting[]; users: User[]; title?: string }) {
  const sorted = [...meetings].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-5">
      <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-1.5">
        <Calendar className="w-4 h-4" />
        {title} ({sorted.length})
      </h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400">No meetings today.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(m => {
            const agent = users.find(u => u.id === m.agentId);
            const who = m.type === 'lead_meeting'
              ? [m.companyName, agent?.name].filter(Boolean).join(' • ')
              : m.participantNames.join(', ');
            return (
              <div key={m.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
                <div className="w-14 text-center shrink-0">
                  <div className="text-sm font-bold text-blue-700">{m.time}</div>
                  <div className="text-[10px] text-slate-400">{m.duration}min</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{m.title}</div>
                  {who && <div className="text-xs text-slate-500 truncate">{who}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentDashboard({ currentUser, leads, meetings, emails, users, salesThisMonth }: {
  currentUser: User; leads: Lead[]; meetings: ReturnType<typeof useStore>['state']['meetings']; emails: ReturnType<typeof useStore>['state']['emailLogs'];
  users: User[]; salesThisMonth: number;
}) {
  const myLeads = leads.filter(l => l.agentId === currentUser.id && !l.removedFromQueue && !l.expiredAt);
  const allMyCallLogs = myLeads.flatMap(l => l.callLogs);
  const todayCalls = countTodayCalls(allMyCallLogs);
  const myEmails = emails.filter(e => e.sentBy === currentUser.id);
  const todayEmails = myEmails.filter(e => isToday(e.sentAt));
  const myMeetings = meetings.filter(m => m.participantIds.includes(currentUser.id) && m.status === 'arranged');
  const todayMeetings = myMeetings.filter(m => isToday(m.date));
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

      <TodayMeetingsCard meetings={todayMeetings} users={users} />

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
        <StatCard label="Sales This Month" value={salesThisMonth} icon={Trophy} color="text-amber-600 bg-amber-50" />
      </div>

    </div>
  );
}

function ReassignRow({ lead, agents, ownerName, onReassign }: {
  lead: Lead; agents: User[]; ownerName: string; onReassign: (agentId: string) => void;
}) {
  const options = agents.filter(a => a.id !== lead.agentId);
  const [target, setTarget] = useState(options[0]?.id ?? '');
  return (
    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-red-100">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 truncate">{lead.leadCode} — {lead.companyName}</div>
        <div className="text-xs text-slate-500">
          With {ownerName} • left the queue {lead.expiredAt ? new Date(lead.expiredAt).toLocaleDateString() : ''}
        </div>
      </div>
      <select
        value={target} onChange={e => setTarget(e.target.value)}
        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
      >
        {options.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <button
        onClick={() => target && onReassign(target)}
        disabled={!target}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
      >
        Reassign
      </button>
    </div>
  );
}

function TeamLeaderDashboard({ currentUser, state, dispatch }: {
  currentUser: User; state: ReturnType<typeof useStore>['state']; dispatch: ReturnType<typeof useStore>['dispatch'];
}) {
  const myTeam = state.teams.find(t => t.id === currentUser.teamId);
  const teamAgents = state.users.filter(u => myTeam?.agentIds.includes(u.id));
  const teamLeads = state.leads.filter(l => myTeam?.agentIds.includes(l.agentId) && !l.removedFromQueue && !l.expiredAt);
  const expiredLeads = state.leads.filter(l => myTeam?.agentIds.includes(l.agentId) && !l.removedFromQueue && !!l.expiredAt);
  const todayMeetings = state.meetings.filter(m =>
    m.status === 'arranged' && isToday(m.date) && (
      (m.type === 'lead_meeting' && myTeam?.agentIds.includes(m.agentId || '')) ||
      m.participantIds.includes(currentUser.id) || m.createdBy === currentUser.id
    )
  );

  const agentStats = teamAgents.map(agent => {
    const agentLeads = teamLeads.filter(l => l.agentId === agent.id);
    const allCalls = agentLeads.flatMap(l => l.callLogs);
    const todayCalls = countTodayCalls(allCalls);
    const agentEmails = state.emailLogs.filter(e => e.sentBy === agent.id && isToday(e.sentAt));
    const agentMeetings = state.meetings.filter(m =>
      m.type === 'lead_meeting' && m.participantIds.includes(agent.id) && m.status === 'arranged' && isToday(m.date)
    );
    return { agent, todayCalls, agentEmails, agentMeetings, activeLeads: agentLeads.filter(l => !l.stopped) };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{myTeam?.name} Dashboard</h2>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <TodayMeetingsCard meetings={todayMeetings} users={state.users} title="Team Meetings Today" />

      {expiredLeads.length > 0 && (
        <div className="bg-red-50/50 rounded-xl border border-red-100 p-5">
          <h3 className="text-sm font-semibold text-red-900 mb-1">Needs reassignment ({expiredLeads.length})</h3>
          <p className="text-xs text-slate-500 mb-3">No progress for 15 days. The new agent starts from touch point 1; the old history is kept.</p>
          <div className="space-y-2">
            {expiredLeads.map(l => (
              <ReassignRow
                key={l.id} lead={l} agents={teamAgents}
                ownerName={state.users.find(u => u.id === l.agentId)?.name ?? '—'}
                onReassign={agentId => dispatch(transferLead({ leadId: l.id, newAgentId: agentId }))}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Agent Performance — Today</h3>
        <div className="space-y-3">
          {agentStats.map(({ agent, todayCalls, agentEmails, agentMeetings, activeLeads }) => {
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
    const teamLeads = state.leads.filter(l => team?.agentIds.includes(l.agentId) && !l.removedFromQueue && !l.expiredAt);
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

      <TodayMeetingsCard meetings={todayMeetings} users={state.users} title="Meetings Today" />

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
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;

  if (currentUser.role === 'agent') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <AgentDashboard
          currentUser={currentUser} leads={state.leads} meetings={state.meetings} emails={state.emailLogs}
          users={state.users}
          salesThisMonth={state.sales.filter(x => x.agentId === currentUser.id && x.date.startsWith(currentMonthKey())).length}
        />
      </div>
    );
  }

  if (currentUser.role === 'team_leader') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <TeamLeaderDashboard currentUser={currentUser} state={state} dispatch={dispatch} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <OMDashboard state={state} />
    </div>
  );
}
