import type { Team } from '@/domain/types';

/** The demo teams: Ahmed manages 4 teams (so the Teams page shows a 4th team on a new row), Layla manages 2. */
export function createSeedTeams(): Team[] {
  return [
    { id: 't-1', name: 'Team Alpha', leaderId: 'u-tl1', agentIds: ['u-a1', 'u-a2', 'u-a5', 'u-a6'], managerId: 'u-om' },
    { id: 't-2', name: 'Team Beta', leaderId: 'u-tl2', agentIds: ['u-a3', 'u-a4', 'u-a7', 'u-a8'], managerId: 'u-om' },
    { id: 't-3', name: 'Team Gamma', leaderId: 'u-tl3', agentIds: ['u-a9', 'u-a10', 'u-a11'], managerId: 'u-om' },
    { id: 't-4', name: 'Team Delta', leaderId: 'u-tl4', agentIds: ['u-a12', 'u-a13', 'u-a14', 'u-a15'], managerId: 'u-om' },
    { id: 't-5', name: 'Team Epsilon', leaderId: 'u-tl5', agentIds: ['u-a16', 'u-a17', 'u-a18'], managerId: 'u-om2' },
    { id: 't-6', name: 'Team Zeta', leaderId: 'u-tl6', agentIds: ['u-a19', 'u-a20', 'u-a21'], managerId: 'u-om2' },
  ];
}
