import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, MinLength } from 'class-validator';

export class CreateGroupConversationDto {
  @ApiProperty({ example: 'Engineering Team' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'Array of user IDs to add to the group' })
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];

  @ApiPropertyOptional({ example: 'Group for engineering discussions' })
  @IsOptional()
  @IsString()
  description?: string;
}
