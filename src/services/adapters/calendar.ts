import { logger } from '../../lib/logger';
import { v4 as uuidv4 } from 'uuid';

export interface CalendarEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  meetingUrl?: string;
}

export interface CalendarAdapter {
  createEvent(event: CalendarEvent): Promise<{ eventId: string }>;
  updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}

class CalendarService implements CalendarAdapter {
  private adapter: CalendarAdapter;
  
  constructor() {
    const useMock = process.env.USE_MOCK_ADAPTERS === 'true';
    this.adapter = useMock ? new CalendarMock() : new CalendarMock(); // TODO: Replace with real adapter
  }
  
  async createEvent(event: CalendarEvent): Promise<{ eventId: string }> {
    logger.info('Creating calendar event', { title: event.title });
    return this.adapter.createEvent(event);
  }
  
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    logger.info('Updating calendar event', { eventId });
    return this.adapter.updateEvent(eventId, event);
  }
  
  async deleteEvent(eventId: string): Promise<void> {
    logger.info('Deleting calendar event', { eventId });
    return this.adapter.deleteEvent(eventId);
  }
}

class CalendarMock implements CalendarAdapter {
  private events = new Map<string, CalendarEvent>();
  
  async createEvent(event: CalendarEvent): Promise<{ eventId: string }> {
    const eventId = `event_${uuidv4()}`;
    this.events.set(eventId, event);
    
    logger.info('[MOCK] Calendar event created', {
      eventId,
      title: event.title,
      startTime: event.startTime.toISOString(),
      attendees: event.attendees.length
    });
    
    return { eventId };
  }
  
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    const existing = this.events.get(eventId);
    if (existing) {
      this.events.set(eventId, { ...existing, ...event });
      logger.info('[MOCK] Calendar event updated', { eventId });
    }
  }
  
  async deleteEvent(eventId: string): Promise<void> {
    this.events.delete(eventId);
    logger.info('[MOCK] Calendar event deleted', { eventId });
  }
}

export const calendarService = new CalendarService();