// Vercel Function: Event Trigger API
module.exports = async (req, res) => {
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
  
  try {
    const event = req.body;
    
    // イベント検証
    if (!event.type || !event.agent || !event.data) {
      return res.status(400).json({ 
        error: 'Invalid event format',
        required: ['type', 'agent', 'data']
      });
    }
    
    // イベントID生成
    if (!event.id) {
      event.id = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }
    
    // タイムスタンプ追加
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    
    console.log('[EVENT TRIGGERED]', {
      id: event.id,
      type: event.type,
      agent: event.agent
    });
    
    // エージェント別処理
    let result = { success: false };
    
    switch (event.agent) {
      case 'sales':
        result = await processSalesEvent(event);
        break;
      case 'training':
        result = await processTrainingEvent(event);
        break;
      default:
        return res.status(400).json({ 
          error: 'Unknown agent type',
          agent: event.agent
        });
    }
    
    return res.status(200).json({
      ok: true,
      eventId: event.id,
      agent: event.agent,
      type: event.type,
      result: result,
      timestamp: event.timestamp
    });
    
  } catch (error) {
    console.error('[EVENT ERROR]', error);
    return res.status(500).json({ 
      error: 'Event processing failed',
      message: error.message
    });
  }
};

// 営業イベント処理
async function processSalesEvent(event) {
  const { type, data } = event;
  
  switch (type) {
    case 'lead_created':
      return {
        success: true,
        actions: [
          { type: 'email', template: 'welcome_email', scheduled: true },
          { type: 'task', description: '初回架電', assignedTo: data.assignedTo || 'sales01' }
        ]
      };
      
    case 'initial_call_completed':
      return {
        success: true,
        actions: [
          { type: 'email', template: 'follow_up_email', scheduled: true },
          { type: 'calendar', description: 'デモ予約', scheduled: true }
        ]
      };
      
    case 'demo_scheduled':
      return {
        success: true,
        actions: [
          { type: 'email', template: 'demo_reminder', scheduled: true },
          { type: 'chatwork', message: 'デモ準備リマインダー' }
        ]
      };
      
    case 'proposal_sent':
      return {
        success: true,
        actions: [
          { type: 'task', description: 'フォローアップ', daysAfter: 3 }
        ]
      };
      
    default:
      return {
        success: true,
        actions: [],
        message: 'No specific actions for this event type'
      };
  }
}

// 研修イベント処理
async function processTrainingEvent(event) {
  const { type, data } = event;
  
  switch (type) {
    case 'contract_signed':
      return {
        success: true,
        actions: [
          { type: 'email', template: 'kickoff_invitation', scheduled: true },
          { type: 'calendar', description: 'キックオフミーティング設定' },
          { type: 'task', description: '研修資料準備', assignedTo: 'training01' }
        ]
      };
      
    case 'session_scheduled':
      return {
        success: true,
        actions: [
          { type: 'email', template: 'session_reminder', daysBefore: 1 },
          { type: 'chatwork', message: '研修準備チェックリスト' }
        ]
      };
      
    case 'session_completed':
      return {
        success: true,
        actions: [
          { type: 'email', template: 'session_followup', scheduled: true },
          { type: 'task', description: 'フィードバック収集', daysAfter: 2 }
        ]
      };
      
    default:
      return {
        success: true,
        actions: [],
        message: 'No specific actions for this event type'
      };
  }
}