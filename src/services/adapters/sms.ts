import { logger } from '../../lib/logger.js';

export interface SmsAdapter {
  send(input: { to: string; body: string }): Promise<{ messageId: string }>;
}

class SmsService implements SmsAdapter {
  private adapter: SmsAdapter;
  
  constructor() {
    const useMock = process.env.USE_MOCK_ADAPTERS === 'true';
    this.adapter = useMock ? new SmsMock() : new SmsMock(); // TODO: Replace with real adapter
  }
  
  async send(input: { to: string; body: string }): Promise<{ messageId: string }> {
    logger.info('Sending SMS', { to: input.to });
    return this.adapter.send(input);
  }
}

class SmsMock implements SmsAdapter {
  async send(input: { to: string; body: string }): Promise<{ messageId: string }> {
    logger.info('[MOCK] SMS sent', {
      to: input.to,
      bodyLength: input.body.length
    });
    return { messageId: `sms_${Date.now()}` };
  }
}

export const smsService = new SmsService();