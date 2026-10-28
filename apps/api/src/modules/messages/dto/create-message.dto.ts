import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ example: 'Hello, World!' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ enum: MessageType, default: 'TEXT' })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}
