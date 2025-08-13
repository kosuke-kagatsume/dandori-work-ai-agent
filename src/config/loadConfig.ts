import { z } from 'zod';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../lib/logger';

const QuietHoursSchema = z.object({
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  timezone: z.string().default('Asia/Tokyo')
});

const SalesConfigSchema = z.object({
  businessHours: z.object({
    start: z.number().default(9),
    end: z.number().default(18)
  }),
  defaultBcc: z.string().email().default('sales@dandori-work.com'),
  smsUrlRestriction: z.boolean().default(true),
  attachmentNaming: z.object({
    prefix: z.string().default('【DW提案書】'),
    format: z.string().default('{companyName}_{YYYYMMDD}')
  }),
  quietHours: z.object({
    email: QuietHoursSchema,
    sms: QuietHoursSchema
  }),
  warningThresholds: z.object({
    discountPercentage: z.number().default(15)
  })
});

const TrainingConfigSchema = z.object({
  sessionHours: z.object({
    start: z.number().default(10),
    end: z.number().default(18)
  }),
  allowedDays: z.array(z.number()).default([1, 2, 3, 4, 5, 6]), // Monday to Saturday
  defaultBcc: z.string().email().default('training@dandori-work.com'),
  reminders: z.object({
    t3Days: z.number().default(3),
    t1Days: z.number().default(1)
  }),
  recordingRetention: z.number().default(12), // months
  quietHours: z.object({
    email: QuietHoursSchema,
    chatwork: QuietHoursSchema
  })
});

const CommonConfigSchema = z.object({
  normalizationDictionary: z.record(z.string()).default({}),
  territoryAssignment: z.array(z.object({
    code: z.string(),
    name: z.string(),
    assignedTo: z.string(),
    prefectures: z.array(z.string()).optional()
  })).default([]),
  fuzzyMatchThreshold: z.number().min(0).max(1).default(0.8)
});

const ConfigSchema = z.object({
  sales: SalesConfigSchema,
  training: TrainingConfigSchema,
  common: CommonConfigSchema
});

type Config = z.infer<typeof ConfigSchema>;

let config: Config | null = null;

export async function loadConfig(): Promise<Config> {
  try {
    const configDir = path.join(process.cwd(), 'configs');
    
    const salesConfigPath = path.join(configDir, 'dw_sales_agent.yaml');
    const trainingConfigPath = path.join(configDir, 'dw_training_agent.yaml');
    
    let salesConfig = {};
    let trainingConfig = {};
    
    if (fs.existsSync(salesConfigPath)) {
      const salesYaml = fs.readFileSync(salesConfigPath, 'utf8');
      salesConfig = yaml.load(salesYaml) as any;
      logger.info('Sales config loaded', { path: salesConfigPath });
    } else {
      logger.warn('Sales config not found, using defaults', { path: salesConfigPath });
    }
    
    if (fs.existsSync(trainingConfigPath)) {
      const trainingYaml = fs.readFileSync(trainingConfigPath, 'utf8');
      trainingConfig = yaml.load(trainingYaml) as any;
      logger.info('Training config loaded', { path: trainingConfigPath });
    } else {
      logger.warn('Training config not found, using defaults', { path: trainingConfigPath });
    }
    
    const mergedConfig = {
      sales: salesConfig,
      training: trainingConfig,
      common: {
        normalizationDictionary: {},
        territoryAssignment: [],
        fuzzyMatchThreshold: 0.8
      }
    };
    
    config = ConfigSchema.parse(mergedConfig);
    logger.info('Configuration validated successfully');
    
    return config;
  } catch (error) {
    logger.error('Failed to load configuration', { error });
    
    config = ConfigSchema.parse({
      sales: {},
      training: {},
      common: {}
    });
    
    logger.info('Using default configuration');
    return config;
  }
}

export function getConfig(): Config {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}