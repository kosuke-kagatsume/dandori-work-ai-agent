import { Event, TrainingProgram, Session, EmailDraft } from '../domain/models.js';
import { logger } from '../lib/logger.js';
import { emailService } from '../services/adapters/email.js';
import { calendarService } from '../services/adapters/calendar.js';
import { chatworkService } from '../services/adapters/chatwork.js';
import { templateService } from '../services/templating/render.js';
import { schedulerService } from '../services/scheduler/scheduler.js';
import { getConfig } from '../config/loadConfig.js';

class TrainingFlow {
  async process(event: Event): Promise<void> {
    logger.info('Processing training event', { eventType: event.type });
    
    switch (event.type) {
      case 'Training.ContractSigned':
        await this.handleContractSigned(event.payload);
        break;
      
      case 'Training.SessionScheduled':
        await this.handleSessionScheduled(event.payload);
        break;
      
      case 'Training.Tminus3':
        await this.handleTminus3(event.payload);
        break;
      
      case 'Training.Tminus1':
        await this.handleTminus1(event.payload);
        break;
      
      case 'Training.SessionCompleted':
        await this.handleSessionCompleted(event.payload);
        break;
      
      default:
        logger.warn('Unknown training event type', { eventType: event.type });
    }
  }
  
  private async handleContractSigned(payload: any): Promise<void> {
    logger.info('Handling training contract signed', { programId: payload.programId });
    
    const program: TrainingProgram = payload.program;
    const config = getConfig();
    
    const sessions = await this.generateSessions(program);
    
    for (const session of sessions) {
      const emailBody = await templateService.render('email/session_draft.mj.txt', {
        companyName: program.companyName,
        programName: program.programName,
        sessionNumber: session.sessionNumber,
        sessionTitle: session.title,
        sessionDate: session.date,
        startTime: session.startTime,
        endTime: session.endTime
      });
      
      const draft: EmailDraft = {
        to: program.participants.map(p => p.email),
        bcc: [config.training.defaultBcc],
        subject: `【ダンドリワーク研修】${program.companyName}様 - 第${session.sessionNumber}回 ${session.title}`,
        body: emailBody
      };
      
      await emailService.draft(draft);
      
      const calendarEvent = {
        title: `【DW研修】${program.companyName} - 第${session.sessionNumber}回`,
        description: emailBody,
        startTime: new Date(`${session.date}T${session.startTime}`),
        endTime: new Date(`${session.date}T${session.endTime}`),
        attendees: program.participants.map(p => p.email),
        location: session.location,
        meetingUrl: session.meetingUrl
      };
      
      await calendarService.createEvent(calendarEvent);
    }
    
    const chatworkMessage = await templateService.render('chatwork/program_start.md', {
      companyName: program.companyName,
      programName: program.programName,
      sessionCount: sessions.length,
      startDate: program.startDate,
      endDate: program.endDate
    });
    
    await chatworkService.postMessage({
      roomId: await this.getOrCreateChatworkRoom(program),
      message: chatworkMessage
    });
    
    logger.info('Training program initialized', { 
      programId: payload.programId,
      sessionsCreated: sessions.length
    });
  }
  
  private async handleTminus3(payload: any): Promise<void> {
    logger.info('Handling T-3 reminder', { sessionId: payload.sessionId });
    
    const session: Session = payload.session;
    const program: TrainingProgram = payload.program;
    const config = getConfig();
    
    const emailBody = await templateService.render('email/reminder_t3.mj.txt', {
      companyName: program.companyName,
      sessionNumber: session.sessionNumber,
      sessionTitle: session.title,
      sessionDate: session.date,
      startTime: session.startTime,
      meetingUrl: session.meetingUrl
    });
    
    const draft: EmailDraft = {
      to: program.participants.map(p => p.email),
      bcc: [config.training.defaultBcc],
      subject: `【リマインダー】${program.companyName}様 - 研修3日前のご案内`,
      body: emailBody
    };
    
    await emailService.draft(draft);
    
    const chatworkMessage = await templateService.render('chatwork/reminder_t3.md', {
      sessionNumber: session.sessionNumber,
      sessionTitle: session.title,
      sessionDate: session.date,
      startTime: session.startTime
    });
    
    await chatworkService.postMessage({
      roomId: await this.getOrCreateChatworkRoom(program),
      message: chatworkMessage
    });
    
    logger.info('T-3 reminder sent', { sessionId: payload.sessionId });
  }
  
  private async handleTminus1(payload: any): Promise<void> {
    logger.info('Handling T-1 reminder', { sessionId: payload.sessionId });
    
    const session: Session = payload.session;
    const program: TrainingProgram = payload.program;
    const config = getConfig();
    
    const emailBody = await templateService.render('email/reminder_t1.mj.txt', {
      companyName: program.companyName,
      sessionNumber: session.sessionNumber,
      sessionTitle: session.title,
      sessionDate: session.date,
      startTime: session.startTime,
      meetingUrl: session.meetingUrl,
      materials: session.materials
    });
    
    const draft: EmailDraft = {
      to: program.participants.map(p => p.email),
      bcc: [config.training.defaultBcc],
      subject: `【明日開催】${program.companyName}様 - 研修前日のご案内`,
      body: emailBody
    };
    
    await emailService.draft(draft);
    
    const chatworkMessage = await templateService.render('chatwork/reminder_t1.md', {
      sessionNumber: session.sessionNumber,
      sessionTitle: session.title,
      startTime: session.startTime,
      meetingUrl: session.meetingUrl
    });
    
    await chatworkService.postMessage({
      roomId: await this.getOrCreateChatworkRoom(program),
      message: chatworkMessage
    });
    
    logger.info('T-1 reminder sent', { sessionId: payload.sessionId });
  }
  
  private async handleSessionScheduled(payload: any): Promise<void> {
    logger.info('Handling session scheduled', { sessionId: payload.sessionId });
  }
  
  private async handleSessionCompleted(payload: any): Promise<void> {
    logger.info('Handling session completed', { sessionId: payload.sessionId });
    
    const session: Session = payload.session;
    const program: TrainingProgram = payload.program;
    
    const chatworkMessage = await templateService.render('chatwork/session_completed.md', {
      sessionNumber: session.sessionNumber,
      sessionTitle: session.title,
      recordingUrl: session.recordingUrl
    });
    
    await chatworkService.postMessage({
      roomId: await this.getOrCreateChatworkRoom(program),
      message: chatworkMessage
    });
  }
  
  private async generateSessions(program: TrainingProgram): Promise<Session[]> {
    const sessions: Session[] = [];
    const startDate = new Date(program.startDate);
    
    for (let i = 0; i < program.sessionCount; i++) {
      const sessionDate = new Date(startDate);
      sessionDate.setDate(startDate.getDate() + (i * 7));
      
      sessions.push({
        id: `${program.id}_session_${i + 1}`,
        programId: program.id,
        sessionNumber: i + 1,
        title: `第${i + 1}回 研修セッション`,
        date: sessionDate,
        startTime: '10:00',
        endTime: '17:00',
        meetingUrl: `https://meet.dandori-work.com/${program.id}/${i + 1}`
      });
    }
    
    return sessions;
  }
  
  private async getOrCreateChatworkRoom(program: TrainingProgram): Promise<string> {
    const roomName = `【DW研修】${program.companyName}_${program.programName}`;
    return await chatworkService.getOrCreateRoom(roomName);
  }
}

export const trainingFlow = new TrainingFlow();