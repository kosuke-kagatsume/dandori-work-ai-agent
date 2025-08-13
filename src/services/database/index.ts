import knex, { Knex } from 'knex';
import { logger } from '../../lib/logger';
import path from 'path';

let db: Knex | null = null;

export async function initDatabase(): Promise<Knex> {
  if (db) return db;

  // Vercelでは/tmpディレクトリを使用
  const dbPath = process.env.DATABASE_PATH || '/tmp/dandori.db';
  
  db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath
    },
    useNullAsDefault: true
  });

  await createTables();
  
  logger.info('データベース初期化完了', { path: dbPath });
  
  return db;
}

async function createTables() {
  if (!db) throw new Error('データベースが初期化されていません');

  // イベント履歴テーブル
  const hasEventsTable = await db.schema.hasTable('events');
  if (!hasEventsTable) {
    await db.schema.createTable('events', (table) => {
      table.string('id').primary();
      table.string('type').notNullable();
      table.json('payload');
      table.string('status').defaultTo('pending');
      table.string('error_message');
      table.integer('retry_count').defaultTo(0);
      table.timestamp('created_at').defaultTo(db!.fn.now());
      table.timestamp('processed_at');
      table.index(['type', 'status']);
      table.index('created_at');
    });
    logger.info('eventsテーブルを作成しました');
  }

  // APIキーテーブル
  const hasApiKeysTable = await db.schema.hasTable('api_keys');
  if (!hasApiKeysTable) {
    await db.schema.createTable('api_keys', (table) => {
      table.string('key').primary();
      table.string('name').notNullable();
      table.json('permissions');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db!.fn.now());
      table.timestamp('last_used');
      table.integer('usage_count').defaultTo(0);
    });
    logger.info('api_keysテーブルを作成しました');
  }

  // 取引先（Deal）テーブル
  const hasDealsTable = await db.schema.hasTable('deals');
  if (!hasDealsTable) {
    await db.schema.createTable('deals', (table) => {
      table.string('id').primary();
      table.string('company_name').notNullable();
      table.string('contact_name');
      table.string('email');
      table.string('phone');
      table.decimal('amount', 15, 2);
      table.string('stage');
      table.string('territory');
      table.string('assigned_to');
      table.json('metadata');
      table.timestamp('created_at').defaultTo(db!.fn.now());
      table.timestamp('updated_at').defaultTo(db!.fn.now());
      table.index(['company_name', 'stage']);
    });
    logger.info('dealsテーブルを作成しました');
  }

  // 研修プログラムテーブル
  const hasProgramsTable = await db.schema.hasTable('training_programs');
  if (!hasProgramsTable) {
    await db.schema.createTable('training_programs', (table) => {
      table.string('id').primary();
      table.string('company_name').notNullable();
      table.string('program_name').notNullable();
      table.date('start_date');
      table.date('end_date');
      table.integer('session_count');
      table.string('status');
      table.json('participants');
      table.json('metadata');
      table.timestamp('created_at').defaultTo(db!.fn.now());
      table.timestamp('updated_at').defaultTo(db!.fn.now());
      table.index(['company_name', 'status']);
    });
    logger.info('training_programsテーブルを作成しました');
  }

  // メール送信ログテーブル
  const hasEmailLogsTable = await db.schema.hasTable('email_logs');
  if (!hasEmailLogsTable) {
    await db.schema.createTable('email_logs', (table) => {
      table.increments('id').primary();
      table.string('draft_id');
      table.json('recipients');
      table.string('subject');
      table.text('body');
      table.string('status').defaultTo('draft');
      table.json('attachments');
      table.timestamp('created_at').defaultTo(db!.fn.now());
      table.timestamp('sent_at');
      table.index(['status', 'created_at']);
    });
    logger.info('email_logsテーブルを作成しました');
  }
}

export async function saveEvent(event: any) {
  if (!db) await initDatabase();
  
  try {
    await db!('events').insert({
      id: event.id,
      type: event.type,
      payload: JSON.stringify(event.payload),
      status: 'pending',
      created_at: new Date()
    });
    
    logger.info('イベントを保存しました', { eventId: event.id });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      logger.warn('重複イベント', { eventId: event.id });
    } else {
      logger.error('イベント保存エラー', { error });
      throw error;
    }
  }
}

export async function updateEventStatus(eventId: string, status: string, error?: string) {
  if (!db) await initDatabase();
  
  await db!('events')
    .where('id', eventId)
    .update({
      status,
      error_message: error,
      processed_at: status === 'completed' ? new Date() : undefined
    });
}

export async function getEventHistory(limit: number = 100, offset: number = 0) {
  if (!db) await initDatabase();
  
  return await db!('events')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

export async function getEventStats() {
  if (!db) await initDatabase();
  
  const stats = await db!('events')
    .select('type', 'status')
    .count('* as count')
    .groupBy('type', 'status');
  
  return stats;
}

export async function saveDeal(deal: any) {
  if (!db) await initDatabase();
  
  await db!('deals').insert({
    id: deal.id,
    company_name: deal.companyName,
    contact_name: deal.contactName,
    email: deal.email,
    phone: deal.phone,
    amount: deal.amount,
    stage: deal.stage,
    territory: deal.territory,
    assigned_to: deal.assignedTo,
    metadata: JSON.stringify(deal.metadata || {}),
    created_at: new Date(),
    updated_at: new Date()
  }).onConflict('id').merge();
  
  logger.info('取引先を保存しました', { dealId: deal.id });
}

export async function saveEmailLog(email: any) {
  if (!db) await initDatabase();
  
  const [id] = await db!('email_logs').insert({
    draft_id: email.draftId,
    recipients: JSON.stringify({
      to: email.to,
      cc: email.cc,
      bcc: email.bcc
    }),
    subject: email.subject,
    body: email.body,
    status: email.status || 'draft',
    attachments: JSON.stringify(email.attachments || []),
    created_at: new Date()
  });
  
  logger.info('メールログを保存しました', { id });
  
  return id;
}

export async function getDatabase(): Promise<Knex> {
  if (!db) {
    await initDatabase();
  }
  return db!;
}