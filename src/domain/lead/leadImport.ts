/** Pasting leads in bulk: turns spreadsheet text into accepted rows + rejected rows with a reason. */
import { MAX_ROWS_PER_IMPORT, cleanLeadCode, isValidEmail, isValidLeadCode, normalizeLeadCode } from '@/domain/lead/leadCode';

export interface ExistingLead { leadCode: string; agentId: string }

export interface ParsedLeadRow {
  line: number;          // 1-based line number in what the user pasted
  raw: string;
  leadCode: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface RejectedRow {
  line: number;
  raw: string;
  leadCode: string;
  reason: string;
}

export interface ParseResult { accepted: ParsedLeadRow[]; rejected: RejectedRow[] }

/**
 * A pasted spreadsheet row is tab separated. But in a plain text box people type, and there the Tab key moves the
 * focus instead of typing a tab - so a line WITHOUT a tab is also understood:
 *   "AB12 Nile Trading"    -> id "AB12", company "Nile Trading"   (the id is the first word)
 *   "AB12, Nile, Ali, ..." -> comma / semicolon separated columns
 */
function splitPastedRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(p => p.trim());
  if (/[,;]/.test(line)) return line.split(/[,;]/).map(p => p.trim());
  const m = line.trim().match(/^(\S+)\s+(.*)$/);
  return m ? [m[1], m[2].trim()] : [line.trim()];
}

/**
 * Turns pasted spreadsheet text (tab separated) into valid rows + rejected rows WITH a reason.
 * Columns: Lead Code | Company | Contact | Phone | Email
 *  - a header line ("Lead Code ...") is ignored
 *  - the code must be new for the whole system (every agent), not only inside the paste
 *  - an email, when given, must look like an email
 */
export function parseLeadRows(
  text: string,
  existing: ExistingLead[],
  currentAgentId: string,
  agentNameOf: (agentId: string) => string,
): ParseResult {
  const owner = new Map<string, string>();                       // normalized code -> agentId
  for (const l of existing) owner.set(normalizeLeadCode(l.leadCode), l.agentId);

  const seenInPaste = new Set<string>();
  const accepted: ParsedLeadRow[] = [];
  const rejected: RejectedRow[] = [];

  const lines = text.split(/\r?\n/);
  let dataRows = 0;
  lines.forEach((rawLine, i) => {
    if (!rawLine.trim()) return;
    const line = i + 1;
    const parts = splitPastedRow(rawLine);
    const code = cleanLeadCode(parts[0] ?? '');

    // header row copied together with the data
    if (dataRows === 0 && accepted.length === 0 && rejected.length === 0 && /^(lead\s*)?(code|id)$/i.test(code)) return;

    const reject = (reason: string) => rejected.push({ line, raw: rawLine, leadCode: code, reason });

    dataRows++;
    if (dataRows > MAX_ROWS_PER_IMPORT) return reject(`Over the limit of ${MAX_ROWS_PER_IMPORT} leads per import`);
    if (!code) return reject('Lead code is missing');

    if (!isValidLeadCode(code)) return reject('Lead ID must contain letters and numbers only');

    const key = normalizeLeadCode(code);
    if (seenInPaste.has(key)) return reject('Repeated in this paste');
    const ownerId = owner.get(key);
    if (ownerId !== undefined) {
      return reject(ownerId === currentAgentId
        ? 'Already in your leads'
        : `Already assigned to ${agentNameOf(ownerId) || 'another agent'}`);
    }

    const email = parts[4] ?? '';
    if (email && !isValidEmail(email)) return reject(`Invalid email "${email}"`);

    seenInPaste.add(key);
    accepted.push({
      line, raw: rawLine, leadCode: code,
      companyName: parts[1] || code,
      contactName: parts[2] || '',
      phone: parts[3] || '',
      email,
    });
  });

  return { accepted, rejected };
}

/** Keeps only leads whose code is not taken yet (reducer-level safety net, same rule as above). */
export function dropTakenLeadCodes<T extends { leadCode: string }>(incoming: T[], existing: { leadCode: string }[]): T[] {
  const taken = new Set(existing.map(l => normalizeLeadCode(l.leadCode)));
  const out: T[] = [];
  for (const l of incoming) {
    const k = normalizeLeadCode(l.leadCode);
    if (!isValidLeadCode(l.leadCode) || taken.has(k)) continue;
    taken.add(k);
    out.push(l);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shared lead pool
//  - only the Admin creates leads; they go to the pool (agentId = '')
//  - an agent TAKES leads from the pool by lead id; from then on the lead is theirs
//  - a lead the agent removes keeps its history and goes back to the pool (its id is free again)
// ---------------------------------------------------------------------------

export interface ParsedAdminRow extends ParsedLeadRow { campaignCode: string }

export interface ParseAdminResult { accepted: ParsedAdminRow[]; rejected: RejectedRow[] }

/**
 * Admin paste: Lead ID | Company | Contact | Phone | Email | Campaign (code or name; optional, falls back to the default).
 * Every id is checked against ALL leads of the system (an agent's, a pool lead, or a removed lead that is back in the pool).
 */
export function parseAdminRows(
  text: string,
  existingCodes: { leadCode: string }[],
  workflows: { campaignCode: string; name: string }[],
  defaultCampaign: string,
): ParseAdminResult {
  const taken = new Set(existingCodes.map(l => normalizeLeadCode(l.leadCode)));
  const seen = new Set<string>();
  const accepted: ParsedAdminRow[] = [];
  const rejected: RejectedRow[] = [];
  const campaignOf = (v: string) => {
    const q = v.trim().toLowerCase();
    return workflows.find(w => w.campaignCode.toLowerCase() === q || w.name.toLowerCase() === q)?.campaignCode;
  };

  let dataRows = 0;
  text.split(/\r?\n/).forEach((rawLine, i) => {
    if (!rawLine.trim()) return;
    const line = i + 1;
    const parts = splitPastedRow(rawLine);
    const code = cleanLeadCode(parts[0] ?? '');
    if (dataRows === 0 && /^(lead\s*)?(code|id)$/i.test(code)) return;
    const reject = (reason: string) => rejected.push({ line, raw: rawLine, leadCode: code, reason });

    dataRows++;
    if (dataRows > MAX_ROWS_PER_IMPORT) return reject(`Over the limit of ${MAX_ROWS_PER_IMPORT} leads per import`);
    if (!code) return reject('Lead code is missing');
    if (!isValidLeadCode(code)) return reject('Lead ID must contain letters and numbers only');
    const key = normalizeLeadCode(code);
    if (seen.has(key)) return reject('Repeated in this paste');
    if (taken.has(key)) return reject('This lead ID already exists');
    const email = parts[4] ?? '';
    if (email && !isValidEmail(email)) return reject(`Invalid email "${email}"`);
    const campaignCell = (parts[5] ?? '').trim();
    const campaignCode = campaignCell ? campaignOf(campaignCell) : defaultCampaign;
    if (!campaignCode) return reject(`Unknown campaign "${campaignCell}"`);

    seen.add(key);
    accepted.push({
      line, raw: rawLine, leadCode: code, campaignCode,
      companyName: parts[1] || code, contactName: parts[2] || '', phone: parts[3] || '', email,
    });
  });
  return { accepted, rejected };
}
