// Vercel Function: SLA Board API
module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { scope } = req.query;
  
  const boards = {
    sales: { 
      todayDue: 12, 
      overdue: 3, 
      stale3d: 5, 
      risk: 7 
    },
    training: { 
      todayDue: 8, 
      overdue: 2, 
      stale3d: 3, 
      risk: 4 
    }
  };
  
  return res.status(200).json(boards[scope] || boards.sales);
};