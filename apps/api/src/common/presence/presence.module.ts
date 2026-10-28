import { Module, Global } from '@nestjs/common';
import { PresenceService } from './presence.service.js';
import { RedisModule } from '../../redis/redis.module.js';

@Global()
@Module({
  imports: [RedisModule],
  providers: [PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
