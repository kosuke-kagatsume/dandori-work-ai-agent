// Vercel Function: Queue API
const killSwitches = new Map();

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
  
  const { user_id, scope, status } = req.query;
  
  // モックデータ生成
  const items = [
    {
      id: 'Q-123',
      dealId: 'D-1',
      account: '山田工務店',
      type: scope === 'training' ? 'session_draft_approval' : 'email_draft_approval',
      slaSecondsLeft: 5400,
      lastUpdate: new Date(Date.now() - 3600000).toISOString(),
      killSwitch: false
    },
    {
      id: 'Q-124',
      dealId: 'D-2',
      account: '鈴木建設',
      type: scope === 'training' ? 'calendar_invite' : 'call_followup',
      slaSecondsLeft: 800,
      lastUpdate: new Date(Date.now() - 7200000).toISOString(),
      killSwitch: false
    },
    {
      id: 'Q-125',
      dealId: 'D-3',
      account: '田中電機',
      type: scope === 'training' ? 'attachment_upload' : 'quote_approval',
      slaSecondsLeft: 14500,
      lastUpdate: new Date(Date.now() - 1800000).toISOString(),
      killSwitch: false
    }
  ];
  
  return res.status(200).json({ items });
};