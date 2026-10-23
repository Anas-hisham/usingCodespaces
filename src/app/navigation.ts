/** Which pages exist, who may open them, and where each role lands after signing in. */
import { BarChart3, Bell, Calendar, CheckCircle2, Database, Flag, Inbox, LayoutDashboard, Lightbulb, ListOrdered, Mail, Network, Trophy, UserPlus, Users } from 'lucide-react';
import type { User } from '@/domain/types';

export type PageId = 'adminleads' | 'users' | 'campaigns' | 'dashboard' | 'workqueue' | 'calendar' | 'leads' | 'updates' | 'tasks' | 'emails' | 'sales' | 'analytics' | 'teams' | 'tips' | 'escalations';

export interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  roles: User['role'][];
}

const ALL_ROLES: User['role'][] = ['operation_manager', 'team_leader', 'agent'];
/** Pages Quality shares with the managers: it gets meetings, updates and tasks (the OM can ask Quality for a task). */
const WITH_QUALITY: User['role'][] = [...ALL_ROLES, 'quality'];

export const NAV_ITEMS: NavItem[] = [
  { id: 'adminleads', label: 'Lead Pool', icon: Database, roles: ['admin'] },
  { id: 'campaigns', label: 'Campaigns', icon: ListOrdered, roles: ['admin'] },
  { id: 'users', label: 'Create User', icon: UserPlus, roles: ['admin'] },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['operation_manager', 'team_leader', 'agent'] },
  { id: 'teams', label: 'Teams', icon: Network, roles: ['admin', ...ALL_ROLES, 'quality'] },
  { id: 'workqueue', label: 'Work Queue', icon: Inbox, roles: ['agent'] },
  { id: 'calendar', label: 'Calendar', icon: Calendar, roles: WITH_QUALITY },
  { id: 'leads', label: 'Leads', icon: Users, roles: ['agent'] },
  { id: 'sales', label: 'Sales', icon: Trophy, roles: [...ALL_ROLES, 'quality'] },
  { id: 'updates', label: 'Team Updates', icon: Bell, roles: WITH_QUALITY },
  { id: 'tasks', label: 'Tasks', icon: CheckCircle2, roles: WITH_QUALITY },
  { id: 'escalations', label: 'Escalations', icon: Flag, roles: ['admin', ...ALL_ROLES, 'quality'] },
  { id: 'tips', label: 'Tips', icon: Lightbulb, roles: ['agent', 'quality'] },
  { id: 'emails', label: 'Email Center', icon: Mail, roles: ALL_ROLES },
];

/** The page a person lands on, and the fallback when the current page is not allowed for their role. */
export const homePageFor = (role: User['role']): PageId => (role === 'quality' ? 'sales' : role === 'admin' ? 'adminleads' : 'dashboard');

export const canOpenPage = (page: PageId, role: User['role']) =>
  NAV_ITEMS.some(i => i.id === page && i.roles.includes(role));
