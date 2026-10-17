import { useState } from 'react';
import { useStore, setUser } from '@/store';
import { Login } from '@/components/Login';
import { Layout, type Page } from '@/components/Layout';
import { Dashboard } from '@/components/Dashboard';
import { WorkQueue } from '@/components/WorkQueue';
import { CalendarPage } from '@/components/CalendarPage';
import { Leads } from '@/components/Leads';
import { TeamUpdates } from '@/components/TeamUpdates';
import { Tasks } from '@/components/Tasks';
import { EmailCenter } from '@/components/EmailCenter';

function AppContent() {
  const { state, dispatch } = useStore();
  const [page, setPage] = useState<Page>('dashboard');

  if (!state.currentUserId) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      onLogout={() => dispatch(setUser(''))}
    >
      {page === 'dashboard' && <Dashboard />}
      {page === 'workqueue' && <WorkQueue />}
      {page === 'calendar' && <CalendarPage />}
      {page === 'leads' && <Leads />}
      {page === 'updates' && <TeamUpdates />}
      {page === 'tasks' && <Tasks />}
      {page === 'emails' && <EmailCenter />}
    </Layout>
  );
}

function App() {
  return <AppContent />;
}

export default App;
