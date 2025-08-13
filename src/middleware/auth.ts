import { logger } from '../lib/logger';
import { randomBytes } from 'crypto';

export interface ApiKey {
  key: string;
  name: string;
  createdAt: Date;
  lastUsed?: Date;
  permissions: string[];
  isActive: boolean;
}

// 仮のAPIキー保存（本番ではデータベースを使用）
const apiKeys: Map<string, ApiKey> = new Map([
  ['dw_live_key_abc123xyz789', {
    key: 'dw_live_key_abc123xyz789',
    name: 'メインAPIキー',
    createdAt: new Date(),
    permissions: ['read', 'write', 'admin'],
    isActive: true
  }],
  ['dw_test_key_demo456', {
    key: 'dw_test_key_demo456',
    name: 'テスト用APIキー',
    createdAt: new Date(),
    permissions: ['read', 'write'],
    isActive: true
  }]
]);

export async function validateApiKey(apiKey: string | undefined): Promise<ApiKey | null> {
  if (!apiKey) {
    logger.warn('APIキーが提供されていません');
    return null;
  }

  const key = apiKeys.get(apiKey);
  
  if (!key) {
    logger.warn('無効なAPIキー', { apiKey: apiKey.substring(0, 10) + '...' });
    return null;
  }

  if (!key.isActive) {
    logger.warn('無効化されたAPIキー', { name: key.name });
    return null;
  }

  // 最終使用日時を更新
  key.lastUsed = new Date();
  
  logger.info('APIキー認証成功', { 
    name: key.name,
    permissions: key.permissions 
  });

  return key;
}

export function generateApiKey(prefix: string = 'dw_live_key'): string {
  const bytes = randomBytes(24);
  const randomString = bytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '');
  
  return `${prefix}_${randomString}`;
}

export async function createApiKey(name: string, permissions: string[]): Promise<ApiKey> {
  const key = generateApiKey();
  const apiKey: ApiKey = {
    key,
    name,
    createdAt: new Date(),
    permissions,
    isActive: true
  };
  
  apiKeys.set(key, apiKey);
  
  logger.info('新しいAPIキーを作成', { name, permissions });
  
  return apiKey;
}

export async function revokeApiKey(key: string): Promise<boolean> {
  const apiKey = apiKeys.get(key);
  
  if (!apiKey) {
    return false;
  }
  
  apiKey.isActive = false;
  
  logger.info('APIキーを無効化', { name: apiKey.name });
  
  return true;
}

// Express/Vercel用ミドルウェア
export function requireAuth(permissions: string[] = []) {
  return async (req: any, res: any, next?: any) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    const key = await validateApiKey(apiKey);
    
    if (!key) {
      return res.status(401).json({
        error: '認証エラー',
        message: '有効なAPIキーを提供してください',
        documentation: 'https://dandori-ai-agent.vercel.app/docs/api'
      });
    }
    
    // 権限チェック
    if (permissions.length > 0) {
      const hasPermission = permissions.every(p => key.permissions.includes(p));
      
      if (!hasPermission) {
        return res.status(403).json({
          error: '権限エラー',
          message: 'この操作を実行する権限がありません',
          required: permissions,
          current: key.permissions
        });
      }
    }
    
    // リクエストにAPIキー情報を追加
    req.apiKey = key;
    
    if (next) {
      next();
    }
  };
}