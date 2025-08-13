module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { username, password } = req.body || {};
  
  // Simple hardcoded authentication
  if (username === 'admin' && password === 'dandori123') {
    return res.status(200).json({
      success: true,
      token: Buffer.from(`admin:${Date.now()}`).toString('base64'),
      username: 'admin',
      name: '管理者',
      role: 'admin',
      permissions: ['read', 'write', 'admin']
    });
  }
  
  if (username === 'sales01' && password === 'sales123') {
    return res.status(200).json({
      success: true,
      token: Buffer.from(`sales01:${Date.now()}`).toString('base64'),
      username: 'sales01',
      name: '営業担当A',
      role: 'sales',
      permissions: ['read', 'write']
    });
  }
  
  if (username === 'training01' && password === 'training123') {
    return res.status(200).json({
      success: true,
      token: Buffer.from(`training01:${Date.now()}`).toString('base64'),
      username: 'training01',
      name: '研修担当B',
      role: 'training',
      permissions: ['read', 'write']
    });
  }
  
  return res.status(401).json({
    success: false,
    error: 'ユーザーIDまたはパスワードが正しくありません'
  });
};