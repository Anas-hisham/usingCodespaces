/** Who can sign in and what role they have. */
export type UserRole = 'admin' | 'operation_manager' | 'team_leader' | 'agent' | 'quality';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  teamId?: string;
  initials: string;
  color: string;
  dailyCallTarget: number;
  /** Line of business (e.g. REG, DJ). Set on Operation Managers and Quality. Teams, Team Leaders and agents take the LOB of their manager. */
  lob?: string;
  /** Agents only: the Quality member who follows this agent (always one of the same LOB). */
  qualityId?: string;
  /** Set only on accounts the Admin creates from the Create User page. The demo people have none (any password signs them in). Prototype only: stored as plain text in localStorage, a real backend must store a hash. */
  password?: string;
}
