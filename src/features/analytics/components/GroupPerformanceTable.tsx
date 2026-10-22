import type { GroupRow } from '@/domain/analytics/performanceMetrics';

/** Calls and their results per campaign / agent (no lead counts). */
export function GroupPerformanceTable({ rows, first }: { rows: GroupRow[]; first: string }) {
  const th = 'px-3 py-2.5 text-left text-xs font-semibold text-slate-600 whitespace-nowrap';
  const td = 'px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap';
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px]">
        <thead className="border-b border-slate-100">
          <tr>
            <th className={th}>{first}</th><th className={th}>Calls</th>
            <th className={th}>NVM</th><th className={th}>LVM</th><th className={th}>Discovery</th>
            <th className={th}>Answer rate</th><th className={th}>Reach rate</th><th className={th}>Sales</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-slate-100 last:border-0">
              <td className={`${td} font-medium text-slate-900`}>{r.label}</td>
              <td className={td}>{r.calls}</td>
              <td className={td}>{r.nvm}</td><td className={td}>{r.lvm}</td><td className={td}>{r.discovery}</td>
              <td className={td}>{r.answerRate}%</td><td className={td}>{r.reachRate}%</td><td className={td}>{r.sales}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className={td} colSpan={8}>No data for this selection.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
