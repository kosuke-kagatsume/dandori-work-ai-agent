// Vercel Function - Minimal API Handler for Testing

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Simple health check
  if (req.method === 'GET' && req.url === '/health') {
    return res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0-MVP'
    });
  }
  
  // Login endpoint
  if (req.method === 'POST' && req.url && req.url.includes('/admin/login')) {
    const { username, password } = req.body || {};
    
    // Simple hardcoded check
    if (username === 'admin' && password === 'dandori123') {
      return res.status(200).json({
        success: true,
        token: Buffer.from(`admin:${Date.now()}`).toString('base64'),
        username: 'admin',
        name: '管理者',
        role: 'admin'
      });
    }
    
    return res.status(401).json({ 
      success: false,
      error: 'ユーザーIDまたはパスワードが正しくありません' 
    });
  }
  
  // Stats endpoint (simple mock data)
  if (req.method === 'GET' && req.url && req.url.includes('/admin/stats')) {
    return res.status(200).json({
      todayEvents: 42,
      processedEvents: 256,
      errorEvents: 3,
      apiCalls: 1024
    });
  }
  
  // Events endpoint (simple mock data)
  if (req.method === 'GET' && req.url && req.url.includes('/admin/events')) {
    return res.status(200).json([
      {
        id: 'evt_001',
        type: 'Sales.InitialCallLogged',
        status: 'completed',
        created_at: new Date().toISOString()
      }
    ]);
  }
  
  // Default 404
  return res.status(404).json({ 
    error: 'Not Found',
    path: req.url,
    method: req.method
  });
};