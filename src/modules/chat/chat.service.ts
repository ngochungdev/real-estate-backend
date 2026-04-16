import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Message } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { CentrifugoService } from './centrifugo.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private centrifugoService: CentrifugoService,
    private jwtService: JwtService,
    private config: ConfigService,
    private usersService: UsersService,
  ) {}

  /** Generate a consistent conversationId from 2 userIds (sorted order to always yield the same result) */
  getConversationId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `chat:${sorted[0]}-${sorted[1]}`;
  }

  /** Generate Centrifugo connection JWT for client */
  generateCentrifugoToken(userId: string, userName: string): string {
    const secret = this.config.get<string>('CENTRIFUGO_TOKEN_SECRET');
    return this.jwtService.sign(
      {
        sub: userId,
        info: { name: userName },
      },
      {
        secret,
        expiresIn: '1h',
        algorithm: 'HS256',
      },
    );
  }

  /** Send a message: save to DB + publish via Centrifugo */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    const sender = await this.usersService.findById(senderId);
    if (!sender) throw new NotFoundException('User not found');

    const conversationId = this.getConversationId(senderId, dto.receiverId);

    const message = this.messageRepo.create({
      conversationId,
      senderId,
      senderName: sender.name,
      content: dto.content,
    });

    const saved = await this.messageRepo.save(message);

    // Publish realtime — do not block if Centrifugo fails
    await this.centrifugoService.publish(conversationId, {
      id: saved.id,
      senderId: saved.senderId,
      senderName: saved.senderName,
      content: saved.content,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  /** Get message history between 2 users (with pagination) */
  async getHistory(
    userId: string,
    receiverId: string,
    page = 1,
    limit = 30,
  ) {
    const conversationId = this.getConversationId(userId, receiverId);

    const [data, total] = await this.messageRepo.findAndCount({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: true,
    });

    const mappedData = data.reverse().map(msg => {
      // Cast to `any` internally or add directly to the returned object
      return {
        ...msg,
        isDeleted: !!msg.deletedAt,
        isEdited: msg.updatedAt && msg.createdAt && msg.updatedAt.getTime() > msg.createdAt.getTime(),
      };
    });

    return {
      data: mappedData, // return in ascending order with status flags
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** List of recent conversations (getting the last message of each) */
  async getConversations(userId: string) {
    /*
     * Get conversationIds containing the userId, then get the newest message for each conversation.
     * Use raw query for better performance.
     */
    const rows = await this.messageRepo.query(
      `SELECT DISTINCT ON ("conversationId") 
        id, "senderId", "senderName", content, "createdAt", "conversationId"
       FROM messages 
       WHERE "conversationId" LIKE $1 
         AND "deletedAt" IS NULL
       ORDER BY "conversationId", "createdAt" DESC`,
      [`%${userId}%`],
    );

    return rows;
  }

  /** Get metadata for a 1-1 conversation (used when starting a new chat) */
  async getConversationMetadata(userId: string, targetUserId: string) {
    const targetUser = await this.usersService.findById(targetUserId);
    if (!targetUser) throw new NotFoundException('Receiver not found');

    const conversationId = this.getConversationId(userId, targetUserId);

    return {
      conversationId,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
      },
    };
  }

  /** Delete a specific message */
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');

    // Only the sender has permission to delete (or could be extended for the receiver)
    if (message.senderId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this message');
    }

    await this.messageRepo.softDelete(messageId);

    // Publish delete event to update frontend UI
    await this.centrifugoService.publish(message.conversationId, {
      type: 'message_deleted',
      messageId: messageId,
    });

    return { success: true };
  }

  /** Delete entire conversation */
  async deleteConversation(userId: string, conversationId: string) {
    // Check if user belongs to this conversation (conversationId: chat:user1-user2)
    if (!conversationId.includes(userId)) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    await this.messageRepo.softDelete({ conversationId });

    // Can publish an event to notify the other party that the conversation was deleted (if needed)
    await this.centrifugoService.publish(conversationId, {
      type: 'conversation_deleted',
      conversationId: conversationId,
    });

    return { success: true };
  }

  /** Edit a message */
  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) throw new NotFoundException('Message not found');

    if (message.senderId !== userId) {
      throw new ForbiddenException('You do not have permission to edit this message');
    }

    message.content = content;
    const saved = await this.messageRepo.save(message);

    // Publish event update
    await this.centrifugoService.publish(message.conversationId, {
      type: 'message_edited',
      messageId: saved.id,
      content: saved.content,
      updatedAt: saved.updatedAt,
    });

    return saved;
  }
}
