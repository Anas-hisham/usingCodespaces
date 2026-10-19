import type { GroupRow } from '@/domain/analytics/performanceMetrics';

export function GroupPerformanceTable({ rows, first }: { rows: GroupRow[]; first: string }) {
  const th = 'px-3 py-2.5 text-left text-xs font-semibold text-slate-600 whitespace-nowrap';
  const td = 'px-3 py-2.5 text-sm text-slate-700 whitespace-nowrap';
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-slate-100">
          <tr>
            <th className={th}>{first}</th><th className={th}>Leads</th><th className={th}>Calls</th>
            <th className={th}>Answer rate</th><th className={th}>Reach rate</th><th className={th}>Reached leads</th>
            <th className={th}>Sold leads</th><th className={th}>Conversion</th><th className={th}>Reached → sale</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} className="border-b border-slate-100 last:border-0">
              <td className={`${td} font-medium text-slate-900`}>{r.label}</td>
              <td className={td}>{r.leads}</td><td className={td}>{r.calls}</td>
              <td className={td}>{r.answerRate}%</td><td className={td}>{r.reachRate}%</td><td className={td}>{r.reached}</td>
              <td className={td}>{r.sold}</td><td className={td}>{r.conversion}%</td><td className={td}>{r.reachToSale}%</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td className={td} colSpan={9}>No data for this selection.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
