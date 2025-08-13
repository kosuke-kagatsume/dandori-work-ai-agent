import { Event, Deal, EmailDraft } from '../domain/models';
import { logger } from '../lib/logger';
import { emailService } from '../services/adapters/email';
import { smsService } from '../services/adapters/sms';
import { zohoService } from '../services/adapters/zoho';
import { storageService } from '../services/storage/drive';
import { templateService } from '../services/templating/render';
import { schedulerService } from '../services/scheduler/scheduler';
import { getConfig } from '../config/loadConfig';

class SalesFlow {
  async process(event: Event): Promise<void> {
    logger.info('Processing sales event', { eventType: event.type });
    
    switch (event.type) {
      case 'Sales.InitialCallLogged':
        await this.handleInitialCall(event.payload);
        break;
      
      case 'Sales.NoAnswer':
        await this.handleNoAnswer(event.payload);
        break;
      
      case 'Sales.QuoteReady':
        await this.handleQuoteReady(event.payload);
        break;
      
      case 'Sales.ContractSent':
        await this.handleContractSent(event.payload);
        break;
      
      case 'Sales.ContractSigned':
        await this.handleContractSigned(event.payload);
        break;
      
      default:
        logger.warn('Unknown sales event type', { eventType: event.type });
    }
  }
  
  private async handleInitialCall(payload: any): Promise<void> {
    logger.info('Handling initial call', { dealId: payload.dealId });
    
    const deal = await zohoService.getDeal(payload.dealId);
    
    const emailBody = await templateService.render('email/initial_contact.mj.txt', {
      companyName: deal.companyName,
      contactName: deal.contactName,
      dealAmount: deal.amount
    });
    
    const config = getConfig();
    const draft: EmailDraft = {
      to: [deal.email],
      bcc: [config.sales.defaultBcc],
      subject: `【ダンドリワーク】${deal.companyName}様 - ご提案について`,
      body: emailBody
    };
    
    const canSend = await schedulerService.canSendNow('email');
    if (canSend) {
      await emailService.draft(draft);
      logger.info('Initial contact email drafted', { dealId: payload.dealId });
    } else {
      await schedulerService.schedule(draft, 'email');
      logger.info('Initial contact email scheduled for later', { dealId: payload.dealId });
    }
  }
  
  private async handleNoAnswer(payload: any): Promise<void> {
    logger.info('Handling no answer', { dealId: payload.dealId });
    
    const deal = await zohoService.getDeal(payload.dealId);
    
    const emailBody = await templateService.render('email/follow_up_no_answer.mj.txt', {
      companyName: deal.companyName,
      contactName: deal.contactName
    });
    
    const smsBody = await templateService.render('sms/follow_up.txt', {
      companyName: deal.companyName
    });
    
    const config = getConfig();
    const emailDraft: EmailDraft = {
      to: [deal.email],
      bcc: [config.sales.defaultBcc],
      subject: `【ダンドリワーク】${deal.companyName}様 - フォローアップ`,
      body: emailBody
    };
    
    await emailService.draft(emailDraft);
    
    if (deal.phone && await schedulerService.canSendNow('sms')) {
      await smsService.send({
        to: deal.phone,
        body: smsBody
      });
    }
  }
  
  private async handleQuoteReady(payload: any): Promise<void> {
    logger.info('Handling quote ready', { dealId: payload.dealId });
    
    const deal = await zohoService.getDeal(payload.dealId);
    const config = getConfig();
    
    const quotePdf = await this.generateQuotePdf(deal);
    
    const filename = `【DW提案書】${deal.companyName}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.pdf`;
    
    const fileUrl = await storageService.upload({
      filename,
      content: quotePdf,
      contentType: 'application/pdf',
      folder: `sales/quotes/${deal.id}`
    });
    
    await zohoService.attachFile(deal.id, fileUrl, filename);
    
    const emailBody = await templateService.render('email/quote_ready.mj.txt', {
      companyName: deal.companyName,
      contactName: deal.contactName,
      quoteAmount: deal.amount,
      downloadUrl: fileUrl
    });
    
    const draft: EmailDraft = {
      to: [deal.email],
      bcc: [config.sales.defaultBcc],
      subject: `【ダンドリワーク】${deal.companyName}様 - お見積書のご送付`,
      body: emailBody,
      attachments: [{
        filename,
        content: quotePdf,
        contentType: 'application/pdf'
      }]
    };
    
    await emailService.draft(draft);
    logger.info('Quote email drafted with attachment', { dealId: payload.dealId });
  }
  
  private async handleContractSent(payload: any): Promise<void> {
    logger.info('Handling contract sent', { dealId: payload.dealId });
  }
  
  private async handleContractSigned(payload: any): Promise<void> {
    logger.info('Handling contract signed', { dealId: payload.dealId });
    
    const deal = await zohoService.getDeal(payload.dealId);
    await zohoService.updateDealStage(deal.id, 'Closed Won');
    
    logger.info('Deal marked as closed won', { dealId: payload.dealId });
  }
  
  private async generateQuotePdf(deal: Deal): Promise<Buffer> {
    return Buffer.from(`Quote for ${deal.companyName} - Amount: ${deal.amount}`);
  }
}

export const salesFlow = new SalesFlow();