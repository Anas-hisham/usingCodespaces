/** Lead code rules: how a lead code is cleaned, compared and validated. */
export const MAX_ROWS_PER_IMPORT = 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]/g;

/** Trim, drop invisible characters / surrounding quotes (Excel and web pages add them) and collapse spaces. This is what gets stored. */
export const cleanLeadCode = (code: string) =>
  code.replace(INVISIBLE, '').normalize('NFKC').trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim().replace(/\s+/g, ' ');

/**
 * The identity of a lead = its letters and digits, in the same order. Upper / lower case does not matter.
 *   "acd123" = "AcD123" = "ACD-123" = "acd 123"      (same letters and digits, same order)
 *   "LD-001" is NOT "LD-1"  and  "ABC12" is NOT "ABC21"  (different digits / different order)
 * The campaign, company name, phone and email are NOT part of the identity.
 */
export const normalizeLeadCode = (code: string) => cleanLeadCode(code).toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');

/** A lead id is accepted only when it is made of letters and digits and nothing else (no spaces, dashes or symbols). */
export const isValidLeadCode = (code: string) => /^[\p{L}\p{N}]+$/u.test(cleanLeadCode(code));

export const isValidEmail = (email: string) => EMAIL_RE.test(email);
