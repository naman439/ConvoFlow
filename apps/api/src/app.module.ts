import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { PresenceModule } from './common/presence/presence.module.js';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module.js';
import { KafkaModule } from './kafka/kafka.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { SocketsModule } from './sockets/sockets.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      envFilePath: ['.env', 'apps/api/.env'],
    }),

    PrismaModule,
    RedisModule,
    PresenceModule,
    RabbitMQModule,
    KafkaModule,

    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    SocketsModule,
    HealthModule,
  ],
})
export class AppModule {}
