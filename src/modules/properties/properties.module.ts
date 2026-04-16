import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { Property } from './entities/property.entity';
import { PropertyLike } from './entities/property-like.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Property, PropertyLike]), ChatModule, NotificationsModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}