/** Call counting helpers for the dashboards. */
import type { Lead } from '@/domain/types';

export function isTodayDate(dateStr: string) {
  return dateStr.split('T')[0] === new Date().toISOString().split('T')[0];
}

export function countCallsByType(callLogs: Lead['callLogs'], filterFn?: (cl: Lead['callLogs'][0]) => boolean) {
  const logs = filterFn ? callLogs.filter(filterFn) : callLogs;
  return {
    nvm: logs.filter(cl => cl.type === 'nvm').length,
    lvm: logs.filter(cl => cl.type === 'lvm').length,
    discovery: logs.filter(cl => cl.type === 'discovery').length,
    total: logs.length,
  };
}

export function countCallsMadeToday(callLogs: Lead['callLogs']) {
  return countCallsByType(callLogs, cl => isTodayDate(cl.timestamp));
}
