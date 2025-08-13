import { logger } from '../src/lib/logger';
import { dispatcher } from '../src/dispatcher/index';
import { loadConfig } from '../src/config/loadConfig';

// 初期化フラグ
let initialized = false;

async function initialize() {
  if (!initialized) {
    try {
      await loadConfig();
      initialized = true;
      console.log('システム初期化完了');
    } catch (error) {
      console.error('初期化エラー:', error);
    }
  }
}

// 簡易APIキー認証
const VALID_API_KEYS = {
  'dw_live_key_abc123xyz789': {
    name: 'メインAPIキー',
    permissions: ['read', 'write', 'admin']
  },
  'dw_test_key_demo456': {
    name: 'テスト用APIキー',
    permissions: ['read', 'write']
  }
};

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
  if (method === 'POST' && url.includes('/admin/verify')) {
    const apiKey = req.headers['x-api-key'];
    const keyInfo = VALID_API_KEYS[apiKey as keyof typeof VALID_API_KEYS];
    
    if (keyInfo && keyInfo.permissions.includes('admin')) {
      return res.json({ 
        success: true, 
        name: keyInfo.name,
        permissions: keyInfo.permissions 
      });
    }
    
    return res.status(401).json({ error: '認証失敗' });
  }
  
  // 管理API - 統計情報
  if (method === 'GET' && url.includes('/admin/stats')) {
    const apiKey = req.headers['x-api-key'];
    const keyInfo = VALID_API_KEYS[apiKey as keyof typeof VALID_API_KEYS];
    
    if (!keyInfo || !keyInfo.permissions.includes('admin')) {
      return res.status(401).json({ error: '権限がありません' });
    }
    
    return res.json({
      todayEvents: Math.floor(Math.random() * 100),
      processedEvents: Math.floor(Math.random() * 500),
      errorEvents: Math.floor(Math.random() * 10),
      apiCalls: Math.floor(Math.random() * 1000)
    });
  }
  
  // 管理API - イベント履歴
  if (method === 'GET' && url.includes('/admin/events')) {
    const apiKey = req.headers['x-api-key'];
    const keyInfo = VALID_API_KEYS[apiKey as keyof typeof VALID_API_KEYS];
    
    if (!keyInfo || !keyInfo.permissions.includes('admin')) {
      return res.status(401).json({ error: '権限がありません' });
    }
    
    const dummyEvents = [
      {
        id: 'evt_' + Math.random().toString(36).substr(2, 9),
        type: 'Sales.InitialCallLogged',
        status: 'completed',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'evt_' + Math.random().toString(36).substr(2, 9),
        type: 'Training.ContractSigned',
        status: 'completed',
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'evt_' + Math.random().toString(36).substr(2, 9),
        type: 'Sales.NoAnswer',
        status: 'pending',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];
    
    return res.json(dummyEvents);
  }
  
  // Webhook/イベント受信
  if (method === 'POST' && (url === '/webhook' || url === '/events')) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.USE_MOCK_ADAPTERS === 'true';
    
    // 開発環境では認証をスキップ可能
    if (!isDevelopment && !apiKey) {
      return res.status(401).json({ 
        error: '認証エラー',
        message: 'APIキーが必要です',
        documentation: 'https://dandori-ai-agent.vercel.app/admin.html'
      });
    }
    
    if (apiKey && !VALID_API_KEYS[apiKey as keyof typeof VALID_API_KEYS]) {
      return res.status(401).json({ error: '無効なAPIキー' });
    }
    
    try {
      const event = req.body;
      
      if (!event.id || !event.type) {
        return res.status(400).json({ 
          error: 'イベントIDとタイプは必須です' 
        });
      }
      
      logger.info('イベント受信', { 
        eventId: event.id, 
        eventType: event.type 
      });
      
      // 非同期でイベント処理
      dispatcher.handle(event).catch((error) => {
        logger.error('イベント処理エラー', { error });
      });
      
      return res.json({ 
        success: true, 
        eventId: event.id,
        message: 'イベントを受け付けました'
      });
    } catch (error: any) {
      logger.error('イベント処理エラー', { error });
      
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
      'POST /api/admin/verify',
      'GET /api/admin/stats',
      'GET /api/admin/events'
    ]
  });
}