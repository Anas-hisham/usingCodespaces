/** The rules for a new account the Admin creates. Pure functions: the form shows the message, and the store refuses the same input. */
import { LOB_CODES, lobOfTeam } from '@/domain/org/orgRules';
import type { Team, User } from '@/domain/types';

export const MIN_PASSWORD_LENGTH = 6;
export const DEFAULT_DAILY_CALL_TARGET = 90;

/** The roles the Admin can create here (the Admin account is not created from this page). */
export type CreatableRole = 'operation_manager' | 'team_leader' | 'agent' | 'quality';

interface Common { name: string; email: string; password: string }
export type NewUserInput =
  | (Common & { role: 'operation_manager'; lob: string })
  | (Common & { role: 'quality'; lob: string })
  /** A Team Leader always comes with a NEW team of his own. managerId '' = the team has no Operation Manager for now. */
  | (Common & { role: 'team_leader'; teamName: string; managerId: string })
  /** An agent joins an existing team. qualityId '' = no Quality for now. */
  | (Common & { role: 'agent'; teamId: string; qualityId: string; dailyCallTarget: number });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The first thing wrong with the input, or null when the account can be created. */
export function validateNewUser(users: User[], teams: Team[], input: NewUserInput): string | null {
  if (!input.name.trim()) return 'Enter the full name.';
  if (!EMAIL_RE.test(input.email.trim())) return 'Enter a valid email address.';
  if (users.some(u => sameText(u.email, input.email))) return 'This email already belongs to another account.';
  if (input.password.length < MIN_PASSWORD_LENGTH) return `The password needs at least ${MIN_PASSWORD_LENGTH} characters.`;

  if (input.role === 'operation_manager' || input.role === 'quality') {
    if (!(LOB_CODES as readonly string[]).includes(input.lob)) return 'Choose the line of business (LOB).';
  } else if (input.role === 'team_leader') {
    if (!input.teamName.trim()) return 'Enter the name of the new team.';
    if (teams.some(t => sameText(t.name, input.teamName))) return 'A team with this name already exists.';
    if (input.managerId && !users.some(u => u.id === input.managerId && u.role === 'operation_manager')) return 'Choose a valid Operation Manager.';
  } else {
    const team = teams.find(t => t.id === input.teamId);
    if (!team) return 'Choose the team of the agent.';
    if (input.qualityId && !qualityChoicesForTeam(users, teams, team.id).some(q => q.id === input.qualityId)) {
      return 'The Quality must be of the same line of business as the team.';
    }
    if (!Number.isInteger(input.dailyCallTarget) || input.dailyCallTarget < 1 || input.dailyCallTarget > 500) return 'The daily call target must be between 1 and 500.';
  }
  return null;
}

/** The Quality members an agent of this team may be given (the LOB of the team's manager). Empty when the team has no manager. */
export function qualityChoicesForTeam(users: User[], teams: Team[], teamId: string): User[] {
  const team = teams.find(t => t.id === teamId);
  const lob = lobOfTeam(users, team);
  return lob ? users.filter(q => q.role === 'quality' && q.lob === lob) : [];
}

/** username = the part of the email before the @, made unique with a number when somebody already has it. */
export function usernameFromEmail(users: User[], email: string): string {
  const base = email.trim().toLowerCase().split('@')[0].replace(/[^a-z0-9._-]/g, '') || 'user';
  let name = base;
  for (let i = 2; users.some(u => u.username === name); i++) name = `${base}${i}`;
  return name;
}

export const initialsOfName = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_COLORS = ['#1e40af', '#0d9488', '#0891b2', '#be185d', '#4d7c0f', '#b45309', '#6d28d9', '#e11d48', '#0284c7', '#16a34a', '#c026d3', '#0f766e'];
export const avatarColorFor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length];
