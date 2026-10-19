import { AgentDashboard } from '@/features/dashboard/AgentDashboard';
import { OperationManagerDashboard } from '@/features/dashboard/OperationManagerDashboard';
import { TeamLeaderDashboard } from '@/features/dashboard/TeamLeaderDashboard';
import { currentMonthKey } from '@/shared/lib/dates';
import { useStore } from '@/store';

export function DashboardPage() {
  const { state, dispatch } = useStore();
  const currentUser = state.users.find(u => u.id === state.currentUserId)!;

  if (currentUser.role === 'agent') {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
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
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <TeamLeaderDashboard currentUser={currentUser} state={state} dispatch={dispatch} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <OperationManagerDashboard state={state} />
    </div>
  );
}
