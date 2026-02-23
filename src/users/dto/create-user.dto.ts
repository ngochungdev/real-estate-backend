import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsUUID } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User full name' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'johndoe@gmail.com', description: 'User email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123', description: 'User password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
