/** Upgrades sales saved by older versions of the app. */
import { SALE_TYPES } from '@/domain/sales/saleTypes';
import type { Sale, SaleType } from '@/domain/types';

/** Old saved sales used 'new' / 'upsell' / 'renewal' and had a "product" text: convert them to the current shape. */
export function migrateSale(x: Sale & { product?: string }): Sale {
  const legacy: Record<string, SaleType> = { new: 'Activation', upsell: 'Activation', renewal: 'Retention' };
  const valid = SALE_TYPES.some(t => t.value === x.saleType);
  const { product: _product, ...rest } = x;
  return { ...rest, saleType: valid ? x.saleType : (legacy[x.saleType as string] ?? 'Activation') };
}
