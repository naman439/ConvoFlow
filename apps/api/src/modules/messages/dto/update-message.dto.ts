import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateMessageDto {
  @ApiProperty({ example: 'Updated message content' })
  @IsString()
  @MinLength(1)
  content: string;
}
