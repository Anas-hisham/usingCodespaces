/** Email templates and the log of every email sent. */
export interface EmailTemplate {
  id: string;
  name: string;
  type: 'discovery' | 'no_response';
  subject: string;
  body: string;
}

export interface EmailLog {
  id: string;
  leadId: string;
  leadName: string;
  to: string;
  subject: string;
  body: string;
  templateType: 'discovery' | 'no_response' | 'custom';
  sentAt: string;
  sentBy: string;
  sentByName: string;
  auto?: boolean;            // sent by the system when the email touch point came due
  idempotencyKey?: string;   // the same touch point can never produce two automatic emails
}
