import type { Team } from '@/domain/types';

/** The demo teams (each has one leader, two agents and the same operation manager). */
export function createSeedTeams(): Team[] {
  return [
    { id: 't-1', name: 'Team Alpha', leaderId: 'u-tl1', agentIds: ['u-a1', 'u-a2'], managerId: 'u-om' },
    { id: 't-2', name: 'Team Beta', leaderId: 'u-tl2', agentIds: ['u-a3', 'u-a4'], managerId: 'u-om' },
  ];
}
