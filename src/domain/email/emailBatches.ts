/** Helpers for sending many emails at once from the Email Center. */
import { MAX_ROWS_PER_IMPORT, isValidEmail } from '@/domain/lead/leadCode';
import type { Lead } from '@/domain/types';
import { effectiveCallType } from '@/domain/workflow/callClassification';

export type BatchTemplateType = 'discovery' | 'no_response';

/** Which template a lead gets: Discovery if the person was reached (call or meeting), otherwise No Response. Same rule as the automatic email. */
export const templateTypeForLead = (lead: Lead): BatchTemplateType => (effectiveCallType(lead) === 'discovery' ? 'discovery' : 'no_response');

export const TEMPLATE_TYPE_LABEL: Record<BatchTemplateType, string> = { discovery: 'Discovery', no_response: 'No Response' };

// ---------------------------------------------------------------------------
// Pasted sheet:  Email | Name | Company   (one row per line, like pasting leads)
// ---------------------------------------------------------------------------
export interface SheetEmailRow { line: number; raw: string; email: string; name: string; company: string }
export interface RejectedSheetRow { line: number; raw: string; reason: string }
export interface ParsedEmailSheet { accepted: SheetEmailRow[]; rejected: RejectedSheetRow[] }

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(p => p.trim());
  if (/[,;]/.test(line)) return line.split(/[,;]/).map(p => p.trim());
  const m = line.trim().match(/^(\S+)\s+(.*)$/);                       // "john@x.com John Smith"
  return m ? [m[1], m[2].trim()] : [line.trim()];
}

/** Turns pasted spreadsheet text into rows that can be sent + rows with a problem (and the reason). */
export function parseEmailSheet(text: string): ParsedEmailSheet {
  const accepted: SheetEmailRow[] = [];
  const rejected: RejectedSheetRow[] = [];
  const seen = new Set<string>();
  let dataRows = 0;
  text.split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const line = i + 1;
    const parts = splitRow(raw);
    const email = (parts[0] ?? '').trim();
    if (dataRows === 0 && /^e-?mail$/i.test(email)) return;           // header copied together with the data
    dataRows++;
    const reject = (reason: string) => rejected.push({ line, raw, reason });
    if (dataRows > MAX_ROWS_PER_IMPORT) return reject(`Over the limit of ${MAX_ROWS_PER_IMPORT} emails per batch`);
    if (!email) return reject('Email is missing');
    if (!isValidEmail(email)) return reject(`Invalid email "${email}"`);
    const key = email.toLowerCase();
    if (seen.has(key)) return reject('Repeated in this sheet');
    seen.add(key);
    accepted.push({ line, raw, email, name: parts[1] ?? '', company: parts[2] ?? '' });
  });
  return { accepted, rejected };
}

/** Fills [Name], [Company Name] and [Agent Name] when there is no lead record (only what the sheet gave). */
export const fillSheetTemplate = (text: string, row: { name: string; company: string }, agentName: string) => text
  .replace(/\[Name\]/g, row.name || 'there')
  .replace(/\[Company Name\]/g, row.company || 'your company')
  .replace(/\[Agent Name\]/g, agentName);
