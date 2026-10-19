import { SALE_TYPES, countByType } from '@/domain/sales/saleTypes';
import type { Sale } from '@/domain/types';

export function SaleTypeChips({ sales }: { sales: Sale[] }) {
  const counts = countByType(sales);
  return (
    <div className="flex flex-wrap gap-1.5">
      {SALE_TYPES.map(t => (
        <span
          key={t.value}
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${counts[t.value] > 0 ? t.chip : 'bg-slate-50 text-slate-500'}`}
        >
          {t.label} {counts[t.value]}
        </span>
      ))}
    </div>
  );
}
