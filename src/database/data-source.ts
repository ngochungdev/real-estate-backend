import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Message } from '../modules/chat/entities/message.entity';
import { UserRole } from '../modules/roles/entities/role.entity';
import { PropertyLike } from '../modules/properties/entities/property-like.entity';
import { Property } from '../modules/properties/entities/property.entity';
import { User } from '../modules/users/entities/user.entity';
import { NotificationRead } from '../modules/notifications/entities/notification-read.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
  entities: [
    Message,
    UserRole,
    PropertyLike,
    Property,
    User,
    NotificationRead,
    Notification,
  ],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});
