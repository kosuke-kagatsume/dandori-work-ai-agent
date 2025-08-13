export interface Event {
  id: string;
  type: EventType;
  payload: any;
  timestamp?: string;
  source?: string;
}

export type EventType = 
  | 'Sales.InitialCallLogged'
  | 'Sales.NoAnswer'
  | 'Sales.QuoteReady'
  | 'Sales.ContractSent'
  | 'Sales.ContractSigned'
  | 'Training.ContractSigned'
  | 'Training.SessionScheduled'
  | 'Training.Tminus3'
  | 'Training.Tminus1'
  | 'Training.SessionCompleted';

export interface Deal {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  amount: number;
  stage: string;
  territory?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingProgram {
  id: string;
  companyName: string;
  programName: string;
  startDate: Date;
  endDate: Date;
  sessionCount: number;
  participants: Participant[];
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed';
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  role?: string;
  attendanceRecord?: AttendanceRecord[];
}

export interface AttendanceRecord {
  sessionNumber: number;
  attended: boolean;
  date: Date;
}

export interface Session {
  id: string;
  programId: string;
  sessionNumber: number;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  location?: string;
  meetingUrl?: string;
  materials?: string[];
  recordingUrl?: string;
}

export interface EmailDraft {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  attachments?: Attachment[];
  scheduledAt?: Date;
}

export interface Attachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface QuietHours {
  channel: 'email' | 'sms' | 'chatwork';
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface Territory {
  code: string;
  name: string;
  assignedTo: string;
  prefectures?: string[];
}