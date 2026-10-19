import type { AppState } from '@/store/state/AppState';
import { createSeedUsers } from '@/store/seed/seedUsers';
import { createSeedTeams } from '@/store/seed/seedTeams';
import { createSeedWorkflows } from '@/store/seed/seedWorkflows';
import { createSeedLeads } from '@/store/seed/seedLeads';
import { createSeedEmailTemplates } from '@/store/seed/seedEmailTemplates';

/** The demo data the app starts with when nothing is saved yet (nobody signed in, all other lists empty). */
export function createInitialState(): AppState {
  const users = createSeedUsers();
  const workflows = createSeedWorkflows();
  const leads = createSeedLeads(users, workflows);

  return {
    currentUserId: '',
    users, teams: createSeedTeams(), workflows, leads,
    meetings: [], updates: [], tasks: [],
    emailTemplates: createSeedEmailTemplates(),
    emailLogs: [], notifications: [], sales: [],
  };
}
