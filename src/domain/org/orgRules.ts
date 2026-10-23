/** Who belongs where: teams, managers, Quality and the line of business (LOB) of everybody. Pure functions. */
import type { Team, User } from '@/domain/types';

/** The lines of business. Every Operation Manager runs one of them. */
export const LOB_CODES = ['REG', 'DJ'] as const;

/** The team a Team Leader leads, or an agent sits in. */
export function teamOfPerson(teams: Team[], u: User): Team | undefined {
  if (u.role === 'team_leader') return teams.find(t => t.leaderId === u.id);
  if (u.role === 'agent') return teams.find(t => t.agentIds.includes(u.id));
  return undefined;
}

/** The LOB of a team = the LOB of its Operation Manager ('' when it has no manager). */
export const lobOfTeam = (users: User[], team: Team | undefined): string =>
  users.find(u => u.id === team?.managerId)?.lob ?? '';

/** The LOB of a person ('' when unknown: the Admin, or a team that has no manager at the moment). */
export function lobOf(users: User[], teams: Team[], u: User): string {
  if (u.role === 'operation_manager' || u.role === 'quality') return u.lob ?? '';
  return lobOfTeam(users, teamOfPerson(teams, u));
}

export const teamLeaderOf = (users: User[], teams: Team[], u: User): User | undefined =>
  users.find(x => x.id === teamOfPerson(teams, u)?.leaderId);

/** The Operation Manager above a person. Quality has no team: its manager is the OM of its LOB. */
export function managerOf(users: User[], teams: Team[], u: User): User | undefined {
  if (u.role === 'quality') return u.lob ? users.find(x => x.role === 'operation_manager' && x.lob === u.lob) : undefined;
  return users.find(x => x.id === teamOfPerson(teams, u)?.managerId);
}

/** The Quality members an agent may be given: the same LOB only. */
export function qualityChoicesFor(users: User[], teams: Team[], agent: User): User[] {
  const lob = lobOf(users, teams, agent);
  return lob ? users.filter(q => q.role === 'quality' && q.lob === lob) : [];
}

export const agentsOfQuality = (users: User[], quality: User): User[] =>
  users.filter(u => u.role === 'agent' && u.qualityId === quality.id);
