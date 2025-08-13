export default async function handler(req: any, res: any) {
  const { method, url } = req;
  
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 簡易認証（ハードコードされたAPIキー）
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
  
  if (method === 'POST' && req.url === '/api/admin/verify') {
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
  
  if (method === 'GET' && req.url === '/api/admin/stats') {
    const apiKey = req.headers['x-api-key'];
    const keyInfo = VALID_API_KEYS[apiKey as keyof typeof VALID_API_KEYS];
    
    if (!keyInfo || !keyInfo.permissions.includes('admin')) {
      return res.status(401).json({ error: '権限がありません' });
    }
    
    // ダミーデータを返す
    return res.json({
      todayEvents: Math.floor(Math.random() * 100),
      processedEvents: Math.floor(Math.random() * 500),
      errorEvents: Math.floor(Math.random() * 10),
      apiCalls: Math.floor(Math.random() * 1000)
    });
  }
  
  if (method === 'GET' && req.url === '/api/admin/events') {
    const apiKey = req.headers['x-api-key'];
    const keyInfo = VALID_API_KEYS[apiKey as keyof typeof VALID_API_KEYS];
    
    if (!keyInfo || !keyInfo.permissions.includes('admin')) {
      return res.status(401).json({ error: '権限がありません' });
    }
    
    // ダミーイベントデータ
    const dummyEvents = [
      {
        id: 'evt_001',
        type: 'Sales.InitialCallLogged',
        status: 'completed',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'evt_002',
        type: 'Training.ContractSigned',
        status: 'completed',
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'evt_003',
        type: 'Sales.NoAnswer',
        status: 'pending',
        created_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];
    
    return res.json(dummyEvents);
  }
  
  return res.status(404).json({ error: 'Not found' });
}