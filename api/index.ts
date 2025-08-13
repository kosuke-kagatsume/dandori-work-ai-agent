import express from 'express';
import dotenv from 'dotenv';
import { logger } from '../src/lib/logger';
import { dispatcher } from '../src/dispatcher/index';
import { loadConfig } from '../src/config/loadConfig';
import { validateApiKey, requireAuth } from '../src/middleware/auth';
import { 
  initDatabase, 
  saveEvent, 
  getEventHistory, 
  getEventStats,
  updateEventStatus 
} from '../src/services/database';

dotenv.config();

const app = express();
app.use(express.json());

// 初期化フラグ
let initialized = false;

async function initialize() {
  if (!initialized) {
    await loadConfig();
    await initDatabase();
    initialized = true;
    logger.info('システム初期化完了');
  }
}

export default async function handler(req: any, res: any) {
  await initialize();
  
  const { method, url } = req;
  
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ヘルスチェック（認証不要）
  if (method === 'GET' && url === '/health') {
    return res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0-MVP'
    });
  }
  
  // 管理API - 認証確認
  if (method === 'POST' && url === '/api/admin/verify') {
    const apiKey = req.headers['x-api-key'];
    const key = await validateApiKey(apiKey);
    
    if (key && key.permissions.includes('admin')) {
      return res.json({ 
        success: true, 
        name: key.name,
        permissions: key.permissions 
      });
    }
    
    return res.status(401).json({ error: '認証失敗' });
  }
  
  // 管理API - 統計情報（要認証）
  if (method === 'GET' && url === '/api/admin/stats') {
    const apiKey = req.headers['x-api-key'];
    const key = await validateApiKey(apiKey);
    
    if (!key || !key.permissions.includes('admin')) {
      return res.status(401).json({ error: '権限がありません' });
    }
    
    try {
      const stats = await getEventStats();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayEvents = stats.filter((s: any) => 
        new Date(s.created_at) >= today
      ).reduce((sum: number, s: any) => sum + s.count, 0);
      
      const processedEvents = stats
        .filter((s: any) => s.status === 'completed')
        .reduce((sum: number, s: any) => sum + s.count, 0);
      
      const errorEvents = stats
        .filter((s: any) => s.status === 'error')
        .reduce((sum: number, s: any) => sum + s.count, 0);
      
      return res.json({
        todayEvents,
        processedEvents,
        errorEvents,
        apiCalls: Math.floor(Math.random() * 1000) // 仮の値
      });
    } catch (error) {
      logger.error('統計取得エラー', { error });
      return res.status(500).json({ error: 'データ取得エラー' });
    }
  }
  
  // 管理API - イベント履歴（要認証）
  if (method === 'GET' && url === '/api/admin/events') {
    const apiKey = req.headers['x-api-key'];
    const key = await validateApiKey(apiKey);
    
    if (!key || !key.permissions.includes('admin')) {
      return res.status(401).json({ error: '権限がありません' });
    }
    
    try {
      const events = await getEventHistory(50, 0);
      return res.json(events);
    } catch (error) {
      logger.error('イベント履歴取得エラー', { error });
      return res.status(500).json({ error: 'データ取得エラー' });
    }
  }
  
  // Webhook/イベント受信（開発環境では認証オプション）
  if (method === 'POST' && (url === '/webhook' || url === '/events')) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.USE_MOCK_ADAPTERS === 'true';
    
    // 本番環境では認証必須
    if (!isDevelopment && !apiKey) {
      return res.status(401).json({ 
        error: '認証エラー',
        message: 'APIキーが必要です',
        documentation: 'https://dandori-ai-agent.vercel.app/admin.html'
      });
    }
    
    if (apiKey) {
      const key = await validateApiKey(apiKey);
      if (!key) {
        return res.status(401).json({ error: '無効なAPIキー' });
      }
    }
    
    try {
      const event = req.body;
      
      if (!event.id || !event.type) {
        return res.status(400).json({ 
          error: 'イベントIDとタイプは必須です' 
        });
      }
      
      // イベントをデータベースに保存
      await saveEvent(event);
      
      logger.info('イベント受信', { 
        eventId: event.id, 
        eventType: event.type 
      });
      
      // 非同期でイベント処理
      dispatcher.handle(event)
        .then(() => updateEventStatus(event.id, 'completed'))
        .catch((error) => {
          logger.error('イベント処理エラー', { error });
          updateEventStatus(event.id, 'error', error.message);
        });
      
      return res.json({ 
        success: true, 
        eventId: event.id,
        message: 'イベントを受け付けました'
      });
    } catch (error: any) {
      logger.error('イベント処理エラー', { error });
      
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ 
          success: false, 
          error: '重複イベント' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'サーバーエラー' 
      });
    }
  }
  
  // 404
  return res.status(404).json({ 
    error: 'エンドポイントが見つかりません',
    available: [
      'GET /health',
      'POST /events',
      'POST /webhook',
      'GET /api/admin/stats',
      'GET /api/admin/events'
    ]
  });
}

// グローバル型定義
declare global {
  var configLoaded: boolean | undefined;
  var dbInitialized: boolean | undefined;
}