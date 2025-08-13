import { Deal } from '../../domain/models.js';
import { logger } from '../../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface ZohoAdapter {
  getDeal(dealId: string): Promise<Deal>;
  updateDealStage(dealId: string, stage: string): Promise<void>;
  attachFile(dealId: string, fileUrl: string, filename: string): Promise<void>;
}

class ZohoService implements ZohoAdapter {
  private adapter: ZohoAdapter;
  
  constructor() {
    const useMock = process.env.USE_MOCK_ADAPTERS === 'true';
    this.adapter = useMock ? new ZohoMock() : new ZohoMock(); // TODO: Replace with real adapter
  }
  
  async getDeal(dealId: string): Promise<Deal> {
    return this.adapter.getDeal(dealId);
  }
  
  async updateDealStage(dealId: string, stage: string): Promise<void> {
    return this.adapter.updateDealStage(dealId, stage);
  }
  
  async attachFile(dealId: string, fileUrl: string, filename: string): Promise<void> {
    return this.adapter.attachFile(dealId, fileUrl, filename);
  }
}

class ZohoMock implements ZohoAdapter {
  private deals = new Map<string, Deal>();
  
  constructor() {
    // Create some mock deals
    this.deals.set('deal_001', {
      id: 'deal_001',
      companyName: '株式会社サンプル',
      contactName: '田中太郎',
      email: 'tanaka@sample.co.jp',
      phone: '090-1234-5678',
      amount: 1000000,
      stage: 'Qualification',
      territory: 'tokyo',
      assignedTo: 'sales_001',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  async getDeal(dealId: string): Promise<Deal> {
    const deal = this.deals.get(dealId);
    if (!deal) {
      // Create a new mock deal if not found
      const newDeal: Deal = {
        id: dealId,
        companyName: `会社_${dealId}`,
        contactName: `担当者_${dealId}`,
        email: `contact_${dealId}@example.com`,
        phone: '090-0000-0000',
        amount: Math.floor(Math.random() * 5000000) + 500000,
        stage: 'Qualification',
        territory: 'tokyo',
        assignedTo: 'sales_001',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.deals.set(dealId, newDeal);
      return newDeal;
    }
    
    logger.info('[MOCK] Deal retrieved', { dealId, companyName: deal.companyName });
    return deal;
  }
  
  async updateDealStage(dealId: string, stage: string): Promise<void> {
    const deal = this.deals.get(dealId);
    if (deal) {
      deal.stage = stage;
      deal.updatedAt = new Date();
      logger.info('[MOCK] Deal stage updated', { dealId, stage });
    }
  }
  
  async attachFile(dealId: string, fileUrl: string, filename: string): Promise<void> {
    logger.info('[MOCK] File attached to deal', { dealId, fileUrl, filename });
  }
}

export const zohoService = new ZohoService();