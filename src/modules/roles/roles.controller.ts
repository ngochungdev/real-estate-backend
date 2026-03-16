import { Controller, Get, Post, Body } from '@nestjs/common';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UserRole } from './entities/role.entity';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll(): Promise<UserRole[]> {
    return this.rolesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateRoleDto): Promise<UserRole> {
    return this.rolesService.create(dto.name);
  }
}
