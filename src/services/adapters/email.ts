import { EmailDraft } from '../../domain/models.js';
import { logger } from '../../lib/logger.js';
import { emailMock } from '../mocks/email.mock.js';

export interface EmailAdapter {
  draft(input: EmailDraft): Promise<{ draftId: string }>;
  send(draftId: string): Promise<void>;
  schedule(draft: EmailDraft, sendAt: Date): Promise<{ scheduledId: string }>;
}

class EmailService implements EmailAdapter {
  private adapter: EmailAdapter;
  
  constructor() {
    const useMock = process.env.USE_MOCK_ADAPTERS === 'true';
    this.adapter = useMock ? emailMock : emailMock; // TODO: Replace with real adapter
  }
  
  async draft(input: EmailDraft): Promise<{ draftId: string }> {
    logger.info('Creating email draft', { 
      to: input.to,
      subject: input.subject 
    });
    return this.adapter.draft(input);
  }
  
  async send(draftId: string): Promise<void> {
    logger.info('Sending email', { draftId });
    return this.adapter.send(draftId);
  }
  
  async schedule(draft: EmailDraft, sendAt: Date): Promise<{ scheduledId: string }> {
    logger.info('Scheduling email', { 
      to: draft.to,
      sendAt: sendAt.toISOString() 
    });
    return this.adapter.schedule(draft, sendAt);
  }
}

export const emailService = new EmailService();