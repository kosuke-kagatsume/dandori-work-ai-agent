// apps/console/src/App.tsx
import { useEffect, useState } from 'react';

type QueueItem = { 
  id: string; 
  dealId: string; 
  account: string; 
  type: string; 
  slaSecondsLeft: number; 
  lastUpdate: string; 
  killSwitch: boolean;
};

type SLABoard = {
  todayDue: number;
  overdue: number;
  stale3d: number;
  risk: number;
};

function color(left: number) {
  if (left < 3600) return 'text-red-600';
  if (left <= 14400) return 'text-yellow-600';
  return 'text-green-600';
}

function formatType(type: string) {
  const types: { [key: string]: string } = {
    'email_draft_approval': 'メール承認',
    'call_followup': '電話フォロー',
    'quote_approval': '見積承認',
    'session_draft_approval': 'セッション承認',
    'calendar_invite': 'カレンダー招待',
    'attachment_upload': '添付アップロード'
  };
  return types[type] || type;
}

export default function App() {
  const [scope, setScope] = useState<'sales' | 'training'>('sales');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [slaBoard, setSlaBoard] = useState<SLABoard>({ todayDue: 0, overdue: 0, stale3d: 0, risk: 0 });
  const [loading, setLoading] = useState(false);

  // Queue取得
  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/queue?user_id=me&scope=${scope}&status=open`);
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Queue fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // SLAボード取得
  const fetchSLABoard = async () => {
    try {
      const response = await fetch(`/api/sla/board?scope=${scope}`);
      const data = await response.json();
      setSlaBoard(data);
    } catch (error) {
      console.error('SLA board fetch error:', error);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchSLABoard();
    // 30秒ごとに自動更新
    const interval = setInterval(() => {
      fetchQueue();
      fetchSLABoard();
    }, 30000);
    return () => clearInterval(interval);
  }, [scope]);

  // アクション実行
  const act = async (path: string, body: any) => {
    try {
      const response = await fetch(`/api/actions/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      console.log('Action result:', result);
      // リフレッシュ
      fetchQueue();
      fetchSLABoard();
    } catch (error) {
      console.error('Action error:', error);
    }
  };

  // 自動化トグル
  const toggleAutomation = async (dealId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/automation/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dealId, enabled })
      });
      const result = await response.json();
      console.log('Toggle result:', result);
      fetchQueue();
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  return (
    <div className="p-6 grid grid-cols-3 gap-4 min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="col-span-3 flex items-center gap-3">
        <h1 className="text-xl font-bold">🎯 DW Operator Console</h1>
        <div className="ml-auto flex gap-2">
          <button 
            className={`px-3 py-1 rounded ${scope === 'sales' ? 'bg-black text-white' : 'bg-white border'}`} 
            onClick={() => setScope('sales')}
          >
            Sales
          </button>
          <button 
            className={`px-3 py-1 rounded ${scope === 'training' ? 'bg-black text-white' : 'bg-white border'}`} 
            onClick={() => setScope('training')}
          >
            Training
          </button>
        </div>
        <button 
          className="px-3 py-1 rounded bg-blue-500 text-white"
          onClick={() => { fetchQueue(); fetchSLABoard(); }}
        >
          🔄 更新
        </button>
      </header>

      {/* My Queue */}
      <section className="col-span-2 bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">📋 My Queue</h2>
          {loading && <span className="text-sm text-gray-500">読み込み中...</span>}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2">案件/顧客</th>
              <th className="pb-2">種別</th>
              <th className="pb-2">SLA残</th>
              <th className="pb-2">更新</th>
              <th className="pb-2">操作</th>
              <th className="pb-2">Auto</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t">
                <td className="py-3">
                  <div className="font-medium">{it.account}</div>
                  <div className="text-gray-400 text-xs">#{it.dealId}</div>
                </td>
                <td className="py-3">
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-xs">
                    {formatType(it.type)}
                  </span>
                </td>
                <td className={`py-3 font-medium ${color(it.slaSecondsLeft)}`}>
                  {Math.max(0, Math.floor(it.slaSecondsLeft / 3600))}h
                  {Math.floor((it.slaSecondsLeft % 3600) / 60)}m
                </td>
                <td className="py-3 text-gray-500 text-xs">
                  {new Date(it.lastUpdate).toLocaleString('ja-JP')}
                </td>
                <td className="py-3 space-x-1">
                  <button 
                    className="px-2 py-1 rounded bg-black text-white text-xs hover:bg-gray-800"
                    onClick={() => act('approve_send', { queueId: it.id, actorId: 'me' })}
                  >
                    承認して送信
                  </button>
                  <button 
                    className="px-2 py-1 rounded border text-xs hover:bg-gray-50"
                    onClick={() => act('defer_next_bd', { queueId: it.id, actorId: 'me' })}
                  >
                    翌営業日
                  </button>
                  <button 
                    className="px-2 py-1 rounded border border-red-300 text-red-600 text-xs hover:bg-red-50"
                    onClick={() => {
                      const reason = prompt('差し戻し理由を入力してください');
                      if (reason) {
                        act('reject', { queueId: it.id, actorId: 'me', reason });
                      }
                    }}
                  >
                    差し戻し
                  </button>
                </td>
                <td className="py-3">
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={!it.killSwitch}
                      onChange={(e) => toggleAutomation(it.dealId, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-500">
                      {it.killSwitch ? '無効' : '有効'}
                    </span>
                  </label>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400">
                  現在処理待ちのアイテムはありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* 全体SLAボード */}
      <aside className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold mb-3">📊 全体SLAボード</h2>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-xl border">
            <div className="text-xs text-gray-500">今日期限</div>
            <div className="text-2xl font-bold text-blue-600">{slaBoard.todayDue}</div>
          </div>
          <div className="p-3 rounded-xl border">
            <div className="text-xs text-gray-500">期限切れ</div>
            <div className="text-2xl font-bold text-red-600">{slaBoard.overdue}</div>
          </div>
          <div className="p-3 rounded-xl border">
            <div className="text-xs text-gray-500">放置>3日</div>
            <div className="text-2xl font-bold text-yellow-600">{slaBoard.stale3d}</div>
          </div>
          <div className="p-3 rounded-xl border">
            <div className="text-xs text-gray-500">リスク</div>
            <div className="text-2xl font-bold text-purple-600">{slaBoard.risk}</div>
          </div>
        </div>
        
        {/* 凡例 */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>SLA余裕（4時間以上）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span>要注意（1-4時間）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span>緊急（1時間未満）</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}