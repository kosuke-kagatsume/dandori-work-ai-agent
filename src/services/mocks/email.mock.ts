import { EmailAdapter } from '../adapters/email.js';
import { EmailDraft } from '../../domain/models.js';
import { logger } from '../../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';

class EmailMock implements EmailAdapter {
  private drafts = new Map<string, EmailDraft>();
  private scheduled = new Map<string, { draft: EmailDraft; sendAt: Date }>();
  
  async draft(input: EmailDraft): Promise<{ draftId: string }> {
    const draftId = `draft_${uuidv4()}`;
    this.drafts.set(draftId, input);
    
    logger.info('[MOCK] Email draft created', {
      draftId,
      to: input.to,
      subject: input.subject,
      hasAttachments: !!input.attachments?.length
    });
    
    return { draftId };
  }
  
  async send(draftId: string): Promise<void> {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }
    
    logger.info('[MOCK] Email sent', {
      draftId,
      to: draft.to,
      subject: draft.subject
    });
    
    this.drafts.delete(draftId);
  }
  
  async schedule(draft: EmailDraft, sendAt: Date): Promise<{ scheduledId: string }> {
    const scheduledId = `scheduled_${uuidv4()}`;
    this.scheduled.set(scheduledId, { draft, sendAt });
    
    logger.info('[MOCK] Email scheduled', {
      scheduledId,
      to: draft.to,
      subject: draft.subject,
      sendAt: sendAt.toISOString()
    });
    
    return { scheduledId };
  }
}

export const emailMock = new EmailMock();