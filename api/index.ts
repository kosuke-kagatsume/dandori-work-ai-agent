import express from 'express';
import dotenv from 'dotenv';
import { logger } from '../src/lib/logger';
import { dispatcher } from '../src/dispatcher/index';
import { loadConfig } from '../src/config/loadConfig';

dotenv.config();

const app = express();

app.use(express.json());

export default async function handler(req: any, res: any) {
  // Initialize config on first request
  if (!global.configLoaded) {
    await loadConfig();
    global.configLoaded = true;
  }

  const { method, url } = req;
  
  if (method === 'GET' && url === '/health') {
    return res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  }
  
  if (method === 'POST' && (url === '/webhook' || url === '/events')) {
    try {
      const event = req.body;
      logger.info('Received event', { eventId: event.id, eventType: event.type });
      
      await dispatcher.handle(event);
      
      return res.json({ success: true, eventId: event.id });
    } catch (error) {
      logger.error('Error processing event', { error });
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
  
  return res.status(404).json({ error: 'Not found' });
}

// Type declaration for global config flag
declare global {
  var configLoaded: boolean | undefined;
}