/** Meeting time helpers. */
import type { Meeting } from '@/domain/types';

export const meetingStartMs = (m: Pick<Meeting, 'date' | 'time'>) => new Date(`${m.date}T${m.time}:00`).getTime();
