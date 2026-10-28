import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDirectConversationDto {
  @ApiProperty({ description: 'ID of the user to start a conversation with' })
  @IsString()
  targetUserId: string;
}
