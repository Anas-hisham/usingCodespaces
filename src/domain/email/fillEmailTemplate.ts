/** Fills [Name], [Company Name] and [Agent Name] in an email template. */
import type { Lead } from '@/domain/types';

/** Fills [Name], [Company Name] and [Agent Name] in an email template. */
export const fillEmailTemplate = (text: string, lead: Lead, agentName: string) => text
  .replace(/\[Name\]/g, lead.contactName || 'there')
  .replace(/\[Company Name\]/g, lead.companyName)
  .replace(/\[Agent Name\]/g, agentName);
