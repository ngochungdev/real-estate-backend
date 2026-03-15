import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './entities/user.entity';
import { UserRole } from 'src/roles/entities/role.entity';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async onModuleInit() {
    await this.seedSystemAdmin();
  }

  private async seedSystemAdmin() {
    let systemRole = await this.userRoleRepository.findOne({
      where: { name: 'system admin' },
    });

    if (!systemRole) {
      systemRole = await this.userRoleRepository.save(
        this.userRoleRepository.create({ name: 'system admin' }),
      );
    }

    const adminExists = await this.usersRepository.findOne({
      where: { roleId: systemRole.id, username: 'sysadmin' },
    });

    this.logger.log(
      'Seeding System Admin user..., adminExists: ' + adminExists,
    );

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const systemAdmin = this.usersRepository.create({
        username: 'sysadmin',
        password_hash: hashedPassword,
        roleId: systemRole.id,
        name: 'System Admin',
        email: 'sysadmin@admin.com',
      });

      await this.usersRepository.save(systemAdmin);
      this.logger.log('System Admin user created');
    } else {
      this.logger.log('System Admin already exists');
    }
  }
}
