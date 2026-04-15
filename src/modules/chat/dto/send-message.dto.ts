import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'User ID of the receiver', example: 'uuid-receiver-1234' })
  @IsString()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: 'Message content', example: 'Xin chào, tôi muốn hỏi về bất động sản này' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
