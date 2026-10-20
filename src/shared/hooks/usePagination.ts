/** Splits a list into pages. The page number is clamped, so it never points past the end when the list shrinks. */
import { useEffect, useState } from 'react';

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { page: safePage, setPage, pageCount, pageItems, total: items.length, pageSize };
}
