import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminSeedService } from './admin_seed.service';
import { UserRole } from 'src/roles/entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole])],
  providers: [UsersService, AdminSeedService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
