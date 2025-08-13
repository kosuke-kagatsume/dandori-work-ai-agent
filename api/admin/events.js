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
  
  // Return mock events
  const events = [
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
  
  return res.status(200).json(events);
};