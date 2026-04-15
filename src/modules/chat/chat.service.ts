import { Injectable, NotFoundException } from '@nestjs/common';
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

  /** Tạo conversationId nhất quán từ 2 userId (thứ tự sắp xếp để luôn ra cùng 1 kết quả) */
  getConversationId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `chat:${sorted[0]}-${sorted[1]}`;
  }

  /** Tạo Centrifugo connection JWT cho client */
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

  /** Gửi tin nhắn: lưu DB + publish qua Centrifugo */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    const sender = await this.usersService.findById(senderId);
    if (!sender) throw new NotFoundException('Người dùng không tồn tại');

    const conversationId = this.getConversationId(senderId, dto.receiverId);

    const message = this.messageRepo.create({
      conversationId,
      senderId,
      senderName: sender.name,
      content: dto.content,
    });

    const saved = await this.messageRepo.save(message);

    // Publish realtime — không block nếu Centrifugo lỗi
    await this.centrifugoService.publish(conversationId, {
      id: saved.id,
      senderId: saved.senderId,
      senderName: saved.senderName,
      content: saved.content,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  /** Lấy lịch sử tin nhắn giữa 2 người dùng (có phân trang) */
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
    });

    return {
      data: data.reverse(), // trả về theo thứ tự tăng dần
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Danh sách conversations gần đây (lấy tin nhắn cuối mỗi conversation) */
  async getConversations(userId: string) {
    /*
     * Lấy các conversationId có chứa userId, sau đó lấy tin nhắn mới nhất của mỗi conversation.
     * Dùng raw query để hiệu quả hơn.
     */
    const rows = await this.messageRepo.query(
      `SELECT DISTINCT ON ("conversationId") 
        id, "senderId", "senderName", content, "createdAt", "conversationId"
       FROM messages 
       WHERE "conversationId" LIKE $1 
       ORDER BY "conversationId", "createdAt" DESC`,
      [`%${userId}%`],
    );

    return rows;
  }

  /** Lấy metadata của hội thoại 1-1 (dùng khi bắt đầu chat mới) */
  async getConversationMetadata(userId: string, targetUserId: string) {
    const targetUser = await this.usersService.findById(targetUserId);
    if (!targetUser) throw new NotFoundException('Người nhận không tồn tại');

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
}
