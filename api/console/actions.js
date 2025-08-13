// Vercel Function: Console Actions API
module.exports = (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const idempotencyKey = req.headers['idempotency-key'];
  
  const { action } = req.query;
  const body = req.body || {};
  
  let response = { ok: false, error: 'Unknown action' };
  
  switch (action) {
    case 'approve_send':
      console.log(`[APPROVE] Queue: ${body.queueId}, Actor: ${body.actorId}`);
      response = { 
        ok: true, 
        message: '承認して送信しました',
        queueId: body.queueId
      };
      break;
      
    case 'defer_next_bd':
      console.log(`[DEFER] Queue: ${body.queueId}, Actor: ${body.actorId}`);
      const nextBusinessDay = new Date();
      const day = nextBusinessDay.getDay();
      const daysToAdd = day === 5 ? 3 : day === 6 ? 2 : 1;
      nextBusinessDay.setDate(nextBusinessDay.getDate() + daysToAdd);
      nextBusinessDay.setHours(9, 0, 0, 0);
      
      response = { 
        ok: true, 
        message: '翌営業日に延期しました',
        scheduledFor: nextBusinessDay.toISOString()
      };
      break;
      
    case 'reject':
      console.log(`[REJECT] Queue: ${body.queueId}, Reason: ${body.reason}`);
      response = { 
        ok: true, 
        message: '差し戻しました',
        reason: body.reason
      };
      break;
      
    case 'toggle':
      console.log(`[TOGGLE] Deal: ${body.dealId}, Enabled: ${body.enabled}`);
      response = { 
        ok: true, 
        message: `自動化を${body.enabled ? '有効' : '無効'}にしました`,
        dealId: body.dealId,
        automationEnabled: body.enabled
      };
      break;
  }
  
  return res.status(200).json(response);
};