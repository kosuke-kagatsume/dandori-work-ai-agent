module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Return mock statistics
  return res.status(200).json({
    todayEvents: Math.floor(Math.random() * 100),
    processedEvents: Math.floor(Math.random() * 500),
    errorEvents: Math.floor(Math.random() * 10),
    apiCalls: Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString()
  });
};