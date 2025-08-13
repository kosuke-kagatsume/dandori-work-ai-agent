import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../lib/logger.js';

class TemplateService {
  private templates = new Map<string, HandlebarsTemplateDelegate>();
  private templatesDir: string;
  
  constructor() {
    this.templatesDir = path.join(process.cwd(), 'templates');
    this.registerHelpers();
  }
  
  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date | string, format: string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      
      if (format === 'YYYYMMDD') {
        return d.toISOString().slice(0, 10).replace(/-/g, '');
      }
      
      if (format === 'YYYY-MM-DD') {
        return d.toISOString().slice(0, 10);
      }
      
      if (format === 'MM/DD') {
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
      }
      
      return d.toLocaleDateString('ja-JP');
    });
    
    // Number formatting helper
    Handlebars.registerHelper('formatNumber', (num: number) => {
      return num.toLocaleString('ja-JP');
    });
    
    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return `¥${amount.toLocaleString('ja-JP')}`;
    });
  }
  
  async render(templatePath: string, variables: Record<string, any>): Promise<string> {
    try {
      let template = this.templates.get(templatePath);
      
      if (!template) {
        const fullPath = path.join(this.templatesDir, templatePath);
        
        if (!fs.existsSync(fullPath)) {
          logger.warn('Template not found, using default', { templatePath });
          return this.getDefaultTemplate(templatePath, variables);
        }
        
        const templateContent = fs.readFileSync(fullPath, 'utf8');
        template = Handlebars.compile(templateContent);
        this.templates.set(templatePath, template);
      }
      
      const rendered = template(variables);
      
      logger.debug('Template rendered', {
        templatePath,
        variableKeys: Object.keys(variables)
      });
      
      return rendered;
    } catch (error) {
      logger.error('Error rendering template', { templatePath, error });
      return this.getDefaultTemplate(templatePath, variables);
    }
  }
  
  private getDefaultTemplate(templatePath: string, variables: Record<string, any>): string {
    // Default templates for different types
    if (templatePath.includes('initial_contact')) {
      return `
${variables.contactName} 様

お世話になっております。
ダンドリワークです。

先日はお電話でのご相談ありがとうございました。
${variables.companyName}様のご要望に合わせたご提案をさせていただきたく、
改めてご連絡させていただきました。

ご提案金額: ${variables.dealAmount ? `¥${variables.dealAmount.toLocaleString()}` : '別途お見積り'}

詳細についてご説明させていただければ幸いです。
ご都合の良い日時をお知らせください。

よろしくお願いいたします。

ダンドリワーク営業部
`;
    }
    
    if (templatePath.includes('follow_up_no_answer')) {
      return `
${variables.contactName} 様

お世話になっております。
ダンドリワークです。

先ほどお電話させていただきましたが、ご不在でしたので
メールにてご連絡させていただきます。

${variables.companyName}様へのご提案について、
ぜひお話しさせていただければと思います。

お忙しいところ恐れ入りますが、
ご都合の良い時間帯をお知らせいただけますでしょうか。

よろしくお願いいたします。

ダンドリワーク営業部
`;
    }
    
    if (templatePath.includes('session_draft')) {
      return `
${variables.companyName} 様

お世話になっております。
ダンドリワーク研修事務局です。

【${variables.programName}】
第${variables.sessionNumber}回 ${variables.sessionTitle}

日時: ${variables.sessionDate} ${variables.startTime}〜${variables.endTime}

詳細は追ってご連絡いたします。

よろしくお願いいたします。

ダンドリワーク研修事務局
`;
    }
    
    // Generic fallback
    return JSON.stringify(variables, null, 2);
  }
}

export const templateService = new TemplateService();