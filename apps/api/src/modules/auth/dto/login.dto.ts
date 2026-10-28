import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'demo1@convoflow.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Demo@12345' })
  @IsString()
  password: string;
}
