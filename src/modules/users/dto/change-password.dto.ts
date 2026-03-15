import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'old Password',
    description: 'Current user password',
  })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'new Password', description: 'New user password' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
