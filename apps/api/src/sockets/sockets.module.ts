import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway.js';
import { MessagesModule } from '../modules/messages/messages.module.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
    MessagesModule,
  ],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class SocketsModule {}
