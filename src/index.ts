import express from 'express';
import dotenv from 'dotenv';
import { logger } from './lib/logger.js';
import { dispatcher } from './dispatcher/index.js';
import { loadConfig } from './config/loadConfig.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received event', { eventId: event.id, eventType: event.type });
    
    await dispatcher.handle(event);
    
    res.json({ success: true, eventId: event.id });
  } catch (error) {
    logger.error('Error processing event', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/events', async (req, res) => {
  try {
    const event = req.body;
    logger.info('Manual event trigger', { eventId: event.id, eventType: event.type });
    
    await dispatcher.handle(event);
    
    res.json({ success: true, eventId: event.id });
  } catch (error) {
    logger.error('Error processing manual event', { error });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

async function start() {
  try {
    await loadConfig();
    logger.info('Configuration loaded successfully');
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Webhook endpoint: http://localhost:${PORT}/webhook`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();