import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { Message } from './entities/message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { CentrifugoService } from './centrifugo.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    JwtModule.register({}), // secret overridden per-call in ChatService.generateCentrifugoToken
    ConfigModule,
    UsersModule,
  ],
  providers: [ChatService, CentrifugoService],
  controllers: [ChatController],
})
export class ChatModule {}
