// apps/console-api/src/server.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });

// CORS設定
app.register(cors, {
  origin: true,
  credentials: true
});

// モックデータストア
const mockQueues = new Map<string, any>();
const mockSLABoard = {
  sales: { todayDue: 12, overdue: 3, stale3d: 5, risk: 7 },
  training: { todayDue: 8, overdue: 2, stale3d: 3, risk: 4 }
};

// キルスイッチ状態
const killSwitches = new Map<string, boolean>();

// Idempotency管理
const processedKeys = new Set<string>();

// Queue取得
app.get('/api/queue', async (req, reply) => {
  const { user_id, scope, status } = req.query as any;
  
  // モックデータ生成
  const items = [
    {
      id: 'Q-123',
      dealId: 'D-1',
      account: '山田工務店',
      type: 'email_draft_approval',
      slaSecondsLeft: 5400,
      lastUpdate: new Date(Date.now() - 3600000).toISOString(),
      killSwitch: killSwitches.get('D-1') ?? false
    },
    {
      id: 'Q-124',
      dealId: 'D-2',
      account: '鈴木建設',
      type: 'call_followup',
      slaSecondsLeft: 800,
      lastUpdate: new Date(Date.now() - 7200000).toISOString(),
      killSwitch: killSwitches.get('D-2') ?? false
    },
    {
      id: 'Q-125',
      dealId: 'D-3',
      account: '田中電機',
      type: 'quote_approval',
      slaSecondsLeft: 14500,
      lastUpdate: new Date(Date.now() - 1800000).toISOString(),
      killSwitch: killSwitches.get('D-3') ?? false
    }
  ];
  
  // スコープフィルタ
  const filtered = scope === 'training' 
    ? items.map(i => ({ ...i, type: 'session_draft_approval' }))
    : items;
  
  return { items: filtered };
});

// SLAボード取得
app.get('/api/sla/board', async (req, reply) => {
  const { scope } = req.query as any;
  return mockSLABoard[scope as 'sales' | 'training'] || mockSLABoard.sales;
});

// 承認して送信
app.post('/api/actions/approve_send', async (req, reply) => {
  const { queueId, actorId, note } = req.body as any;
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  // Idempotency check
  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return { ok: true, cached: true };
  }
  
  console.log(`[APPROVE] Queue: ${queueId}, Actor: ${actorId}, Note: ${note}`);
  
  // TODO: Hubのユースケース呼び出し
  // await hubDispatcher.approveSend(queueId, actorId, note);
  
  if (idempotencyKey) processedKeys.add(idempotencyKey);
  return { ok: true, message: '承認して送信しました' };
});

// 翌営業日に延期
app.post('/api/actions/defer_next_bd', async (req, reply) => {
  const { queueId, actorId } = req.body as any;
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return { ok: true, cached: true };
  }
  
  console.log(`[DEFER] Queue: ${queueId}, Actor: ${actorId}`);
  
  // 翌営業日の計算
  const nextBusinessDay = new Date();
  const day = nextBusinessDay.getDay();
  const daysToAdd = day === 5 ? 3 : day === 6 ? 2 : 1;
  nextBusinessDay.setDate(nextBusinessDay.getDate() + daysToAdd);
  nextBusinessDay.setHours(9, 0, 0, 0);
  
  if (idempotencyKey) processedKeys.add(idempotencyKey);
  return { 
    ok: true, 
    message: '翌営業日に延期しました',
    scheduledFor: nextBusinessDay.toISOString()
  };
});

// 差し戻し
app.post('/api/actions/reject', async (req, reply) => {
  const { queueId, actorId, reason } = req.body as any;
  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return { ok: true, cached: true };
  }
  
  console.log(`[REJECT] Queue: ${queueId}, Actor: ${actorId}, Reason: ${reason}`);
  
  // TODO: Hubのユースケース呼び出し
  // await hubDispatcher.reject(queueId, actorId, reason);
  
  if (idempotencyKey) processedKeys.add(idempotencyKey);
  return { ok: true, message: '差し戻しました', reason };
});

// キルスイッチ切替
app.post('/api/automation/toggle', async (req, reply) => {
  const { dealId, enabled } = req.body as any;
  
  console.log(`[KILL_SWITCH] Deal: ${dealId}, Enabled: ${enabled}`);
  killSwitches.set(dealId, !enabled);
  
  return { 
    ok: true, 
    message: `自動化を${enabled ? '有効' : '無効'}にしました`,
    dealId,
    automationEnabled: enabled
  };
});

// ヘルスチェック
app.get('/health', async (req, reply) => {
  return { 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

// サーバー起動
const start = async () => {
  try {
    await app.listen({ port: 8787, host: '0.0.0.0' });
    console.log('Console API Server running on http://localhost:8787');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();