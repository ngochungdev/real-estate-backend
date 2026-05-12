import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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

  async forgotPassword(username: string) {
    let resetToken: string | null = null;
    try {
      const user = await this.usersService.findByUsername(username);
      // Generate token
      resetToken = crypto.randomBytes(32).toString('hex');
      
      // Store in Redis (15 mins = 900 seconds)
      await this.redisService.set(`password_reset:${resetToken}`, user.id, 900);
      
      // Log for development
      console.log(`\n\n=== PASSWORD RESET TOKEN FOR ${username} ===`);
      console.log(resetToken);
      console.log(`===========================================\n\n`);
      
    } catch (e) {
      // If user not found, we silently "succeed" to prevent username enumeration
    }
    
    return { 
      message: 'If the username exists, a reset instruction has been processed.',
      // TODO: Remove this token from response before going to production
      token: resetToken 
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const userId = await this.redisService.get(`password_reset:${token}`);
    
    if (!userId) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
    
    // Invalidate the token
    await this.redisService.del(`password_reset:${token}`);
    
    return { message: 'Password has been successfully reset' };
  }
}
