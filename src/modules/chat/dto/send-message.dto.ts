import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'User ID of the receiver', example: 'uuid-receiver-1234' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: 'Message content', example: 'Hello, I want to ask about this property' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
