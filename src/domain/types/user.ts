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
}
