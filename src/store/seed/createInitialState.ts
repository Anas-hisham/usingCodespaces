import type { AppState } from '@/store/state/AppState';
import { createSeedActivity } from '@/store/seed/seedActivity';
import { createSeedUsers } from '@/store/seed/seedUsers';
import { createSeedTeams } from '@/store/seed/seedTeams';
import { createSeedWorkflows } from '@/store/seed/seedWorkflows';
import { createSeedLeads } from '@/store/seed/seedLeads';
import { createSeedEmailTemplates } from '@/store/seed/seedEmailTemplates';

/** The demo data the app starts with when nothing is saved yet (nobody signed in). */
export function createInitialState(): AppState {
  const users = createSeedUsers();
  const teams = createSeedTeams();
  const workflows = createSeedWorkflows();
  const leads = createSeedLeads(users, workflows);
  const emailTemplates = createSeedEmailTemplates();
  const { meetings, emailLogs, sales, updates, tasks, tips, notifications } = createSeedActivity(users, teams, leads, emailTemplates);

  return {
    currentUserId: '',
    users, teams, workflows, leads,
    meetings, updates, tasks, tips, escalations: [],
    emailTemplates, emailLogs, notifications, sales,
  };
}
