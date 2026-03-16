import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRole } from 'src/modules/roles/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // verify username already exists
    const existingUser = await this.usersRepository.findOne({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    // verify email already exists
    const existingEmail = await this.usersRepository.findOne({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      username: dto.username,
      password_hash,
      roleId: dto.roleId,
    });

    const savedUser = await this.usersRepository.save(user);

    return this.getUserWithRelations(savedUser.id);
  }

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    sortBy = 'user.created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy(sortBy, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.username ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    Object.assign(user, dto);
    const savedUser = await this.usersRepository.save(user);

    return this.getUserWithRelations(savedUser.id);
  }

  // delete by id
  async delete(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    user.password_hash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  async findByUsername(username: string) {
    const user = await this.usersRepository.findOne({
      where: { username },
    });

    if (!user)
      throw new NotFoundException(`User with username ${username} not found`);

    const [role] = await Promise.all([
      user.roleId
        ? this.userRoleRepository.findOne({
            where: { id: user.roleId },
          })
        : null,
    ]);

    return {
      ...user,
      role,
    };
  }

  async findById(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    const [role] = await Promise.all([
      user.roleId
        ? this.userRoleRepository.findOne({
            where: { id: user.roleId },
          })
        : null,
    ]);

    const { password_hash, ...result } = user;
    return {
      ...result,
      role,
    };
  }

  private async getUserWithRelations(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
