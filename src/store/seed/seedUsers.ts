import type { User } from '@/domain/types';

/** The demo people: one of each role plus four agents in two teams. */
export function createSeedUsers(): User[] {
  return [
    { id: 'u-admin', username: 'admin', name: 'System Admin', email: 'admin@company.com', role: 'admin', initials: 'SA', color: '#475569', dailyCallTarget: 0 },
    { id: 'u-om', username: 'ahmed.om', name: 'Ahmed Hassan', email: 'om@company.com', role: 'operation_manager', initials: 'AH', color: '#1e40af', dailyCallTarget: 0 },
    { id: 'u-tl1', username: 'sara.tl', name: 'Sara Mahmoud', email: 'sara@company.com', role: 'team_leader', teamId: 't-1', initials: 'SM', color: '#0d9488', dailyCallTarget: 0 },
    { id: 'u-tl2', username: 'omar.tl', name: 'Omar Khaled', email: 'omar@company.com', role: 'team_leader', teamId: 't-2', initials: 'OK', color: '#0891b2', dailyCallTarget: 0 },
    { id: 'u-a1', username: 'mona.agent', name: 'Mona Ali', email: 'mona@company.com', role: 'agent', teamId: 't-1', initials: 'MA', color: '#e11d48', dailyCallTarget: 90 },
    { id: 'u-a2', username: 'khaled.agent', name: 'Khaled Mostafa', email: 'khaled@company.com', role: 'agent', teamId: 't-1', initials: 'KM', color: '#ea580c', dailyCallTarget: 90 },
    { id: 'u-a3', username: 'nour.agent', name: 'Nour Ibrahim', email: 'nour@company.com', role: 'agent', teamId: 't-2', initials: 'NI', color: '#0284c7', dailyCallTarget: 90 },
    { id: 'u-a4', username: 'yousef.agent', name: 'Yousef Adel', email: 'yousef@company.com', role: 'agent', teamId: 't-2', initials: 'YA', color: '#16a34a', dailyCallTarget: 90 },
    { id: 'u-q1', username: 'hana.quality', name: 'Hana Samy', email: 'hana@company.com', role: 'quality', initials: 'HS', color: '#7c3aed', dailyCallTarget: 0 },
  ];
}
