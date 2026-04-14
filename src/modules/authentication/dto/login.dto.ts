import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'sysadmin', description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'admin123', description: 'User password' })
  @IsString()
  password: string;
}
