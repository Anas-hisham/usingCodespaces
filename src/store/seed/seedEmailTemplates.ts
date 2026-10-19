import type { EmailTemplate } from '@/domain/types';

/** The two email templates the system uses (Discovery / No Response). */
export function createSeedEmailTemplates(): EmailTemplate[] {
  return [
    { id: 'et-1', name: 'Discovery Follow-up', type: 'discovery', subject: 'Following up on our conversation', body: 'Dear [Name],\n\nThank you for your interest in our services. Following up on our recent conversation, I have attached additional details about our activation plan.\n\nBest regards,\n[Agent Name]' },
    { id: 'et-2', name: 'No Response Follow-up', type: 'no_response', subject: 'Reaching out - [Company Name]', body: 'Dear [Name],\n\nI hope this email finds you well. I tried reaching you recently regarding our services. I would love to connect at your convenience.\n\nBest regards,\n[Agent Name]' },
  ];
}
