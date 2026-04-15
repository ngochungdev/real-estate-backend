import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'johndoe@gmail.com',
    description: 'User email address',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'Password123', description: 'User password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
