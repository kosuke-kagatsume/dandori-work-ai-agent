import { QuietHours, EmailDraft } from '../../domain/models.js';
import { logger } from '../../lib/logger.js';
import { getConfig } from '../../config/loadConfig.js';
import * as cron from 'node-cron';

class SchedulerService {
  private scheduledTasks = new Map<string, cron.ScheduledTask>();
  private pendingEmails: Array<{ draft: EmailDraft; sendAt: Date }> = [];
  
  constructor() {
    this.startScheduler();
  }
  
  private startScheduler(): void {
    // Check for pending emails every minute
    cron.schedule('* * * * *', () => {
      this.processPendingEmails();
    });
    
    logger.info('Scheduler service started');
  }
  
  async canSendNow(channel: 'email' | 'sms' | 'chatwork'): Promise<boolean> {
    const config = getConfig();
    const now = new Date();
    const currentHour = now.getHours();
    
    let quietHours: QuietHours | undefined;
    
    if (channel === 'email') {
      quietHours = {
        channel: 'email',
        startHour: config.sales.quietHours?.email?.startHour || 20,
        endHour: config.sales.quietHours?.email?.endHour || 8,
        timezone: 'Asia/Tokyo'
      };
    } else if (channel === 'sms') {
      quietHours = {
        channel: 'sms',
        startHour: config.sales.quietHours?.sms?.startHour || 21,
        endHour: config.sales.quietHours?.sms?.endHour || 8,
        timezone: 'Asia/Tokyo'
      };
    } else if (channel === 'chatwork') {
      quietHours = {
        channel: 'chatwork',
        startHour: config.training.quietHours?.chatwork?.startHour || 20,
        endHour: config.training.quietHours?.chatwork?.endHour || 8,
        timezone: 'Asia/Tokyo'
      };
    }
    
    if (!quietHours) return true;
    
    // Check if current time is within quiet hours
    if (quietHours.startHour > quietHours.endHour) {
      // Quiet hours span midnight
      if (currentHour >= quietHours.startHour || currentHour < quietHours.endHour) {
        logger.info('Currently in quiet hours', { 
          channel, 
          currentHour,
          quietHours 
        });
        return false;
      }
    } else {
      // Quiet hours within same day
      if (currentHour >= quietHours.startHour && currentHour < quietHours.endHour) {
        logger.info('Currently in quiet hours', { 
          channel, 
          currentHour,
          quietHours 
        });
        return false;
      }
    }
    
    return true;
  }
  
  async schedule(draft: EmailDraft, channel: 'email' | 'sms' | 'chatwork'): Promise<Date> {
    const sendAt = await this.getNextAvailableTime(channel);
    
    this.pendingEmails.push({ draft, sendAt });
    
    logger.info('Message scheduled', {
      channel,
      sendAt: sendAt.toISOString(),
      to: draft.to
    });
    
    return sendAt;
  }
  
  private async getNextAvailableTime(channel: 'email' | 'sms' | 'chatwork'): Promise<Date> {
    const config = getConfig();
    const now = new Date();
    
    let quietHours: QuietHours | undefined;
    
    if (channel === 'email') {
      quietHours = {
        channel: 'email',
        startHour: config.sales.quietHours?.email?.startHour || 20,
        endHour: config.sales.quietHours?.email?.endHour || 8,
        timezone: 'Asia/Tokyo'
      };
    } else if (channel === 'sms') {
      quietHours = {
        channel: 'sms',
        startHour: config.sales.quietHours?.sms?.startHour || 21,
        endHour: config.sales.quietHours?.sms?.endHour || 8,
        timezone: 'Asia/Tokyo'
      };
    }
    
    if (!quietHours) return now;
    
    const currentHour = now.getHours();
    
    // If we're in quiet hours, schedule for the end of quiet hours
    if (quietHours.startHour > quietHours.endHour) {
      // Quiet hours span midnight
      if (currentHour >= quietHours.startHour || currentHour < quietHours.endHour) {
        const nextDay = new Date(now);
        if (currentHour >= quietHours.startHour) {
          // We're in the evening part, schedule for tomorrow morning
          nextDay.setDate(nextDay.getDate() + 1);
        }
        nextDay.setHours(quietHours.endHour, 0, 0, 0);
        return nextDay;
      }
    } else {
      // Quiet hours within same day
      if (currentHour >= quietHours.startHour && currentHour < quietHours.endHour) {
        const nextAvailable = new Date(now);
        nextAvailable.setHours(quietHours.endHour, 0, 0, 0);
        if (quietHours.endHour < currentHour) {
          // If end hour is before current hour, it means next day
          nextAvailable.setDate(nextAvailable.getDate() + 1);
        }
        return nextAvailable;
      }
    }
    
    return now;
  }
  
  private async processPendingEmails(): Promise<void> {
    const now = new Date();
    const toSend = this.pendingEmails.filter(item => item.sendAt <= now);
    
    for (const item of toSend) {
      try {
        // In real implementation, would call emailService.send()
        logger.info('Processing scheduled email', {
          to: item.draft.to,
          subject: item.draft.subject
        });
        
        // Remove from pending list
        const index = this.pendingEmails.indexOf(item);
        if (index > -1) {
          this.pendingEmails.splice(index, 1);
        }
      } catch (error) {
        logger.error('Error processing scheduled email', { error });
      }
    }
  }
  
  scheduleTask(name: string, cronExpression: string, task: () => void): void {
    if (this.scheduledTasks.has(name)) {
      this.scheduledTasks.get(name)?.stop();
    }
    
    const scheduledTask = cron.schedule(cronExpression, task);
    this.scheduledTasks.set(name, scheduledTask);
    
    logger.info('Task scheduled', { name, cronExpression });
  }
  
  cancelTask(name: string): void {
    const task = this.scheduledTasks.get(name);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(name);
      logger.info('Task cancelled', { name });
    }
  }
}

export const schedulerService = new SchedulerService();