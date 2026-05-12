import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { RolesModule } from './modules/roles/roles.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ChatModule } from './modules/chat/chat.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/static',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl:
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : process.env.DB_SSL === 'false'
            ? false
            : process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
      autoLoadEntities: true,
      synchronize: false, // dev only
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
      migrationsRun: true,
    }),
    AuthenticationModule,
    UsersModule,
    RolesModule,
    PropertiesModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
