import { Conversation, Message, Employee } from '../../src/lib/models';
import { pick, pickMultiple, randomBoolean, randomInt, randomDateInRange } from '../utils/random';
import { faker } from '@faker-js/faker';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
  stores?: any[];
  storeDepartments?: any[];
  employees?: any[];
  shiftDefinitions?: any[];
  schedules?: any[];
}

export async function seedChat(data: SeedData): Promise<SeedData> {
  console.log('💬 Step 11: Creating Chat Conversations and Messages...');
  
  const employees = data.employees || [];
  
  const now = new Date();
  const yearStart = new Date(2024, 0, 1);
  
  let conversationCount = 0;
  let messageCount = 0;
  
  // Create direct conversations (1-on-1)
  for (let i = 0; i < 30; i++) {
    const participants = pickMultiple(employees, 2);
    if (participants.length < 2) continue;
    
    const conversation = await Conversation.create({
      participants: participants.map((e: any) => e._id),
      type: 'direct',
      lastMessage: undefined,
      admins: [],
      mutedBy: [],
      deletedBy: []
    });
    
    conversationCount++;
    
    // Create messages in this conversation
    const messageCountInConv = randomInt(5, 20);
    let lastMessage: any = null;
    
    for (let j = 0; j < messageCountInConv; j++) {
      const sender = pick(participants);
      const content = faker.lorem.sentence();
      const createdAt = randomDateInRange(yearStart, now);
      
      const message = await Message.create({
        conversationId: conversation._id,
        sender: sender._id,
        content,
        attachments: randomBoolean(0.1) ? [{
          url: '/uploads/image.jpg',
          type: 'image',
          name: 'image.jpg'
        }] : undefined,
        readBy: randomBoolean(0.7) && participants.filter((p: any) => p._id.toString() !== sender._id.toString()).length > 0
          ? [pick(participants.filter((p: any) => p._id.toString() !== sender._id.toString()))._id]
          : [],
        reactions: randomBoolean(0.2) && participants.filter((p: any) => p._id.toString() !== sender._id.toString()).length > 0
          ? [{
              user: pick(participants.filter((p: any) => p._id.toString() !== sender._id.toString()))._id,
              emoji: pick(['👍', '❤️', '😊', '👏'])
            }]
          : undefined,
        isDeleted: false,
        deletedFor: [],
        parentMessageId: randomBoolean(0.1) && lastMessage ? lastMessage._id : undefined
      });
      
      lastMessage = {
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt
      };
      
      messageCount++;
    }
    
    // Update conversation with last message
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage
    });
  }
  
  // Create group conversations
  for (let i = 0; i < 10; i++) {
    const participants = pickMultiple(employees, randomInt(3, 8));
    if (participants.length < 3) continue;
    
    const conversation = await Conversation.create({
      participants: participants.map((e: any) => e._id),
      type: 'group',
      name: faker.company.name() + ' Team',
      lastMessage: undefined,
      admins: [participants[0]._id], // First participant is admin
      mutedBy: [],
      deletedBy: []
    });
    
    conversationCount++;
    
    // Create messages in this group
    const messageCountInConv = randomInt(10, 30);
    let lastMessage: any = null;
    
    for (let j = 0; j < messageCountInConv; j++) {
      const sender = pick(participants);
      const content = faker.lorem.sentence();
      const createdAt = randomDateInRange(yearStart, now);
      
      const message = await Message.create({
        conversationId: conversation._id,
        sender: sender._id,
        content,
        attachments: randomBoolean(0.1) ? [{
          url: '/uploads/file.pdf',
          type: 'file',
          name: 'document.pdf'
        }] : undefined,
        readBy: pickMultiple(
          participants.filter((p: any) => p._id.toString() !== sender._id.toString()),
          randomInt(1, Math.min(3, participants.length - 1))
        ).map((p: any) => p._id),
        reactions: randomBoolean(0.3) && participants.filter((p: any) => p._id.toString() !== sender._id.toString()).length > 0
          ? pickMultiple(
              participants.filter((p: any) => p._id.toString() !== sender._id.toString()),
              randomInt(1, Math.min(3, participants.length - 1))
            ).map((p: any) => ({
              user: p._id,
              emoji: pick(['👍', '❤️', '😊', '👏', '🎉'])
            }))
          : undefined,
        isDeleted: false,
        deletedFor: [],
        parentMessageId: randomBoolean(0.1) && lastMessage ? lastMessage._id : undefined
      });
      
      lastMessage = {
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt
      };
      
      messageCount++;
    }
    
    // Update conversation with last message
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage
    });
  }
  
  console.log(`✅ Created ${conversationCount} conversations`);
  console.log(`✅ Created ${messageCount} messages`);
  
  return data;
}

