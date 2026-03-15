import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthenticationService {
  constructor(
    private config: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(pass, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    const payload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
    };

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.config.get<string>('JWT_REFRESH_SECRET') || 'JWT_REFRESH_SECRET',
      expiresIn: '7d',
    });

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user,
    };
  }

  async logout(accessToken: string, refreshToken: string) {
    try {
      const accessDecoded = this.jwtService.decode(accessToken) as any;
      const refreshDecoded = this.jwtService.decode(refreshToken) as any;

      const accessExp = accessDecoded?.exp
        ? accessDecoded.exp - Math.floor(Date.now() / 1000)
        : 0;
      const refreshExp = refreshDecoded?.exp
        ? refreshDecoded.exp - Math.floor(Date.now() / 1000)
        : 0;

      if (accessExp > 0) {
        await this.redisService.set(`bl:${accessToken}`, '1', accessExp);
      }
      if (refreshExp > 0) {
        await this.redisService.set(`bl:${refreshToken}`, '1', refreshExp);
      }

      return { message: 'Logged out successfully' };
    } catch (err) {
      throw new UnauthorizedException('Invalid tokens');
    }
  }
}
