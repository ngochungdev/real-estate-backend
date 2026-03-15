import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async onModuleInit() {
    const defaultRoles = ['system admin', 'admin', 'normal'];

    for (const roleName of defaultRoles) {
      const exists = await this.userRoleRepository.findOne({
        where: { name: roleName },
      });
      if (!exists) {
        await this.userRoleRepository.save(
          this.userRoleRepository.create({ name: roleName }),
        );
        console.log(`Role '${roleName}' created`);
      }
    }
  }

  findAll(): Promise<UserRole[]> {
    return this.userRoleRepository.find();
  }

  create(name: string): Promise<UserRole> {
    const user = this.userRoleRepository.create({ name });
    return this.userRoleRepository.save(user);
  }
}
