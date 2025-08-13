import { logger } from '../../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface ChatworkAdapter {
  postMessage(input: { roomId: string; message: string }): Promise<{ messageId: string }>;
  getOrCreateRoom(roomName: string): Promise<string>;
  addMembersToRoom(roomId: string, memberIds: string[]): Promise<void>;
}

class ChatworkService implements ChatworkAdapter {
  private adapter: ChatworkAdapter;
  
  constructor() {
    const useMock = process.env.USE_MOCK_ADAPTERS === 'true';
    this.adapter = useMock ? new ChatworkMock() : new ChatworkMock(); // TODO: Replace with real adapter
  }
  
  async postMessage(input: { roomId: string; message: string }): Promise<{ messageId: string }> {
    logger.info('Posting Chatwork message', { roomId: input.roomId });
    return this.adapter.postMessage(input);
  }
  
  async getOrCreateRoom(roomName: string): Promise<string> {
    logger.info('Getting or creating Chatwork room', { roomName });
    return this.adapter.getOrCreateRoom(roomName);
  }
  
  async addMembersToRoom(roomId: string, memberIds: string[]): Promise<void> {
    logger.info('Adding members to Chatwork room', { roomId, memberCount: memberIds.length });
    return this.adapter.addMembersToRoom(roomId, memberIds);
  }
}

class ChatworkMock implements ChatworkAdapter {
  private rooms = new Map<string, string>();
  private messages = new Map<string, Array<{ messageId: string; message: string }>>();
  
  async postMessage(input: { roomId: string; message: string }): Promise<{ messageId: string }> {
    const messageId = `msg_${uuidv4()}`;
    
    if (!this.messages.has(input.roomId)) {
      this.messages.set(input.roomId, []);
    }
    
    this.messages.get(input.roomId)!.push({
      messageId,
      message: input.message
    });
    
    logger.info('[MOCK] Chatwork message posted', {
      roomId: input.roomId,
      messageId,
      messageLength: input.message.length
    });
    
    return { messageId };
  }
  
  async getOrCreateRoom(roomName: string): Promise<string> {
    const existingRoom = Array.from(this.rooms.entries())
      .find(([name]) => name === roomName);
    
    if (existingRoom) {
      logger.info('[MOCK] Existing Chatwork room found', { 
        roomName, 
        roomId: existingRoom[1] 
      });
      return existingRoom[1];
    }
    
    const roomId = `room_${uuidv4()}`;
    this.rooms.set(roomName, roomId);
    
    logger.info('[MOCK] New Chatwork room created', { roomName, roomId });
    return roomId;
  }
  
  async addMembersToRoom(roomId: string, memberIds: string[]): Promise<void> {
    logger.info('[MOCK] Members added to Chatwork room', {
      roomId,
      memberIds
    });
  }
}

export const chatworkService = new ChatworkService();