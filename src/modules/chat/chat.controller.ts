import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../authentication/jwt-auth.guard';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * GET /api/v1/chat/token
   * Trả về Centrifugo connection JWT để client kết nối WebSocket
   */
  @ApiOperation({ summary: 'Lấy Centrifugo connection token' })
  @Get('token')
  getCentrifugoToken(@Request() req) {
    const token = this.chatService.generateCentrifugoToken(
      req.user.userId,
      req.user.username,
    );
    return { token };
  }

  /**
   * POST /api/v1/chat/messages
   * Gửi tin nhắn đến một người dùng khác
   */
  @ApiOperation({ summary: 'Gửi tin nhắn' })
  @Post('messages')
  sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    return this.chatService.sendMessage(req.user.userId, dto);
  }

  /**
   * GET /api/v1/chat/messages/:receiverId
   * Lấy lịch sử tin nhắn với người dùng
   */
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn với một người dùng' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('messages/:receiverId')
  getHistory(
    @Param('receiverId') receiverId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 30,
    @Request() req,
  ) {
    return this.chatService.getHistory(req.user.userId, receiverId, +page, +limit);
  }

  /**
   * GET /api/v1/chat/conversations
   * Danh sách các cuộc hội thoại của user hiện tại
   */
  @ApiOperation({ summary: 'Danh sách cuộc hội thoại' })
  @Get('conversations')
  getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.userId);
  }

  /**
   * GET /api/v1/chat/conversations/:targetUserId
   * Lấy metadata của hội thoại 1-1 với người dùng cụ thể
   */
  @ApiOperation({ summary: 'Lấy metadata hội thoại 1-1' })
  @Get('conversations/:targetUserId')
  getConversationMetadata(
    @Param('targetUserId') targetUserId: string,
    @Request() req,
  ) {
    return this.chatService.getConversationMetadata(req.user.userId, targetUserId);
  }
}
