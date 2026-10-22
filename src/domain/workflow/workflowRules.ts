/** The business numbers agreed with the project owner (15-day rule, reminder time, auto-email switch). */
// ---------------------------------------------------------------------------
// Rules agreed with the project owner
// ---------------------------------------------------------------------------
/** A lead that makes no progress (same touch point, or stopped) for this many CALENDAR days leaves the agent's queue. */
export const LEAD_EXPIRY_DAYS = 15;

/** Reminder before an arranged meeting. */
export const MEETING_REMINDER_MINUTES = 15;

/** When an EMAIL touch point comes due the system sends it by itself (Discovery or No Response template). Set false to turn it off. */
export const AUTO_EMAIL_ENABLED = true;
