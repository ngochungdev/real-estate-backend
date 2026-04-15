import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth } from '@nestjs/swagger';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticationService } from './authentication.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RedisService } from '../redis/redis.service';

@Controller('api/v1/auth')
export class AuthenticationController {
  constructor(
    private config: ConfigService,
    private readonly authenticationService: AuthenticationService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private redisService: RedisService,
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authenticationService.login(dto.username, dto.password);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const newUser = await this.usersService.registerUser({
      name: dto.name,
      email: dto.email,
      username: dto.username,
      password: dto.password,
    });
    
    // Automatically login after successful registration
    return this.authenticationService.login(dto.username, dto.password);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    // Check blacklist
    const isBlacklisted = await this.redisService.get(`bl:${refreshToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException();

      // Verify the refresh token matches the stored one

      // Issue new access token
      const newAccessToken = this.jwtService.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.roleId,
        },
        { secret: this.config.get<string>('JWT_SECRET'), expiresIn: '1h' },
      );

      return { accessToken: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    const refreshToken = req.body.refreshToken;
    return this.authenticationService.logout(accessToken, refreshToken);
  }
}
