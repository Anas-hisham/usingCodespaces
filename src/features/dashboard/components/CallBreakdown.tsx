import { Phone, PhoneOutgoing, UserCheck, Voicemail } from 'lucide-react';
import type { Lead } from '@/domain/types';
import { countCallsByType, countCallsMadeToday } from '@/features/dashboard/dashboardCallStats';

export function CallBreakdown({ callLogs, todayOnly }: { callLogs: Lead['callLogs']; todayOnly?: boolean }) {
  const stats = todayOnly ? countCallsMadeToday(callLogs) : countCallsByType(callLogs);
  const items = [
    { label: 'Total Calls', value: stats.total, color: 'bg-blue-50 text-blue-600', icon: Phone },
    { label: 'Discovery', value: stats.discovery, color: 'bg-emerald-50 text-emerald-600', icon: UserCheck },
    { label: 'LVM', value: stats.lvm, color: 'bg-amber-50 text-amber-600', icon: Voicemail },
    { label: 'NVM', value: stats.nvm, color: 'bg-amber-50 text-amber-600', icon: PhoneOutgoing },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${item.color}`}>
            <item.icon className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{item.value}</div>
          <div className="text-sm text-slate-600 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
