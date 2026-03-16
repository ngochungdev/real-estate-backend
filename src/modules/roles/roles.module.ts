import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRole } from './entities/role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserRole])],
  providers: [RolesService],
  controllers: [RolesController],
})
export class RolesModule {}
