import { logger } from '../lib/logger.js';
import { salesFlow } from '../flows/sales.js';
import { trainingFlow } from '../flows/training.js';
import { Event } from '../domain/models.js';

class Dispatcher {
  private processedEvents = new Map<string, Date>();
  
  async handle(event: Event): Promise<void> {
    if (this.isProcessed(event.id)) {
      logger.warn('Duplicate event detected, skipping', { eventId: event.id });
      return;
    }
    
    this.markAsProcessed(event.id);
    
    try {
      logger.info('Processing event', { 
        eventId: event.id, 
        eventType: event.type,
        timestamp: new Date().toISOString()
      });
      
      if (event.type.startsWith('Sales.')) {
        await salesFlow.process(event);
      } else if (event.type.startsWith('Training.')) {
        await trainingFlow.process(event);
      } else {
        logger.warn('Unknown event type', { eventType: event.type });
      }
      
      logger.info('Event processed successfully', { eventId: event.id });
    } catch (error) {
      logger.error('Error processing event', { eventId: event.id, error });
      this.unmarkAsProcessed(event.id);
      throw error;
    }
  }
  
  private isProcessed(eventId: string): boolean {
    const processed = this.processedEvents.get(eventId);
    if (!processed) return false;
    
    const hoursSinceProcessed = (Date.now() - processed.getTime()) / (1000 * 60 * 60);
    if (hoursSinceProcessed > 24) {
      this.processedEvents.delete(eventId);
      return false;
    }
    
    return true;
  }
  
  private markAsProcessed(eventId: string): void {
    this.processedEvents.set(eventId, new Date());
  }
  
  private unmarkAsProcessed(eventId: string): void {
    this.processedEvents.delete(eventId);
  }
  
  cleanupOldEvents(): void {
    const now = Date.now();
    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      const hoursSinceProcessed = (now - timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSinceProcessed > 24) {
        this.processedEvents.delete(eventId);
      }
    }
  }
}

export const dispatcher = new Dispatcher();