import { useEffect, useState } from 'react';
import { useStore, setUser, tickScheduler } from '@/store';
import { Login } from '@/components/Login';
import { Layout, canOpenPage, homePageFor, type Page } from '@/components/Layout';
import { Dashboard } from '@/components/Dashboard';
import { WorkQueue } from '@/components/WorkQueue';
import { CalendarPage } from '@/components/CalendarPage';
import { Leads } from '@/components/Leads';
import { TeamUpdates } from '@/components/TeamUpdates';
import { Tasks } from '@/components/Tasks';
import { EmailCenter } from '@/components/EmailCenter';
import { Sales } from '@/components/Sales';

function AppContent() {
  const { state, dispatch } = useStore();
  const [page, setPage] = useState<Page>('dashboard');

  // Runs the timed rules (meeting reminders, meeting-day end, 15-day rule, automatic emails) while the app is open
  const loggedIn = !!state.currentUserId;
  useEffect(() => {
    if (!loggedIn) return;
    dispatch(tickScheduler());
    const t = setInterval(() => dispatch(tickScheduler()), 30000);
    return () => clearInterval(t);
  }, [loggedIn, dispatch]);

  if (!state.currentUserId) {
    return <Login onLogin={() => {}} />;
  }

  // If the page left open from the previous person is not allowed for this role, go to their home page
  const role = state.users.find(u => u.id === state.currentUserId)?.role;
  const currentPage: Page = role && !canOpenPage(page, role) ? homePageFor(role) : page;

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setPage}
      onLogout={() => dispatch(setUser(''))}
    >
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'workqueue' && <WorkQueue />}
      {currentPage === 'calendar' && <CalendarPage />}
      {currentPage === 'leads' && <Leads />}
      {currentPage === 'updates' && <TeamUpdates />}
      {currentPage === 'tasks' && <Tasks />}
      {currentPage === 'emails' && <EmailCenter />}
      {currentPage === 'sales' && <Sales />}
    </Layout>
  );
}

function App() {
  return <AppContent />;
}

export default App;
