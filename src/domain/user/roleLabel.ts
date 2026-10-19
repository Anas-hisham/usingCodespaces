import type { UserRole } from '@/domain/types';

/** The name of a role as the person sees it on screen. */
export function roleLabel(role: UserRole | string): string {
  switch (role) {
    case 'admin': return 'Admin';
    case 'operation_manager': return 'Operation Manager';
    case 'team_leader': return 'Team Leader';
    case 'agent': return 'Agent';
    case 'quality': return 'Quality';
    default: return role;
  }
}
