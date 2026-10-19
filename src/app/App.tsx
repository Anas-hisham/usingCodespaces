import { useState } from 'react';
import { useStore, setCurrentUser } from '@/store';
import { AppShell } from '@/app/layout/AppShell';
import { canOpenPage, homePageFor, type PageId } from '@/app/navigation';
import { useSchedulerTick } from '@/app/useSchedulerTick';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { WorkQueuePage } from '@/features/work-queue/WorkQueuePage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { MyLeadsPage } from '@/features/my-leads/MyLeadsPage';
import { TeamUpdatesPage } from '@/features/team-updates/TeamUpdatesPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { EmailCenterPage } from '@/features/email-center/EmailCenterPage';
import { SalesPage } from '@/features/sales/SalesPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { TeamsPage } from '@/features/teams/TeamsPage';
import { LeadPoolPage } from '@/features/lead-pool/LeadPoolPage';

export function App() {
  const { state, dispatch } = useStore();
  const [page, setPage] = useState<PageId>('dashboard');

  useSchedulerTick(!!state.currentUserId);

  if (!state.currentUserId) {
    return <LoginPage onLogin={() => {}} />;
  }

  // If the page left open from the previous person is not allowed for this role, go to their home page
  const role = state.users.find(u => u.id === state.currentUserId)?.role;
  const currentPage: PageId = role && !canOpenPage(page, role) ? homePageFor(role) : page;

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={setPage}
      onLogout={() => dispatch(setCurrentUser(''))}
    >
      {currentPage === 'adminleads' && <LeadPoolPage />}
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'workqueue' && <WorkQueuePage />}
      {currentPage === 'calendar' && <CalendarPage />}
      {currentPage === 'leads' && <MyLeadsPage />}
      {currentPage === 'updates' && <TeamUpdatesPage />}
      {currentPage === 'tasks' && <TasksPage />}
      {currentPage === 'emails' && <EmailCenterPage />}
      {currentPage === 'sales' && <SalesPage />}
      {currentPage === 'analytics' && <AnalyticsPage />}
      {currentPage === 'teams' && <TeamsPage />}
    </AppShell>
  );
}
