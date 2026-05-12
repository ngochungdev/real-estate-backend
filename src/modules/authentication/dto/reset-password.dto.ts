import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewSecretPassword123!' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
