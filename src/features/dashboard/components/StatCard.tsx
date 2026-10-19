import { Phone } from 'lucide-react';

export function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Phone; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600 mt-0.5">{label}</div>
    </div>
  );
}
