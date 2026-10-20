/** Who may escalate whom, and to whom (see the rules below), plus the passing up and closing of an open escalation. */
import { managerOf, teamLeaderOf, teamOfPerson } from '@/domain/org/orgRules';
import type { Escalation, Team, User, UserRole } from '@/domain/types';

/**
 * Anybody in the account can be escalated, from any team or line of business. What is controlled is the POSITION of who receives it:
 * only a Team Leader, an Operation Manager or the Admin can receive an escalation, and the receiver must rank ABOVE both
 * the author and the person it is about (agent < Quality < Team Leader < Operation Manager < Admin).
 * The people closest to the case (the subject's Team Leader / manager, the author's own chain, the Admin) are listed first as "suggested".
 */
const RANK: Record<UserRole, number> = { agent: 1, quality: 2, team_leader: 3, operation_manager: 4, admin: 5 };
const CAN_RECEIVE: UserRole[] = ['team_leader', 'operation_manager', 'admin'];

const present = (list: (User | undefined)[]): User[] => list.filter((u): u is User => !!u);

export interface EscalationRecipient { user: User; reason: string }   // reason = why this person is suggested ('' when just allowed)

const recipientPool = (users: User[], author: User) =>
  users.filter(u => u.id !== author.id && CAN_RECEIVE.includes(u.role) && RANK[u.role] > RANK[author.role]);

/** Everybody the author may raise an escalation about: anyone (except himself) that at least one allowed receiver outranks. */
export function escalationSubjects(users: User[], author: User): User[] {
  const pool = recipientPool(users, author);
  return users.filter(s => s.id !== author.id && pool.some(r => r.id !== s.id && RANK[r.role] > RANK[s.role]));
}

/** Who may receive an escalation about `subject` from `author`: suggested people first (closest to the case), then the rest by position. */
export function escalationRecipients(users: User[], teams: Team[], author: User, subject: User): EscalationRecipient[] {
  if (subject.id === author.id) return [];
  const floor = Math.max(RANK[author.role], RANK[subject.role]);
  const pool = recipientPool(users, author).filter(r => r.id !== subject.id && RANK[r.role] > floor);
  const first = subject.name.split(' ')[0];
  const why = new Map<string, string>();
  const mark = (u: User | undefined, text: string) => { if (u && !why.has(u.id)) why.set(u.id, text); };
  mark(teamLeaderOf(users, teams, subject), `${first}'s Team Leader`);
  mark(managerOf(users, teams, subject), `${first}'s Operation Manager`);
  mark(teamLeaderOf(users, teams, author), 'Your Team Leader');
  mark(managerOf(users, teams, author), 'Your Operation Manager');
  mark(users.find(u => u.role === 'admin'), 'Admin');
  const inPool = new Map(pool.map(u => [u.id, u]));
  const suggested = [...why.entries()].filter(([id]) => inPool.has(id)).map(([id, reason]) => ({ user: inPool.get(id)!, reason }));
  const rest = pool.filter(u => !why.has(u.id)).sort((a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name)).map(user => ({ user, reason: '' }));
  return [...suggested, ...rest];
}

/** Where a person sits: team, Team Leader, Operation Manager, Quality, line of business. Shown next to a name so nobody has to guess who is who. */
export function reportingLine(users: User[], teams: Team[], u: User) {
  const team = teamOfPerson(teams, u);
  return {
    team,
    teamLeader: u.role === 'agent' ? teamLeaderOf(users, teams, u) : undefined,
    manager: u.role === 'admin' ? undefined : managerOf(users, teams, u),
    quality: u.role === 'agent' ? users.find(x => x.id === u.qualityId) : undefined,
  };
}

/** Who a handler can pass an open escalation to: a Team Leader -> Operation Manager or Admin, an Operation Manager -> Admin. */
export function forwardTargets(users: User[], teams: Team[], handler: User, e: Escalation): User[] {
  const admin = users.find(u => u.role === 'admin');
  const raw = handler.role === 'team_leader' ? [managerOf(users, teams, handler), admin]
    : handler.role === 'operation_manager' ? [admin] : [];
  return present(raw).filter(u => u.id !== e.aboutId && u.id !== e.authorId && u.id !== handler.id);
}

/** The Admin sees everything; everybody else sees what they wrote or what passed through their hands. The person it is about does not. */
export function canSeeEscalation(e: Escalation, me: User): boolean {
  if (me.role === 'admin') return true;
  return e.authorId === me.id || e.handlerId === me.id || e.steps.some(s => s.byId === me.id || s.toId === me.id);
}
