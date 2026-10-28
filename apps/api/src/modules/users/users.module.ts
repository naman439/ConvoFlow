import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { PresenceService } from '../../common/presence/presence.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PresenceService],
  exports: [UsersService, PresenceService],
})
export class UsersModule {}
