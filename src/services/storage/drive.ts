import { logger } from '../../lib/logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageFile {
  filename: string;
  content: Buffer;
  contentType: string;
  folder?: string;
}

class StorageService {
  private baseDir: string;
  
  constructor() {
    this.baseDir = path.join(process.cwd(), 'storage');
    this.ensureBaseDir();
  }
  
  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  
  async upload(file: StorageFile): Promise<string> {
    try {
      const folder = file.folder || 'default';
      const folderPath = path.join(this.baseDir, folder);
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      
      const fileId = uuidv4();
      const filePath = path.join(folderPath, `${fileId}_${file.filename}`);
      
      fs.writeFileSync(filePath, file.content);
      
      const fileUrl = `file://${filePath}`;
      
      logger.info('File uploaded', {
        filename: file.filename,
        folder,
        fileUrl,
        size: file.content.length
      });
      
      return fileUrl;
    } catch (error) {
      logger.error('Error uploading file', { 
        filename: file.filename,
        error 
      });
      throw error;
    }
  }
  
  async download(fileUrl: string): Promise<Buffer> {
    try {
      if (fileUrl.startsWith('file://')) {
        const filePath = fileUrl.replace('file://', '');
        const content = fs.readFileSync(filePath);
        
        logger.info('File downloaded', {
          fileUrl,
          size: content.length
        });
        
        return content;
      }
      
      throw new Error('Unsupported file URL protocol');
    } catch (error) {
      logger.error('Error downloading file', { fileUrl, error });
      throw error;
    }
  }
  
  async delete(fileUrl: string): Promise<void> {
    try {
      if (fileUrl.startsWith('file://')) {
        const filePath = fileUrl.replace('file://', '');
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info('File deleted', { fileUrl });
        }
      }
    } catch (error) {
      logger.error('Error deleting file', { fileUrl, error });
      throw error;
    }
  }
  
  async list(folder?: string): Promise<string[]> {
    try {
      const folderPath = folder 
        ? path.join(this.baseDir, folder)
        : this.baseDir;
      
      if (!fs.existsSync(folderPath)) {
        return [];
      }
      
      const files = fs.readdirSync(folderPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => `file://${path.join(folderPath, dirent.name)}`);
      
      logger.info('Files listed', {
        folder,
        count: files.length
      });
      
      return files;
    } catch (error) {
      logger.error('Error listing files', { folder, error });
      return [];
    }
  }
  
  generateFilename(template: string, variables: Record<string, any>): string {
    let filename = template;
    
    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      if (key === 'companyName') {
        filename = filename.replace('{companyName}', value as string);
      }
      if (key === 'YYYYMMDD') {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        filename = filename.replace('{YYYYMMDD}', dateStr);
      }
    }
    
    return filename;
  }
}

export const storageService = new StorageService();