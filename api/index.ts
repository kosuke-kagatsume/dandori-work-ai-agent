// Vercel Function - API Handler
// Standalone version without external dependencies for stability

// ユーザー認証情報（デモ用）
const USERS = {
  'admin': {
    password: 'dandori123',
    name: '管理者',
    role: 'admin',
    permissions: ['read', 'write', 'admin']
  },
  'sales01': {
    password: 'sales123',
    name: '営業担当A',
    role: 'sales',
    permissions: ['read', 'write']
  },
  'training01': {
    password: 'training123',
    name: '研修担当B',
    role: 'training',
    permissions: ['read', 'write']
  }
};

// 簡易トークン生成
function generateToken(username: string): string {
  return Buffer.from(`${username}:${Date.now()}`).toString('base64');
}

// トークン検証
function validateToken(token: string): { valid: boolean; username?: string } {
  try {
    if (!token) return { valid: false };
    const decoded = Buffer.from(token, 'base64').toString();
    const [username] = decoded.split(':');
    if (USERS[username as keyof typeof USERS]) {
      return { valid: true, username };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

// イベント処理（簡易版）
async function handleEvent(event: any) {
  console.log(`Event received: ${event.type}`, event);
  
  // ここで実際のイベント処理を行う
  // 現在はログ出力のみ
  
  return { 
    processed: true, 
    eventId: event.id,
    type: event.type,
    timestamp: new Date().toISOString()
  };
}

export default async function handler(req: any, res: any) {
  const { method, url } = req;
  
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // ヘルスチェック（認証不要）
    if (method === 'GET' && url === '/health') {
      return res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0-MVP',
        environment: process.env.NODE_ENV || 'production'
      });
    }
    
    // ログインエンドポイント
    if (method === 'POST' && url.includes('/admin/login')) {
      const { username, password } = req.body || {};
      
      if (!username || !password) {
        return res.status(400).json({ 
          success: false,
          error: 'ユーザーIDとパスワードを入力してください' 
        });
      }
      
      const user = USERS[username as keyof typeof USERS];
      
      if (user && user.password === password) {
        const token = generateToken(username);
        return res.json({
          success: true,
          token,
          username,
          name: user.name,
          role: user.role,
          permissions: user.permissions
        });
      }
      
      return res.status(401).json({ 
        success: false,
        error: 'ユーザーIDまたはパスワードが正しくありません' 
      });
    }
    
    // 管理API - 統計情報
    if (method === 'GET' && url.includes('/admin/stats')) {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace('Bearer ', '');
      const validation = validateToken(token);
      
      if (!validation.valid) {
        return res.status(401).json({ error: '認証が必要です' });
      }
      
      return res.json({
        todayEvents: Math.floor(Math.random() * 100),
        processedEvents: Math.floor(Math.random() * 500),
        errorEvents: Math.floor(Math.random() * 10),
        apiCalls: Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString()
      });
    }
    
    // 管理API - イベント履歴
    if (method === 'GET' && url.includes('/admin/events')) {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace('Bearer ', '');
      const validation = validateToken(token);
      
      if (!validation.valid) {
        return res.status(401).json({ error: '認証が必要です' });
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
        },
        {
          id: 'evt_' + Math.random().toString(36).substr(2, 9),
          type: 'Sales.QuoteReady',
          status: 'error',
          created_at: new Date(Date.now() - 900000).toISOString()
        },
        {
          id: 'evt_' + Math.random().toString(36).substr(2, 9),
          type: 'Training.Tminus3',
          status: 'completed',
          created_at: new Date(Date.now() - 450000).toISOString()
        }
      ];
      
      return res.json(dummyEvents);
    }
    
    // Webhook/イベント受信
    if (method === 'POST' && (url === '/webhook' || url === '/events')) {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace('Bearer ', '');
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           process.env.USE_MOCK_ADAPTERS === 'true';
      
      // 開発環境では認証をスキップ可能
      if (!isDevelopment && !token) {
        return res.status(401).json({ 
          error: '認証エラー',
          message: 'トークンが必要です',
          documentation: 'https://dandori-ai-agent.vercel.app/admin.html'
        });
      }
      
      if (token && !validateToken(token).valid) {
        return res.status(401).json({ error: '無効なトークン' });
      }
      
      const event = req.body || {};
      
      if (!event.id || !event.type) {
        return res.status(400).json({ 
          error: 'イベントIDとタイプは必須です' 
        });
      }
      
      console.log('イベント受信', { 
        eventId: event.id, 
        eventType: event.type 
      });
      
      // イベント処理（簡易版）
      const result = await handleEvent(event);
      
      return res.json({ 
        success: true, 
        eventId: event.id,
        message: 'イベントを受け付けました',
        result
      });
    }
    
    // 404
    return res.status(404).json({ 
      error: 'エンドポイントが見つかりません',
      available: [
        'GET /health',
        'POST /api/admin/login',
        'POST /events',
        'POST /webhook',
        'GET /api/admin/stats',
        'GET /api/admin/events'
      ]
    });
  } catch (error: any) {
    console.error('API Error:', error);
    
    return res.status(500).json({ 
      error: 'サーバーエラー',
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}