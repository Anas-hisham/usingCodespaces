/** Which pages exist, who may open them, and where each role lands after signing in. */
import { BarChart3, Bell, Calendar, CheckCircle2, Database, Inbox, LayoutDashboard, Mail, Network, Trophy, Users } from 'lucide-react';
import type { User } from '@/domain/types';

export type PageId = 'adminleads' | 'dashboard' | 'workqueue' | 'calendar' | 'leads' | 'updates' | 'tasks' | 'emails' | 'sales' | 'analytics' | 'teams';

export interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  roles: User['role'][];
  badge?: number;
}

const ALL_ROLES: User['role'][] = ['operation_manager', 'team_leader', 'agent'];

export const NAV_ITEMS: NavItem[] = [
  { id: 'adminleads', label: 'Lead Pool', icon: Database, roles: ['admin'] },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['operation_manager', 'team_leader', 'agent'] },
  { id: 'teams', label: 'Teams', icon: Network, roles: ['admin', ...ALL_ROLES, 'quality'] },
  { id: 'workqueue', label: 'Work Queue', icon: Inbox, roles: ['agent'] },
  { id: 'calendar', label: 'Calendar', icon: Calendar, roles: ALL_ROLES },
  { id: 'leads', label: 'Leads', icon: Users, roles: ['agent'] },
  { id: 'sales', label: 'Sales', icon: Trophy, roles: [...ALL_ROLES, 'quality'] },
  { id: 'updates', label: 'Team Updates', icon: Bell, roles: ALL_ROLES },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2, roles: ALL_ROLES },
  { id: 'emails', label: 'Email Center', icon: Mail, roles: ALL_ROLES },
];

/** The page a person lands on, and the fallback when the current page is not allowed for their role. */
export const homePageFor = (role: User['role']): PageId => (role === 'quality' ? 'sales' : role === 'admin' ? 'adminleads' : 'dashboard');

export const canOpenPage = (page: PageId, role: User['role']) =>
  NAV_ITEMS.some(i => i.id === page && i.roles.includes(role));
