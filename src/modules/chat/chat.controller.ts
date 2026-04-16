import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
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
   * Returns Centrifugo connection JWT for client WebSocket connection
   */
  @ApiOperation({ summary: 'Get Centrifugo connection token' })
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
   * Send a message to another user
   */
  @ApiOperation({ summary: 'Send message' })
  @Post('messages')
  sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    return this.chatService.sendMessage(req.user.userId, dto);
  }

  /**
   * GET /api/v1/chat/messages/:receiverId
   * Get message history with a user
   */
  @ApiOperation({ summary: 'Get message history with a user' })
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
   * List of conversations for the current user
   */
  @ApiOperation({ summary: 'List of conversations' })
  @Get('conversations')
  getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.userId);
  }

  /**
   * GET /api/v1/chat/conversations/:targetUserId
   * Get metadata for a 1-1 conversation with a specific user
   */
  @ApiOperation({ summary: 'Get 1-1 conversation metadata' })
  @Get('conversations/:targetUserId')
  getConversationMetadata(
    @Param('targetUserId') targetUserId: string,
    @Request() req,
  ) {
    return this.chatService.getConversationMetadata(req.user.userId, targetUserId);
  }

  /**
   * DELETE /api/v1/chat/messages/:id
   * Delete a specific message
   */
  @ApiOperation({ summary: 'Delete message' })
  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @Request() req) {
    return this.chatService.deleteMessage(req.user.userId, id);
  }

  /**
   * DELETE /api/v1/chat/conversations/:conversationId
   * Delete entire conversation
   */
  @ApiOperation({ summary: 'Delete conversation' })
  @Delete('conversations/:conversationId')
  deleteConversation(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    return this.chatService.deleteConversation(req.user.userId, conversationId);
  }

  /**
   * PATCH /api/v1/chat/messages/:id
   * Edit a message
   */
  @ApiOperation({ summary: 'Edit message' })
  @Patch('messages/:id')
  editMessage(
    @Param('id') id: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    return this.chatService.editMessage(req.user.userId, id, content);
  }
}
